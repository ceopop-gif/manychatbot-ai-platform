import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { getRequestExecutionContext } from "vinext/shims/request-context";
import { getDb } from "@/db";
import {
  adminDocuments,
  adminProfiles,
  adminSkills,
  aiProviders,
  channelAccounts,
  chatbots,
  conversations,
  messages,
} from "@/db/schema";
import { buildSkillInstruction, generateAiReply, routeToAdmin, type ChatTurn, type RoutingCandidate } from "@/lib/ai-runtime";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { decryptSecret } from "@/lib/secret-vault";
import { compileSkillMarkdown } from "@/lib/skill-markdown";

type LineEvent = {
  type?: string;
  mode?: string;
  timestamp?: number;
  webhookEventId?: string;
  replyToken?: string;
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string };
  message?: { id?: string; type?: string; text?: string };
};

type LineWebhook = {
  destination?: string;
  events?: LineEvent[];
};

type IngestedTextEvent = {
  conversationId: string;
  messageId: string;
  externalEventId: string;
  sourceId: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ webhookKey: string }> }
) {
  const { webhookKey } = await context.params;
  const db = getDb();
  const [account] = await db
    .select()
    .from(channelAccounts)
    .where(and(eq(channelAccounts.platform, "line"), eq(channelAccounts.webhookKey, webhookKey)))
    .limit(1);
  if (!account) return Response.json({ error: "unknown webhook" }, { status: 404 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";
  let channelSecret = "";
  let accessToken = "";
  try {
    [channelSecret, accessToken] = await Promise.all([
      decryptSecret(account.channelSecretEncrypted),
      decryptSecret(account.accessTokenEncrypted),
    ]);
  } catch {
    return Response.json({ error: "channel configuration unavailable" }, { status: 503 });
  }
  if (!channelSecret || !(await validLineSignature(rawBody, channelSecret, signature))) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: LineWebhook;
  try {
    payload = JSON.parse(rawBody) as LineWebhook;
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  const now = new Date().toISOString();
  await db.update(channelAccounts).set({ lastWebhookAt: now, updatedAt: now }).where(eq(channelAccounts.id, account.id));
  const jobs: Array<() => Promise<void>> = [];
  let processed = 0;
  for (const event of events) {
    try {
      if (event.type !== "message" || event.message?.type !== "text" || !event.message.text?.trim()) continue;
      const ingested = await ingestTextEvent(account, event);
      if (!ingested) continue;
      jobs.push(() => processTextEvent(account, accessToken, event, ingested));
      processed += 1;
    } catch (error) {
      console.error("LINE webhook event ingestion failed", error);
    }
  }

  if (jobs.length) {
    const background = Promise.allSettled(jobs.map((job) => job())).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") console.error("LINE webhook background processing failed", result.reason);
      }
    });
    const executionContext = getRequestExecutionContext();
    if (executionContext) executionContext.waitUntil(background);
    else await background;
  }
  return Response.json({ ok: true, processed });
}

async function ingestTextEvent(
  account: typeof channelAccounts.$inferSelect,
  event: LineEvent
): Promise<IngestedTextEvent | null> {
  const db = getDb();
  const externalEventId = event.webhookEventId?.trim() || event.message?.id?.trim() || crypto.randomUUID();
  const [duplicate] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.ownerUserId, account.ownerUserId), eq(messages.externalMessageId, externalEventId))).limit(1);
  if (duplicate) return null;

  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, account.chatbotId)).limit(1);
  if (!bot?.workspaceId) throw new Error("chatbot workspace unavailable");
  const sourceId =
    event.source?.type === "group"
      ? event.source.groupId || ""
      : event.source?.type === "room"
        ? event.source.roomId || ""
        : event.source?.userId || "";
  if (!sourceId) throw new Error("LINE source unavailable");
  const now = new Date().toISOString();
  const eventAt = lineEventTimestamp(event.timestamp, now);
  const customerText = event.message?.text?.trim() ?? "";

  let [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.channelAccountId, account.id), eq(conversations.externalUserId, sourceId)))
    .limit(1);
  if (!conversation) {
    const id = crypto.randomUUID();
    await db.insert(conversations).values({
      id,
      ownerUserId: account.ownerUserId,
      workspaceId: bot.workspaceId,
      chatbotId: bot.id,
      channelAccountId: account.id,
      platform: "line",
      externalUserId: sourceId,
      customerName: "ลูกค้า LINE",
      unreadCount: 0,
      lastCustomerMessage: customerText,
      lastMessagePreview: customerText,
      lastMessageAt: eventAt,
    }).onConflictDoNothing();
    [conversation] = await db.select().from(conversations).where(and(eq(conversations.channelAccountId, account.id), eq(conversations.externalUserId, sourceId))).limit(1);
  }
  if (!conversation) throw new Error("conversation unavailable");

  const messageId = crypto.randomUUID();
  const [inserted] = await db.insert(messages).values({
    id: messageId,
    ownerUserId: account.ownerUserId,
    conversationId: conversation.id,
    direction: "inbound",
    senderType: "customer",
    senderName: "ลูกค้า LINE",
    content: customerText,
    externalMessageId: externalEventId,
    deliveryStatus: "received",
    createdAt: eventAt,
  }).onConflictDoNothing().returning({ id: messages.id });
  if (!inserted) return null;

  await db.update(conversations).set({
    unreadCount: sql`${conversations.unreadCount} + 1`,
    updatedAt: now,
  }).where(eq(conversations.id, conversation.id));
  await db.update(conversations).set({
    lastCustomerMessage: customerText,
    lastMessagePreview: customerText,
    lastMessageAt: eventAt,
    status: conversation.status === "closed" ? "open" : conversation.status,
    updatedAt: now,
  }).where(and(eq(conversations.id, conversation.id), lte(conversations.lastMessageAt, eventAt)));

  return { conversationId: conversation.id, messageId, externalEventId, sourceId };
}

