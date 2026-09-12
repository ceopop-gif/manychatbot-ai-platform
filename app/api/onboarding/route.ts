import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { aiProviders, channelAccounts, chatbots, paymentProfiles, workspaces } from "@/db/schema";
import { encryptSecret } from "@/lib/secret-vault";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "สมัครใช้งานไม่สำเร็จ";
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      workspaceName?: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      plan?: string;
      line?: { accountName?: string; channelId?: string; channelSecret?: string; accessToken?: string };
      ai?: { provider?: "openai" | "anthropic" | "gemini" | "custom"; name?: string; model?: string; baseUrl?: string; apiKey?: string };
    };
    const workspaceName = payload.workspaceName?.trim() ?? "";
    if (!workspaceName) return Response.json({ error: "กรุณากรอกชื่อธุรกิจหรือชื่อระบบ" }, { status: 400 });
    const lineValues = [payload.line?.channelId, payload.line?.channelSecret, payload.line?.accessToken].map((item) => item?.trim() ?? "");
    if (lineValues.some(Boolean) && !lineValues.every(Boolean)) return Response.json({ error: "หากเชื่อม LINE OA ตอนนี้ กรุณากรอก Channel ID, Channel secret และ Channel access token ให้ครบ" }, { status: 400 });
    const aiKey = payload.ai?.apiKey?.trim() ?? "";
    if (aiKey && (!payload.ai?.provider || !payload.ai?.model?.trim())) return Response.json({ error: "กรุณาเลือก AI Provider และกรอก Model ให้ครบ" }, { status: 400 });

    const [channelSecretEncrypted, accessTokenEncrypted, apiKeyEncrypted] = await Promise.all([
      lineValues[1] ? encryptSecret(lineValues[1]) : Promise.resolve(""),
      lineValues[2] ? encryptSecret(lineValues[2]) : Promise.resolve(""),
      aiKey ? encryptSecret(aiKey) : Promise.resolve(""),
    ]);
    const db = getDb();
    if (lineValues.every(Boolean)) {
      const [existingChannel] = await db.select({ id: channelAccounts.id }).from(channelAccounts).where(and(
        eq(channelAccounts.ownerUserId, user.id),
        eq(channelAccounts.platform, "line"),
        eq(channelAccounts.channelId, lineValues[0])
      )).limit(1);
      if (existingChannel) return Response.json({ error: "Channel ID นี้เชื่อมอยู่ในระบบแล้ว" }, { status: 409 });
    }
    const workspaceId = crypto.randomUUID();
    const chatbotId = crypto.randomUUID();
    const allowedPlans = new Set(["trial", "pro", "business"]);
    const plan = allowedPlans.has(payload.plan ?? "") ? payload.plan! : "trial";
    const [workspace] = await db.insert(workspaces).values({
      id: workspaceId,
      ownerUserId: user.id,
      name: workspaceName,
      systemCode: `MCB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      customerName: payload.customerName?.trim() || user.displayName,
      customerEmail: payload.customerEmail?.trim() || user.email,
      customerPhone: payload.customerPhone?.trim() ?? "",
      plan,
    }).returning();
    const [chatbot] = await db.insert(chatbots).values({
      id: chatbotId,
      ownerUserId: user.id,
      workspaceId,
      name: `${workspaceName} AI`,
      businessSystem: "LINE OA",
      description: "ผู้ช่วย AI สำหรับรับและตอบข้อความลูกค้าจาก LINE OA",
      greeting: "สวัสดีค่ะ มีอะไรให้ผู้ช่วย AI ดูแลวันนี้คะ?",
    }).returning();
    let providerId: string | null = null;
    if (aiKey && payload.ai?.provider) {
      providerId = crypto.randomUUID();
      await db.insert(aiProviders).values({
        id: providerId,
        ownerUserId: user.id,
        workspaceId,
        provider: payload.ai.provider,
        name: payload.ai.name?.trim() || `${payload.ai.provider} หลัก`,
        model: payload.ai.model?.trim() || "",
        baseUrl: payload.ai.baseUrl?.trim() || "",
        apiKeyEncrypted,
        status: "pending",
        isDefault: true,
      });
    }
    let channelId: string | null = null;
    if (lineValues.every(Boolean)) {
      channelId = crypto.randomUUID();
      await db.insert(channelAccounts).values({
        id: channelId,
        ownerUserId: user.id,
        workspaceId,
        chatbotId,
        platform: "line",
        accountName: payload.line?.accountName?.trim() || "LINE OA หลัก",
        channelId: lineValues[0],
        channelSecretEncrypted,
        accessTokenEncrypted,
        webhookKey: crypto.randomUUID().replaceAll("-", ""),
        aiProviderId: providerId,
        status: "pending",
      });
    }
    await db.insert(paymentProfiles).values({
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      workspaceId,
      provider: "chatpos",
      checkoutBaseUrl: "https://chatpospay.com",
      status: "pending",
    });
    return Response.json({ workspace, chatbot, channelId, providerId }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
