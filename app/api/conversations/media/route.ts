import { and, eq } from "drizzle-orm";
import { getMerchantUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { channelAccounts, conversations, messages } from "@/db/schema";
import { getPublicOrigin } from "@/lib/public-origin";
import { uploadToCloudinary } from "@/lib/cloudinary";

const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(request: Request) {
  try {
    const user = await getMerchantUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const formData = await request.formData();
    const conversationId = String(formData.get("conversationId") ?? "").trim();
    const file = formData.get("file");
    if (!conversationId || !(file instanceof File)) return Response.json({ error: "กรุณาเลือกรูปภาพ" }, { status: 400 });
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) return Response.json({ error: "รองรับเฉพาะไฟล์ JPG หรือ PNG" }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return Response.json({ error: "รูปภาพต้องมีขนาดไม่เกิน 1 MB" }, { status: 400 });

    const db = getDb();
    const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.ownerUserId, user.id))).limit(1);
    if (!conversation) return Response.json({ error: "ไม่พบบทสนทนา" }, { status: 404 });
    const [account] = await db.select({ id: channelAccounts.id }).from(channelAccounts).where(and(eq(channelAccounts.id, conversation.channelAccountId), eq(channelAccounts.ownerUserId, user.id))).limit(1);
    if (!account) return Response.json({ error: "ไม่พบบัญชีช่องทาง" }, { status: 404 });

    const id = crypto.randomUUID();
    const bytes = await file.arrayBuffer();
    const cloudinaryAsset = await uploadToCloudinary({
      ownerUserId: user.id,
      workspaceId: conversation.workspaceId,
      category: "conversation-media",
      assetId: id,
      fileName: file.name,
      bytes,
      contentType: file.type,
    });
    const now = new Date().toISOString();
    await db.insert(messages).values({
      id,
      ownerUserId: user.id,
      conversationId,
      direction: "outbound",
      senderType: "admin",
      senderName: user.displayName,
      content: "[รูปภาพ]",
      messageType: "image",
      mediaKey: "",
      mediaContentType: file.type,
      cloudinaryPublicId: cloudinaryAsset?.publicId ?? "",
      cloudinaryUrl: cloudinaryAsset?.secureUrl ?? "",
      cloudinaryResourceType: cloudinaryAsset?.resourceType ?? "",
      deliveryStatus: "draft",
      createdAt: now,
    });
    return Response.json({ mediaId: id, mediaUrl: cloudinaryAsset?.secureUrl || `${getPublicOrigin(request)}/api/conversations/media/${id}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ" }, { status: 500 });
  }
}
