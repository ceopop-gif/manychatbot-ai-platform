import { and, asc, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminProfiles, adminSkills, channelAccounts, conversations, messages, workspaces } from "@/db/schema";
import { decryptSecret } from "@/lib/secret-vault";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถโหลดบทสนทนาได้";
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId")?.trim() ?? "";
    const conversationId = url.searchParams.get("conversationId")?.trim() ?? "";
    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });

    const [items, admins, skills, accounts] = await Promise.all([
      db.select().from(conversations).where(and(eq(conversations.ownerUserId, user.id), eq(conversations.workspaceId, workspaceId))).orderBy(desc(conversations.lastMessageAt)).limit(200),
      db.select({ id: adminProfiles.id, name: adminProfiles.name, avatarId: adminProfiles.avatarId }).from(adminProfiles).where(and(eq(adminProfiles.ownerUserId, user.id), eq(adminProfiles.workspaceId, workspaceId))),
      db.select({ id: adminSkills.id, name: adminSkills.name }).from(adminSkills).where(and(eq(adminSkills.ownerUserId, user.id), eq(adminSkills.workspaceId, workspaceId))),
      db.select({ id: channelAccounts.id, accountName: channelAccounts.accountName }).from(channelAccounts).where(eq(channelAccounts.ownerUserId, user.id)),
    ]);
    const mapped = items.map((item) => ({
      ...item,
      adminName: admins.find((admin) => admin.id === item.assignedAdminId)?.name ?? "",
      adminAvatarId: admins.find((admin) => admin.id === item.assignedAdminId)?.avatarId ?? "",
      skillName: skills.find((skill) => skill.id === item.skillId)?.name ?? "",
      channelName: accounts.find((account) => account.id === item.channelAccountId)?.accountName ?? "",
    }));
    if (!conversationId) return Response.json({ conversations: mapped });
    const selected = mapped.find((item) => item.id === conversationId);
    if (!selected) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
    const thread = await db.select().from(messages).where(and(eq(messages.conversationId, conversationId), eq(messages.ownerUserId, user.id))).orderBy(asc(messages.createdAt)).limit(300);
    return Response.json({ conversation: selected, messages: thread });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as { conversationId?: string; content?: string };
    const conversationId = payload.conversationId?.trim() ?? "";
    const content = payload.content?.trim() ?? "";
    if (!conversationId || !content) return Response.json({ error: "กรุณาพิมพ์ข้อความ" }, { status: 400 });
    if (content.length > 5000) return Response.json({ error: "ข้อความยาวเกิน 5,000 ตัวอักษร" }, { status: 400 });

    const db = getDb();
    const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.ownerUserId, user.id))).limit(1);
    if (!conversation) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
    const [account] = await db.select().from(channelAccounts).where(and(eq(channelAccounts.id, conversation.channelAccountId), eq(channelAccounts.ownerUserId, user.id))).limit(1);
    if (!account) return Response.json({ error: "ไม่พบบัญชีช่องทาง" }, { status: 404 });

    let deliveryStatus = "sent";
    if (account.platform === "line") {
      const accessToken = await decryptSecret(account.accessTokenEncrypted);
      if (!accessToken) return Response.json({ error: "LINE OA ยังไม่มี Channel access token" }, { status: 422 });
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ to: conversation.externalUserId, messages: [{ type: "text", text: content }] }),
      });
      if (!response.ok) {
        deliveryStatus = "failed";
        const detail = await response.text().catch(() => "");
        throw new Error(`ส่งข้อความ LINE ไม่สำเร็จ ${detail.slice(0, 160)}`);
      }
    } else {
      return Response.json({ error: "การส่งจริงจากหลังบ้านในเวอร์ชันนี้รองรับ LINE OA" }, { status: 422 });
    }

    const now = new Date().toISOString();
    const [message] = await db.insert(messages).values({
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      conversationId,
      direction: "outbound",
      senderType: "admin",
      senderName: user.displayName,
      content,
      deliveryStatus,
    }).returning();
    await db.update(conversations).set({
      lastMessagePreview: content,
      lastMessageAt: now,
      updatedAt: now,
      unreadCount: 0,
      status: "open",
      aiEnabled: false,
      humanTakeover: true,
      humanAgentName: user.displayName,
    }).where(eq(conversations.id, conversationId));
    return Response.json({ message }, { status: 201 });
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
      status?: "open" | "pending" | "escalated" | "closed";
      assignedAdminId?: string | null;
      aiEnabled?: boolean;
      markRead?: boolean;
      takeover?: "claim" | "release";
    };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [current] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.ownerUserId, user.id))).limit(1);
    if (!current) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
    if (payload.assignedAdminId) {
      const [admin] = await db.select({ id: adminProfiles.id }).from(adminProfiles).where(and(eq(adminProfiles.id, payload.assignedAdminId), eq(adminProfiles.workspaceId, current.workspaceId), eq(adminProfiles.ownerUserId, user.id))).limit(1);
      if (!admin) return Response.json({ error: "ไม่พบ Admin ที่เลือก" }, { status: 404 });
    }
    const claiming = payload.takeover === "claim";
    const releasing = payload.takeover === "release";
    const nextAiEnabled = releasing ? true : claiming ? false : payload.aiEnabled ?? current.aiEnabled;
    const [conversation] = await db.update(conversations).set({
      status: releasing || claiming ? "open" : payload.status ?? current.status,
      assignedAdminId: releasing ? null : payload.assignedAdminId === undefined ? current.assignedAdminId : payload.assignedAdminId,
      skillId: releasing ? null : current.skillId,
      aiEnabled: nextAiEnabled,
      humanTakeover: releasing ? false : claiming ? true : payload.aiEnabled === true ? false : current.humanTakeover,
      humanAgentName: releasing ? "" : claiming ? user.displayName : payload.aiEnabled === true ? "" : current.humanAgentName,
      routingConfidence: releasing ? 0 : current.routingConfidence,
      routingReason: releasing ? "คืนบทสนทนาให้ AI Router วิเคราะห์คำถามถัดไป" : current.routingReason,
      unreadCount: payload.markRead ? 0 : current.unreadCount,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(conversations.id, id), eq(conversations.ownerUserId, user.id))).returning();
    return Response.json({ conversation });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
