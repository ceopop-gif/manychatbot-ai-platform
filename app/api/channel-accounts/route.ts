import { and, desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminProfiles, aiProviders, channelAccounts, chatbots, conversations } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/secret-vault";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อบัญชีช่องทางได้";
}

function safeAccount(account: typeof channelAccounts.$inferSelect, origin: string, unreadCount = account.unreadCount) {
  const { channelSecretEncrypted, accessTokenEncrypted, ...safe } = account;
  return {
    ...safe,
    unreadCount,
    hasChannelSecret: Boolean(channelSecretEncrypted),
    hasAccessToken: Boolean(accessTokenEncrypted),
    webhookUrl: account.webhookKey ? `${origin}/api/webhooks/${account.platform}/${account.webhookKey}` : "",
  };
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const url = new URL(request.url);
    const chatbotId = url.searchParams.get("chatbotId");
    const db = getDb();
    const query = db.select().from(channelAccounts);
    const accounts = chatbotId
      ? await query.where(and(eq(channelAccounts.chatbotId, chatbotId), eq(channelAccounts.ownerUserId, user.id))).orderBy(desc(channelAccounts.createdAt))
      : await query.where(eq(channelAccounts.ownerUserId, user.id)).orderBy(desc(channelAccounts.createdAt));
    const chats = await db.select({ channelAccountId: conversations.channelAccountId, unreadCount: conversations.unreadCount }).from(conversations).where(eq(conversations.ownerUserId, user.id));
    return Response.json({ accounts: accounts.map((account) => safeAccount(account, url.origin, chats.filter((chat) => chat.channelAccountId === account.id).reduce((sum, chat) => sum + chat.unreadCount, 0))) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      chatbotId?: string;
      accountName?: string;
      externalId?: string;
      channelId?: string;
      channelSecret?: string;
      accessToken?: string;
      aiProviderId?: string | null;
      autoReply?: boolean;
    };
    const chatbotId = payload.chatbotId?.trim() ?? "";
    const accountName = payload.accountName?.trim() ?? "";
    const channelId = payload.channelId?.trim() ?? "";
    const channelSecret = payload.channelSecret?.trim() ?? "";
    const accessToken = payload.accessToken?.trim() ?? "";
    if (!chatbotId || !accountName || !channelId || !channelSecret || !accessToken) {
      return Response.json({ error: "กรุณากรอกชื่อ LINE OA, Channel ID, Channel secret และ Channel access token ให้ครบ" }, { status: 400 });
    }
    const db = getDb();
    const [bot] = await db.select().from(chatbots).where(and(eq(chatbots.id, chatbotId), eq(chatbots.ownerUserId, user.id))).limit(1);
    if (!bot) return Response.json({ error: "ไม่พบแชตบอตที่เลือก" }, { status: 404 });
    if (!bot.workspaceId) return Response.json({ error: "แชตบอตนี้ยังไม่อยู่ในระบบลูกค้า" }, { status: 422 });

    const workspaceBots = await db.select({ id: chatbots.id }).from(chatbots).where(and(eq(chatbots.workspaceId, bot.workspaceId), eq(chatbots.ownerUserId, user.id)));
    const [existingLine] = await db.select({ id: channelAccounts.id }).from(channelAccounts).where(and(
      eq(channelAccounts.ownerUserId, user.id),
      eq(channelAccounts.platform, "line"),
      inArray(channelAccounts.chatbotId, workspaceBots.map((item) => item.id))
    )).limit(1);
    if (existingLine) {
      return Response.json({ error: "ระบบนี้เชื่อม LINE OA ได้ 1 บัญชีเท่านั้น กรุณาเปิดตั้งค่าบัญชีเดิม" }, { status: 409 });
    }
    if (payload.aiProviderId) {
      const [provider] = await db.select({ id: aiProviders.id }).from(aiProviders).where(and(
        eq(aiProviders.id, payload.aiProviderId),
        eq(aiProviders.workspaceId, bot.workspaceId),
        eq(aiProviders.ownerUserId, user.id)
      )).limit(1);
      if (!provider) return Response.json({ error: "ไม่พบ AI Provider ที่เลือก" }, { status: 404 });
    }
    const [channelSecretEncrypted, accessTokenEncrypted] = await Promise.all([
      encryptSecret(channelSecret),
      encryptSecret(accessToken),
    ]);

    const [account] = await db.insert(channelAccounts).values({
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      workspaceId: bot.workspaceId,
      chatbotId,
      platform: "line",
      accountName,
      externalId: payload.externalId?.trim() ?? "",
      channelId,
      channelSecretEncrypted,
      accessTokenEncrypted,
      webhookKey: crypto.randomUUID().replaceAll("-", ""),
      aiProviderId: payload.aiProviderId || null,
      autoReply: payload.autoReply ?? true,
    }).returning();
    return Response.json({ account: safeAccount(account, new URL(request.url).origin) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      id?: string;
      action?: "save" | "connect";
      channelId?: string;
      channelSecret?: string;
      accessToken?: string;
      adminId?: string | null;
      aiProviderId?: string | null;
      autoReply?: boolean;
    };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [current] = await db.select().from(channelAccounts).where(and(eq(channelAccounts.id, id), eq(channelAccounts.ownerUserId, user.id))).limit(1);
    if (!current) return Response.json({ error: "ไม่พบบัญชีช่องทาง" }, { status: 404 });
    const [bot] = await db.select().from(chatbots).where(and(eq(chatbots.id, current.chatbotId), eq(chatbots.ownerUserId, user.id))).limit(1);
    if (!bot?.workspaceId) return Response.json({ error: "บัญชีนี้ยังไม่อยู่ในระบบลูกค้า" }, { status: 422 });

    if (payload.adminId) {
      const [admin] = await db.select({ id: adminProfiles.id }).from(adminProfiles).where(and(eq(adminProfiles.id, payload.adminId), eq(adminProfiles.workspaceId, bot.workspaceId), eq(adminProfiles.ownerUserId, user.id))).limit(1);
      if (!admin) return Response.json({ error: "ไม่พบ Admin ที่เลือก" }, { status: 404 });
    }
    if (payload.aiProviderId) {
      const [provider] = await db.select({ id: aiProviders.id }).from(aiProviders).where(and(eq(aiProviders.id, payload.aiProviderId), eq(aiProviders.workspaceId, bot.workspaceId), eq(aiProviders.ownerUserId, user.id))).limit(1);
      if (!provider) return Response.json({ error: "ไม่พบ AI Provider ที่เลือก" }, { status: 404 });
    }

    const channelSecretEncrypted = payload.channelSecret?.trim()
      ? await encryptSecret(payload.channelSecret.trim())
      : current.channelSecretEncrypted;
    const accessTokenEncrypted = payload.accessToken?.trim()
      ? await encryptSecret(payload.accessToken.trim())
      : current.accessTokenEncrypted;
    const webhookKey = current.webhookKey || crypto.randomUUID().replaceAll("-", "");
    const changes = {
      channelId: payload.channelId?.trim() ?? current.channelId,
      workspaceId: current.workspaceId || bot.workspaceId,
      channelSecretEncrypted,
      accessTokenEncrypted,
      webhookKey,
      adminId: payload.adminId === undefined ? current.adminId : payload.adminId,
      aiProviderId: payload.aiProviderId === undefined ? current.aiProviderId : payload.aiProviderId,
      autoReply: payload.autoReply ?? current.autoReply,
      updatedAt: new Date().toISOString(),
    };

    if (payload.action === "connect") {
      if (current.platform !== "line") {
        return Response.json({ error: "การตรวจสอบอัตโนมัติในเวอร์ชันนี้รองรับ LINE OA" }, { status: 422 });
      }
      if (!changes.channelId.trim() || !channelSecretEncrypted || !accessTokenEncrypted) {
        return Response.json({ error: "กรุณากรอก Channel ID, Channel secret และ Channel access token ให้ครบ" }, { status: 400 });
      }
      const accessToken = await decryptSecret(accessTokenEncrypted);
      const origin = new URL(request.url).origin;
      const webhookUrl = `${origin}/api/webhooks/line/${webhookKey}`;
      const infoResponse = await fetch("https://api.line.me/v2/bot/info", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!infoResponse.ok) throw new Error("LINE ปฏิเสธ Channel access token กรุณาตรวจสอบ Token อีกครั้ง");
      const info = (await infoResponse.json()) as { userId?: string; displayName?: string };
      const setWebhook = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
        method: "PUT",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ endpoint: webhookUrl }),
      });
      if (!setWebhook.ok) throw new Error("บันทึก Webhook URL ที่ LINE ไม่สำเร็จ");
      const [account] = await db.update(channelAccounts).set({
        ...changes,
        externalId: current.externalId || info.userId || "",
        accountName: current.accountName || info.displayName || "LINE OA",
        status: "active",
        connectedAt: new Date().toISOString(),
      }).where(eq(channelAccounts.id, id)).returning();
      return Response.json({ account: safeAccount(account, origin), connected: true });
    }

    const [account] = await db.update(channelAccounts).set(changes).where(eq(channelAccounts.id, id)).returning();
    return Response.json({ account: safeAccount(account, new URL(request.url).origin), connected: false });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
