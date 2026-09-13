import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { aiProviders, authUsers, channelAccounts, chatbots, conversations, paymentOrders, workspaces } from "@/db/schema";
import { hasPlatformPermission } from "@/lib/auth";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลแพลตฟอร์มได้";
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (!hasPlatformPermission(user, "overview.view")) return Response.json({ error: "ไม่มีสิทธิ์เข้าถึงข้อมูลแพลตฟอร์ม" }, { status: 403 });

    const db = getDb();
    const [users, allWorkspaces, allBots, allChannels, allProviders, allConversations, allOrders] = await Promise.all([
      db.select({ id: authUsers.id, username: authUsers.username, displayName: authUsers.displayName, email: authUsers.email, status: authUsers.status, createdAt: authUsers.createdAt }).from(authUsers).where(eq(authUsers.role, "merchant")).orderBy(desc(authUsers.createdAt)),
      db.select({ id: workspaces.id, ownerUserId: workspaces.ownerUserId, name: workspaces.name, systemCode: workspaces.systemCode, plan: workspaces.plan, status: workspaces.status, createdAt: workspaces.createdAt }).from(workspaces),
      db.select({ id: chatbots.id, ownerUserId: chatbots.ownerUserId, workspaceId: chatbots.workspaceId }).from(chatbots),
      db.select({ id: channelAccounts.id, ownerUserId: channelAccounts.ownerUserId, chatbotId: channelAccounts.chatbotId, status: channelAccounts.status }).from(channelAccounts),
      db.select({ id: aiProviders.id, ownerUserId: aiProviders.ownerUserId, status: aiProviders.status, apiKeyEncrypted: aiProviders.apiKeyEncrypted }).from(aiProviders),
      db.select({ ownerUserId: conversations.ownerUserId, status: conversations.status, unreadCount: conversations.unreadCount }).from(conversations),
      db.select({ ownerUserId: paymentOrders.ownerUserId, amountSatang: paymentOrders.amountSatang, status: paymentOrders.status }).from(paymentOrders),
    ]);

    const merchants = users.map((merchant) => {
      const merchantWorkspaces = allWorkspaces.filter((workspace) => workspace.ownerUserId === merchant.id);
      const workspaceIds = new Set(merchantWorkspaces.map((workspace) => workspace.id));
      const merchantBots = allBots.filter((bot) => bot.ownerUserId === merchant.id || (bot.workspaceId && workspaceIds.has(bot.workspaceId)));
      const botIds = new Set(merchantBots.map((bot) => bot.id));
      const merchantChannels = allChannels.filter((channel) => channel.ownerUserId === merchant.id || botIds.has(channel.chatbotId));
      const merchantProviders = allProviders.filter((provider) => provider.ownerUserId === merchant.id);
      const merchantConversations = allConversations.filter((conversation) => conversation.ownerUserId === merchant.id);
      const merchantOrders = allOrders.filter((order) => order.ownerUserId === merchant.id && order.status === "paid");
      const paidAmountSatang = merchantOrders.reduce((sum, order) => sum + order.amountSatang, 0);

      return {
        ...merchant,
        workspaceCount: merchantWorkspaces.length,
        botCount: merchantBots.length,
        channelCount: merchantChannels.length,
        activeChannelCount: merchantChannels.filter((channel) => channel.status === "active").length,
        aiProviderCount: merchantProviders.length,
        activeConversationCount: merchantConversations.filter((conversation) => conversation.status !== "closed").length,
        unreadCount: merchantConversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
        paidOrderCount: merchantOrders.length,
        paidAmountSatang,
        primaryPlan: merchantWorkspaces[0]?.plan || "ยังไม่เลือก",
        latestWorkspace: merchantWorkspaces[0]?.name || "ยังไม่มีระบบร้านค้า",
      };
    });

    return Response.json({
      stats: {
        merchantCount: merchants.length,
        activeMerchantCount: merchants.filter((merchant) => merchant.status === "active").length,
        workspaceCount: allWorkspaces.length,
        activeChannelCount: allChannels.filter((channel) => channel.status === "active").length,
        aiProviderCount: allProviders.filter((provider) => provider.apiKeyEncrypted !== "" && provider.status === "active").length,
        openConversationCount: allConversations.filter((conversation) => conversation.status !== "closed").length,
        paidAmountSatang: allOrders.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.amountSatang, 0),
      },
      merchants,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
