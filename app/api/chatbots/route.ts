import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { channelAccounts, chatbots, conversations, workspaces } from "@/db/schema";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อฐานข้อมูลได้";
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const db = getDb();
    const [bots, accounts, chats] = await Promise.all([
      db.select().from(chatbots).where(eq(chatbots.ownerUserId, user.id)).orderBy(desc(chatbots.createdAt)),
      db.select().from(channelAccounts).where(eq(channelAccounts.ownerUserId, user.id)),
      db.select({ chatbotId: conversations.chatbotId, unreadCount: conversations.unreadCount }).from(conversations).where(eq(conversations.ownerUserId, user.id)),
    ]);
    const result = bots.map((bot) => ({
      ...bot,
      channelCount: accounts.filter((account) => account.chatbotId === bot.id).length,
      unreadCount: chats
        .filter((chat) => chat.chatbotId === bot.id)
        .reduce((sum, chat) => sum + chat.unreadCount, 0),
    }));
    return Response.json({ chatbots: result });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      name?: string;
      workspaceId?: string;
      businessSystem?: string;
      description?: string;
      greeting?: string;
    };
    const name = payload.name?.trim() ?? "";
    const workspaceId = payload.workspaceId?.trim() ?? "";
    if (!name || !workspaceId) return Response.json({ error: "กรุณากรอกชื่อแชตบอตและเลือกระบบ" }, { status: 400 });

    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });
    const [chatbot] = await db
      .insert(chatbots)
      .values({
        id: crypto.randomUUID(),
        ownerUserId: user.id,
        workspaceId,
        name,
        businessSystem: payload.businessSystem?.trim() ?? "",
        description: payload.description?.trim() ?? "",
        greeting: payload.greeting?.trim() ?? "",
      })
      .returning();
    return Response.json({ chatbot: { ...chatbot, channelCount: 0, unreadCount: 0 } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