async function processTextEvent(
  account: typeof channelAccounts.$inferSelect,
  accessToken: string,
  event: LineEvent,
  ingested: IngestedTextEvent
) {
  const db = getDb();
  const customerName = await getLineCustomerName(accessToken, event.source, ingested.sourceId);
  await db.update(messages).set({ senderName: customerName }).where(eq(messages.id, ingested.messageId));
  await db.update(conversations).set({ customerName }).where(and(
    eq(conversations.id, ingested.conversationId),
    eq(conversations.customerName, "ลูกค้า LINE")
  ));

  const [[freshAccount], [conversation], [bot]] = await Promise.all([
    db.select().from(channelAccounts).where(eq(channelAccounts.id, account.id)).limit(1),
    db.select().from(conversations).where(eq(conversations.id, ingested.conversationId)).limit(1),
    db.select().from(chatbots).where(eq(chatbots.id, account.chatbotId)).limit(1),
  ]);
  if (!freshAccount || !conversation || !bot?.workspaceId) return;

  if (!freshAccount.autoReply || freshAccount.status !== "active" || !conversation.aiEnabled || conversation.humanTakeover || event.mode === "standby" || !event.replyToken) {
    if (!conversation.humanTakeover) {
      await db.update(conversations).set({
        status: "pending",
        routingReason: !event.replyToken ? "LINE event ไม่มี replyToken สำหรับตอบกลับ" : conversation.routingReason,
        updatedAt: new Date().toISOString(),
      }).where(eq(conversations.id, conversation.id));
    }
    return;
  }

  const [admins, skills, documents, providers] = await Promise.all([
    db.select().from(adminProfiles).where(and(eq(adminProfiles.ownerUserId, freshAccount.ownerUserId), eq(adminProfiles.workspaceId, bot.workspaceId), eq(adminProfiles.status, "active"))).orderBy(asc(adminProfiles.createdAt)),
    db.select().from(adminSkills).where(and(eq(adminSkills.ownerUserId, freshAccount.ownerUserId), eq(adminSkills.workspaceId, bot.workspaceId), eq(adminSkills.status, "active"))).orderBy(desc(adminSkills.updatedAt)),
    db.select().from(adminDocuments).where(and(eq(adminDocuments.ownerUserId, freshAccount.ownerUserId), eq(adminDocuments.workspaceId, bot.workspaceId))).orderBy(desc(adminDocuments.updatedAt)),
    db.select().from(aiProviders).where(and(eq(aiProviders.ownerUserId, freshAccount.ownerUserId), eq(aiProviders.workspaceId, bot.workspaceId), eq(aiProviders.status, "active"))).orderBy(desc(aiProviders.isDefault), asc(aiProviders.createdAt)),
  ]);
  const provider = providers.find((item) => item.id === freshAccount.aiProviderId) || providers.find((item) => item.isDefault) || providers[0];
  const candidates: RoutingCandidate[] = skills.flatMap((skill) => {
    const admin = admins.find((item) => item.id === skill.adminId);
    if (!admin) return [];
    const employeeDocuments = documents.filter((document) => document.adminId === admin.id);
    return [{
      admin: {
        id: admin.id,
        name: admin.name,
        gender: admin.gender,
        age: admin.age,
        avatarId: admin.avatarId,
        role: admin.role,
        department: admin.department,
        description: admin.description,
        personality: admin.personality,
        customerTypingStyle: admin.customerTypingStyle,
      },
      skill: {
        id: skill.id,
        name: skill.name,
        objective: skill.objective,
        instructions: skill.instructions,
        knowledge: skill.knowledge,
        routingKeywords: skill.routingKeywords,
        minimumConfidence: skill.minimumConfidence,
        tone: skill.tone,
        escalationRules: skill.escalationRules,
        prohibitedTopics: skill.prohibitedTopics,
        compiledMarkdown: compileSkillMarkdown(admin, skill, employeeDocuments),
        employeeDocumentSummary: employeeDocuments
          .map((document) => `${document.fileName}:\n${document.content}`)
          .join("\n\n"),
        version: skill.version,
      },
    }];
  });

  if (!provider || !candidates.length) {
    if (await canAutoReply(freshAccount.id, conversation.id, ingested.externalEventId)) {
      await sendFallbackReply(
        freshAccount.ownerUserId,
        conversation.id,
        accessToken,
        event.replyToken,
        "ได้รับข้อความแล้วค่ะ ขณะนี้กำลังส่งเรื่องให้เจ้าหน้าที่ตรวจสอบและจะตอบกลับโดยเร็วที่สุด",
        !provider ? "ยังไม่มี AI Provider ที่พร้อมใช้งาน" : "ยังไม่มี Admin ที่มี Skill ตรงสำหรับวิเคราะห์"
      );
    }
    return;
  }

  let replyAttempted = false;
  try {
    const recent = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(desc(messages.createdAt)).limit(12);
    const turns: ChatTurn[] = recent.reverse().map((message) => ({
      role: message.senderType === "customer" ? "user" : "assistant",
      content: message.content,
    }));
    const decision = await routeToAdmin(provider, candidates, turns);
    const selected = candidates.find((candidate) => candidate.admin.id === decision.adminId && candidate.skill.id === decision.skillId);
    if (!selected || decision.handoff) {
      if (await canAutoReply(freshAccount.id, conversation.id, ingested.externalEventId)) {
        await sendFallbackReply(
          freshAccount.ownerUserId,
          conversation.id,
          accessToken,
          event.replyToken,
          "ได้รับข้อความแล้วค่ะ คำถามนี้ต้องให้เจ้าหน้าที่ตรวจสอบเพิ่มเติม กำลังส่งต่อให้เจ้าหน้าที่ดูแลนะคะ",
          decision.reason
        );
      }
      return;
    }
    const { admin, skill } = selected;
    const instruction = buildSkillInstruction(admin, skill, decision.reason);
    const result = await generateAiReply(provider, instruction, turns);
    const answer = `ตอบโดย ${admin.name}\n\n${result.text}`.slice(0, 4900);
    if (!(await canAutoReply(freshAccount.id, conversation.id, ingested.externalEventId))) return;
    replyAttempted = true;
    await replyToLine(accessToken, event.replyToken, answer);
    const sentAt = new Date().toISOString();
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      ownerUserId: freshAccount.ownerUserId,
      conversationId: conversation.id,
      direction: "outbound",
      senderType: "ai",
      senderName: admin.name,
      content: answer,
      deliveryStatus: "sent",
      aiProviderId: provider.id,
      adminId: admin.id,
      skillId: skill.id,
      model: result.model,
      latencyMs: result.latencyMs + decision.latencyMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      confidence: decision.confidence,
      routingReason: decision.reason,
      skillVersion: skill.version,
      createdAt: sentAt,
    });
    await db.update(conversations).set({
      assignedAdminId: admin.id,
      skillId: skill.id,
      status: "open",
      routingConfidence: decision.confidence,
      routingReason: decision.reason,
      routedAt: sentAt,
      lastMessagePreview: answer,
      lastMessageAt: sentAt,
      updatedAt: sentAt,
    }).where(and(
      eq(conversations.id, conversation.id),
      eq(conversations.aiEnabled, true),
      eq(conversations.humanTakeover, false)
    ));
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "AI Router หรือ Admin AI ประมวลผลไม่สำเร็จ";
    if (replyAttempted) {
      await db.update(conversations).set({
        status: "escalated",
        aiEnabled: false,
        humanTakeover: true,
        humanAgentName: "",
        routingReason: reason,
        updatedAt: new Date().toISOString(),
      }).where(eq(conversations.id, conversation.id));
      return;
    }
    if (await canAutoReply(freshAccount.id, conversation.id, ingested.externalEventId)) {
      await sendFallbackReply(freshAccount.ownerUserId, conversation.id, accessToken, event.replyToken, "ได้รับข้อความแล้วค่ะ ระบบกำลังส่งต่อให้เจ้าหน้าที่ตรวจสอบเพื่อให้ข้อมูลที่ถูกต้อง", reason);
    }
  }
}

