import { and, asc, desc, eq } from "drizzle-orm";
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
  let processed = 0;
  for (const event of events) {
    try {
      if (event.type !== "message" || event.message?.type !== "text" || !event.message.text?.trim()) continue;
      await processTextEvent(account, accessToken, event);
      processed += 1;
    } catch {
      // Return 200 for valid LINE webhooks. The conversation remains visible for human follow-up.
    }
  }
  return Response.json({ ok: true, processed });
}

async function processTextEvent(
  account: typeof channelAccounts.$inferSelect,
  accessToken: string,
  event: LineEvent
) {
  const db = getDb();
  const externalMessageId = event.message?.id?.trim() || event.webhookEventId?.trim() || crypto.randomUUID();
  const [duplicate] = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.ownerUserId, account.ownerUserId), eq(messages.externalMessageId, externalMessageId))).limit(1);
  if (duplicate) return;

  const [bot] = await db.select().from(chatbots).where(eq(chatbots.id, account.chatbotId)).limit(1);
  if (!bot?.workspaceId) throw new Error("chatbot workspace unavailable");
  const sourceId =
    event.source?.type === "group"
      ? event.source.groupId || ""
      : event.source?.type === "room"
        ? event.source.roomId || ""
        : event.source?.userId || "";
  if (!sourceId) throw new Error("LINE source unavailable");
  const customerName = await getLineCustomerName(accessToken, event.source, sourceId);
  const now = new Date().toISOString();
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
      customerName,
      unreadCount: 1,
      lastCustomerMessage: customerText,
      lastMessagePreview: customerText,
      lastMessageAt: now,
    }).onConflictDoNothing();
    [conversation] = await db.select().from(conversations).where(and(eq(conversations.channelAccountId, account.id), eq(conversations.externalUserId, sourceId))).limit(1);
  } else {
    await db.update(conversations).set({
      customerName: conversation.customerName === "ลูกค้า" ? customerName : conversation.customerName,
      unreadCount: conversation.unreadCount + 1,
      lastCustomerMessage: customerText,
      lastMessagePreview: customerText,
      lastMessageAt: now,
      status: conversation.status === "closed" ? "open" : conversation.status,
      updatedAt: now,
    }).where(eq(conversations.id, conversation.id));
  }
  if (!conversation) throw new Error("conversation unavailable");

  await db.insert(messages).values({
    id: crypto.randomUUID(),
    ownerUserId: account.ownerUserId,
    conversationId: conversation.id,
    direction: "inbound",
    senderType: "customer",
    senderName: customerName,
    content: customerText,
    externalMessageId,
    deliveryStatus: "received",
  });

  if (!account.autoReply || !conversation.aiEnabled || conversation.humanTakeover || event.mode === "standby") {
    await db.update(conversations).set({ status: "pending", updatedAt: now }).where(eq(conversations.id, conversation.id));
    return;
  }

  const [admins, skills, documents, providers] = await Promise.all([
    db.select().from(adminProfiles).where(and(eq(adminProfiles.ownerUserId, account.ownerUserId), eq(adminProfiles.workspaceId, bot.workspaceId), eq(adminProfiles.status, "active"))).orderBy(asc(adminProfiles.createdAt)),
    db.select().from(adminSkills).where(and(eq(adminSkills.ownerUserId, account.ownerUserId), eq(adminSkills.workspaceId, bot.workspaceId), eq(adminSkills.status, "active"))).orderBy(desc(adminSkills.updatedAt)),
    db.select().from(adminDocuments).where(and(eq(adminDocuments.ownerUserId, account.ownerUserId), eq(adminDocuments.workspaceId, bot.workspaceId))).orderBy(desc(adminDocuments.updatedAt)),
    db.select().from(aiProviders).where(and(eq(aiProviders.ownerUserId, account.ownerUserId), eq(aiProviders.workspaceId, bot.workspaceId), eq(aiProviders.status, "active"))).orderBy(desc(aiProviders.isDefault), asc(aiProviders.createdAt)),
  ]);
  const provider = providers.find((item) => item.id === account.aiProviderId) || providers.find((item) => item.isDefault) || providers[0];
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
    await sendFallbackReply(
      account.ownerUserId,
      conversation.id,
      accessToken,
      event.replyToken,
      "ได้รับข้อความแล้วค่ะ ขณะนี้กำลังส่งเรื่องให้เจ้าหน้าที่ตรวจสอบและจะตอบกลับโดยเร็วที่สุด",
      !provider ? "ยังไม่มี AI Provider ที่พร้อมใช้งาน" : "ยังไม่มี Admin ที่มี Skill ตรงสำหรับวิเคราะห์"
    );
    return;
  }

  try {
    const recent = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(desc(messages.createdAt)).limit(12);
    const turns: ChatTurn[] = recent.reverse().map((message) => ({
      role: message.senderType === "customer" ? "user" : "assistant",
      content: message.content,
    }));
    const decision = await routeToAdmin(provider, candidates, turns);
    const selected = candidates.find((candidate) => candidate.admin.id === decision.adminId && candidate.skill.id === decision.skillId);
    if (!selected || decision.handoff) {
      await sendFallbackReply(
        account.ownerUserId,
        conversation.id,
        accessToken,
        event.replyToken,
        "ได้รับข้อความแล้วค่ะ คำถามนี้ต้องให้เจ้าหน้าที่ตรวจสอบเพิ่มเติม กำลังส่งต่อให้เจ้าหน้าที่ดูแลนะคะ",
        decision.reason
      );
      return;
    }
    const { admin, skill } = selected;
    const instruction = buildSkillInstruction(admin, skill, decision.reason);
    const result = await generateAiReply(provider, instruction, turns);
    const answer = `ตอบโดย ${admin.name}\n\n${result.text}`.slice(0, 4900);
    await replyToLine(accessToken, event.replyToken, answer);
    const sentAt = new Date().toISOString();
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      ownerUserId: account.ownerUserId,
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
    });
    await db.update(conversations).set({
      assignedAdminId: admin.id,
      skillId: skill.id,
      unreadCount: 0,
      status: "open",
      routingConfidence: decision.confidence,
      routingReason: decision.reason,
      humanTakeover: false,
      humanAgentName: "",
      routedAt: sentAt,
      lastMessagePreview: answer,
      lastMessageAt: sentAt,
      updatedAt: sentAt,
    }).where(eq(conversations.id, conversation.id));
    await db.update(channelAccounts).set({ unreadCount: 0, lastWebhookAt: sentAt, updatedAt: sentAt }).where(eq(channelAccounts.id, account.id));
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "AI Router หรือ Admin AI ประมวลผลไม่สำเร็จ";
    await sendFallbackReply(account.ownerUserId, conversation.id, accessToken, event.replyToken, "ได้รับข้อความแล้วค่ะ ระบบกำลังส่งต่อให้เจ้าหน้าที่ตรวจสอบเพื่อให้ข้อมูลที่ถูกต้อง", reason);
  }
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
  });
  await db.update(conversations).set({
    status: "escalated",
    aiEnabled: false,
    humanTakeover: true,
    humanAgentName: "",
    routingConfidence: 0,
    routingReason: reason,
    routedAt: now,
    unreadCount: 1,
    lastMessagePreview: text,
    lastMessageAt: now,
    updatedAt: now,
  }).where(eq(conversations.id, conversationId));
}

async function replyToLine(accessToken: string, replyToken: string | undefined, text: string) {
  if (!replyToken) return;
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!response.ok) throw new Error("LINE reply failed");
}

async function getLineCustomerName(
  accessToken: string,
  source: LineEvent["source"],
  fallbackId: string
) {
  if (source?.type !== "user" || !source.userId) return source?.type === "group" ? "ลูกค้าจากกลุ่ม LINE" : "ลูกค้า LINE";
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(source.userId)}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return "ลูกค้า LINE";
    const profile = (await response.json()) as { displayName?: string };
    return profile.displayName?.trim() || "ลูกค้า LINE";
  } catch {
    return fallbackId ? "ลูกค้า LINE" : "ลูกค้า";
  }
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
