import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { paymentProfiles, workspaces } from "@/db/schema";
import { encryptSecret } from "@/lib/secret-vault";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถบันทึกการเชื่อมต่อ ChatPOS ได้";
}

function safeProfile(profile: typeof paymentProfiles.$inferSelect) {
  return {
    id: profile.id,
    workspaceId: profile.workspaceId,
    provider: profile.provider,
    merchantId: profile.merchantId,
    checkoutBaseUrl: profile.checkoutBaseUrl,
    mode: profile.mode,
    status: profile.status,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    hasWebhookSecret: Boolean(profile.webhookSecretEncrypted),
  };
}

function validCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "chatpospay.com" || url.hostname.endsWith(".chatpospay.com"));
  } catch {
    return false;
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      workspaceId?: string;
      merchantId?: string;
      checkoutBaseUrl?: string;
      webhookSecret?: string;
      mode?: "test" | "live";
    };
    const workspaceId = payload.workspaceId?.trim() ?? "";
    const merchantId = payload.merchantId?.trim() ?? "";
    const checkoutBaseUrl = (payload.checkoutBaseUrl?.trim() || "https://chatpospay.com").replace(/\/$/, "");
    const mode = payload.mode === "live" ? "live" : "test";
    if (!workspaceId || !merchantId) return Response.json({ error: "กรุณากรอก Merchant ID ของ ChatPOS" }, { status: 400 });
    if (!validCheckoutUrl(checkoutBaseUrl)) return Response.json({ error: "Checkout URL ต้องเป็นโดเมน chatpospay.com แบบ HTTPS" }, { status: 400 });

    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบลูกค้าที่เลือก" }, { status: 404 });
    const [current] = await db.select().from(paymentProfiles).where(and(eq(paymentProfiles.workspaceId, workspaceId), eq(paymentProfiles.ownerUserId, user.id))).limit(1);
    const webhookSecretEncrypted = payload.webhookSecret?.trim()
      ? await encryptSecret(payload.webhookSecret.trim())
      : current?.webhookSecretEncrypted ?? "";
    if (!webhookSecretEncrypted) return Response.json({ error: "กรุณากรอก Webhook Secret จาก ChatPOS" }, { status: 400 });

    const values = {
      merchantId,
      checkoutBaseUrl,
      webhookSecretEncrypted,
      mode,
      status: "active",
      updatedAt: new Date().toISOString(),
    };
    const [profile] = current
      ? await db.update(paymentProfiles).set(values).where(eq(paymentProfiles.id, current.id)).returning()
      : await db.insert(paymentProfiles).values({
        id: crypto.randomUUID(),
        ownerUserId: user.id,
        workspaceId,
        provider: "chatpos",
        ...values,
      }).returning();
    return Response.json({ profile: safeProfile(profile) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