async function canAutoReply(accountId: string, conversationId: string, externalEventId: string) {
  const db = getDb();
  const [[account], [conversation], [latestInbound]] = await Promise.all([
    db.select({ status: channelAccounts.status, autoReply: channelAccounts.autoReply }).from(channelAccounts).where(eq(channelAccounts.id, accountId)).limit(1),
    db.select({ aiEnabled: conversations.aiEnabled, humanTakeover: conversations.humanTakeover }).from(conversations).where(eq(conversations.id, conversationId)).limit(1),
    db.select({ externalMessageId: messages.externalMessageId }).from(messages).where(and(
      eq(messages.conversationId, conversationId),
      eq(messages.direction, "inbound")
    )).orderBy(desc(messages.createdAt)).limit(1),
  ]);
  return Boolean(
    account?.status === "active" &&
    account.autoReply &&
    conversation?.aiEnabled &&
    !conversation.humanTakeover &&
    latestInbound?.externalMessageId === externalEventId
  );
}

async function sendFallbackReply(ownerUserId: string, conversationId: string, accessToken: string, replyToken: string | undefined, text: string, reason: string) {
  const db = getDb();
  let deliveryStatus = "sent";
  try {
    await replyToLine(accessToken, replyToken, text);
  } catch {
    deliveryStatus = "failed";
  }
  const now = new Date().toISOString();
  await db.insert(messages).values({
    id: crypto.randomUUID(),
    ownerUserId,
    conversationId,
    direction: "outbound",
    senderType: "system",
    senderName: "ระบบส่งต่อ",
    content: text,
    deliveryStatus,
    routingReason: reason,
    createdAt: now,
  });
  await db.update(conversations).set({
    status: "escalated",
    aiEnabled: false,
    humanTakeover: true,
    humanAgentName: "",
    routingConfidence: 0,
    routingReason: reason,
    routedAt: now,
    lastMessagePreview: text,
    lastMessageAt: now,
    updatedAt: now,
  }).where(eq(conversations.id, conversationId));
}

