import { and, desc, eq, isNull } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { channelAccounts, chatbots, conversations, workspaces } from "@/db/schema";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อฐานข้อมูลได้";
}

async function ensureMasterWorkspace(user: { id: string; email: string; displayName: string }) {
  const db = getDb();
  const existing = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerUserId, user.id))
    .orderBy(desc(workspaces.createdAt));
  if (existing.length > 0) {
    await db
      .update(chatbots)
      .set({ workspaceId: existing[0].id })
      .where(and(eq(chatbots.ownerUserId, user.id), isNull(chatbots.workspaceId)));
    return existing;
  }

  const workspaceId = `master-${user.id}`;
  await db.insert(workspaces).values({
    id: workspaceId,
    ownerUserId: user.id,
    name: "MANYCHATBOT หลัก",
    systemCode: "MASTER",
    customerName: user.displayName,
    customerEmail: user.email,
    plan: "master",
  }).onConflictDoNothing();
  await db
    .update(chatbots)
    .set({ workspaceId })
    .where(and(eq(chatbots.ownerUserId, user.id), isNull(chatbots.workspaceId)));

  return db.select().from(workspaces).where(eq(workspaces.ownerUserId, user.id)).orderBy(desc(workspaces.createdAt));
}

export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const db = getDb();
    const systems = await ensureMasterWorkspace(user);
    const [bots, accounts, chats] = await Promise.all([
      db.select().from(chatbots).where(eq(chatbots.ownerUserId, user.id)),
      db.select().from(channelAccounts).where(eq(channelAccounts.ownerUserId, user.id)),
      db.select({ workspaceId: conversations.workspaceId, unreadCount: conversations.unreadCount }).from(conversations).where(eq(conversations.ownerUserId, user.id)),
    ]);
    return Response.json({
      workspaces: systems.map((system) => {
        const systemBots = bots.filter((bot) => bot.workspaceId === system.id);
        const botIds = new Set(systemBots.map((bot) => bot.id));
        const systemAccounts = accounts.filter((account) => botIds.has(account.chatbotId));
        return {
          ...system,
          botCount: systemBots.length,
          channelCount: systemAccounts.length,
          unreadCount: chats.filter((chat) => chat.workspaceId === system.id).reduce((sum, chat) => sum + chat.unreadCount, 0),
        };
      }),
    });
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
      customerName?: string;
      customerEmail?: string;
      plan?: string;
    };
    const name = payload.name?.trim() ?? "";
    if (!name) return Response.json({ error: "กรุณากรอกชื่อระบบ" }, { status: 400 });

    const allowedPlans = new Set(["trial", "pro", "business"]);
    const plan = allowedPlans.has(payload.plan ?? "") ? payload.plan! : "trial";
    const db = getDb();
    const [workspace] = await db.insert(workspaces).values({
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      name,
      systemCode: `MCB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      customerName: payload.customerName?.trim() ?? "",
      customerEmail: payload.customerEmail?.trim() ?? "",
      plan,
    }).returning();
    return Response.json({ workspace: { ...workspace, botCount: 0, channelCount: 0, unreadCount: 0 } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
