import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { conversations, messages, workspaces } from "@/db/schema";

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim() ?? "";
    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });

    const chats = await db.select().from(conversations).where(and(eq(conversations.ownerUserId, user.id), eq(conversations.workspaceId, workspaceId))).orderBy(desc(conversations.lastMessageAt)).limit(1000);
    const threadRows = await db
      .select({ message: messages })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(messages.ownerUserId, user.id), eq(conversations.workspaceId, workspaceId)))
      .orderBy(desc(messages.createdAt))
      .limit(5000);
    const thread = threadRows.map((row) => row.message);
    const today = bangkokDateKey(new Date());
    const todayMessages = thread.filter((message) => bangkokDateKey(new Date(message.createdAt)) === today);
    const inboundToday = todayMessages.filter((message) => message.direction === "inbound").length;
    const aiToday = todayMessages.filter((message) => message.senderType === "ai").length;
    const adminToday = todayMessages.filter((message) => message.senderType === "admin").length;
    const aiLatency = thread.filter((message) => message.senderType === "ai" && message.latencyMs > 0).map((message) => message.latencyMs);
    const aiConversations = new Set(thread.filter((message) => message.senderType === "ai").map((message) => message.conversationId));
    const activeChats = chats.filter((chat) => chat.status !== "closed");
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = bangkokDateKey(date);
      return {
        date: key,
        label: new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "Asia/Bangkok" }).format(date),
        inbound: thread.filter((message) => message.direction === "inbound" && bangkokDateKey(new Date(message.createdAt)) === key).length,
        ai: thread.filter((message) => message.senderType === "ai" && bangkokDateKey(new Date(message.createdAt)) === key).length,
      };
    });
    return Response.json({
      summary: {
        inboundToday,
        aiToday,
        adminToday,
        openConversations: activeChats.length,
        pendingConversations: chats.filter((chat) => chat.status === "pending" || chat.status === "escalated").length,
        humanHandoffConversations: chats.filter((chat) => chat.humanTakeover).length,
        aiResolutionRate: chats.length ? Math.round((aiConversations.size / chats.length) * 100) : 0,
        averageAiLatencyMs: aiLatency.length ? Math.round(aiLatency.reduce((sum, value) => sum + value, 0) / aiLatency.length) : 0,
      },
      days,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถสร้างรายงานได้";
    return Response.json({ error: message }, { status: 500 });
  }
}

function bangkokDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(date);
}