async function replyToLine(accessToken: string, replyToken: string | undefined, text: string) {
  if (!replyToken) throw new Error("LINE event ไม่มี replyToken สำหรับตอบกลับ");
  const response = await fetchWithTimeout("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  }, 10_000, "LINE ใช้เวลาตอบข้อความนานเกิน 10 วินาที");
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`LINE ตอบข้อความไม่สำเร็จ (HTTP ${response.status}) ${detail.slice(0, 160)}`.trim());
  }
}

async function getLineCustomerName(
  accessToken: string,
  source: LineEvent["source"],
  fallbackId: string
) {
  if (source?.type !== "user" || !source.userId) return source?.type === "group" ? "ลูกค้าจากกลุ่ม LINE" : "ลูกค้า LINE";
  try {
    const response = await fetchWithTimeout(`https://api.line.me/v2/bot/profile/${encodeURIComponent(source.userId)}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    }, 10_000, "LINE ใช้เวลาโหลดโปรไฟล์ลูกค้านานเกิน 10 วินาที");
    if (!response.ok) return "ลูกค้า LINE";
    const profile = (await response.json()) as { displayName?: string };
    return profile.displayName?.trim() || "ลูกค้า LINE";
  } catch {
    return fallbackId ? "ลูกค้า LINE" : "ลูกค้า";
  }
}

function lineEventTimestamp(timestamp: number | undefined, fallback: string) {
  if (!Number.isFinite(timestamp) || !timestamp || timestamp > Date.now() + 5 * 60_000) return fallback;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

async function validLineSignature(body: string, secret: string, signature: string) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  let expected: Uint8Array;
  try {
    expected = Uint8Array.from(atob(signature), (character) => character.charCodeAt(0));
  } catch {
    return false;
  }
  if (signed.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < signed.length; index += 1) difference |= signed[index] ^ expected[index];
  return difference === 0;
}
