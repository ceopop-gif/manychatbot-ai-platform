import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { paymentOrders, paymentProfiles, workspaces } from "@/db/schema";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อระบบชำระเงินได้";
}

function safeProfile(profile: typeof paymentProfiles.$inferSelect | undefined) {
  if (!profile) return null;
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

async function ownedWorkspace(workspaceId: string, ownerUserId: string) {
  const db = getDb();
  const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, ownerUserId))).limit(1);
  return workspace;
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId")?.trim() ?? "";
    if (!workspaceId || !(await ownedWorkspace(workspaceId, user.id))) return Response.json({ error: "ไม่พบระบบลูกค้าที่เลือก" }, { status: 404 });
    const db = getDb();
    const [[profile], orders] = await Promise.all([
      db.select().from(paymentProfiles).where(and(eq(paymentProfiles.workspaceId, workspaceId), eq(paymentProfiles.ownerUserId, user.id))).limit(1),
      db.select().from(paymentOrders).where(and(eq(paymentOrders.workspaceId, workspaceId), eq(paymentOrders.ownerUserId, user.id))).orderBy(desc(paymentOrders.createdAt)).limit(100),
    ]);
    return Response.json({
      profile: safeProfile(profile),
      orders,
      summary: {
        pendingCount: orders.filter((item) => item.status === "pending").length,
        paidCount: orders.filter((item) => item.status === "paid").length,
        paidAmountSatang: orders.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amountSatang, 0),
      },
      webhookUrl: `${url.origin}/api/payments/chatpos/webhook`,
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
      workspaceId?: string;
      customerName?: string;
      customerPhone?: string;
      description?: string;
      amount?: number;
      expiresInMinutes?: number;
    };
    const workspaceId = payload.workspaceId?.trim() ?? "";
    const amount = Number(payload.amount);
    if (!workspaceId || !(await ownedWorkspace(workspaceId, user.id))) return Response.json({ error: "ไม่พบระบบลูกค้าที่เลือก" }, { status: 404 });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) return Response.json({ error: "ยอดชำระต้องมากกว่า 0 และไม่เกิน 50,000 บาทต่อรายการ" }, { status: 400 });
    const db = getDb();
    const [profile] = await db.select().from(paymentProfiles).where(and(eq(paymentProfiles.workspaceId, workspaceId), eq(paymentProfiles.ownerUserId, user.id))).limit(1);
    if (!profile || profile.status !== "active" || !profile.merchantId || !profile.webhookSecretEncrypted) {
      return Response.json({ error: "กรุณาเชื่อม ChatPOS ให้พร้อมก่อนสร้างลิงก์ชำระเงิน" }, { status: 422 });
    }

    const reference = `MCB-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const origin = new URL(request.url).origin;
    const checkout = new URL(profile.checkoutBaseUrl);
    checkout.searchParams.set("merchant_id", profile.merchantId);
    checkout.searchParams.set("reference", reference);
    checkout.searchParams.set("amount", amount.toFixed(2));
    checkout.searchParams.set("currency", "THB");
    checkout.searchParams.set("description", payload.description?.trim() || "ชำระผ่าน ChatMarathon");
    if (payload.customerName?.trim()) checkout.searchParams.set("customer_name", payload.customerName.trim());
    if (payload.customerPhone?.trim()) checkout.searchParams.set("customer_phone", payload.customerPhone.trim());
    checkout.searchParams.set("return_url", `${origin}/payment/success?reference=${encodeURIComponent(reference)}`);
    checkout.searchParams.set("cancel_url", `${origin}/payment/cancel?reference=${encodeURIComponent(reference)}`);
    checkout.searchParams.set("webhook_url", `${origin}/api/payments/chatpos/webhook`);
    checkout.searchParams.set("mode", profile.mode);
    const expiresInMinutes = Math.min(Math.max(Math.trunc(payload.expiresInMinutes ?? 30), 5), 1440);
    const [order] = await db.insert(paymentOrders).values({
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      workspaceId,
      reference,
      customerName: payload.customerName?.trim() ?? "",
      customerPhone: payload.customerPhone?.trim() ?? "",
      description: payload.description?.trim() || "ชำระผ่าน ChatMarathon",
      amountSatang: Math.round(amount * 100),
      checkoutUrl: checkout.toString(),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000).toISOString(),
    }).returning();
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as { id?: string; action?: "cancel" };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [current] = await db.select().from(paymentOrders).where(and(eq(paymentOrders.id, id), eq(paymentOrders.ownerUserId, user.id))).limit(1);
    if (!current) return Response.json({ error: "ไม่พบรายการชำระเงิน" }, { status: 404 });
    if (current.status !== "pending") return Response.json({ error: "ยกเลิกได้เฉพาะรายการที่รอชำระ" }, { status: 409 });
    const [order] = await db.update(paymentOrders).set({ status: "cancelled", updatedAt: new Date().toISOString() }).where(eq(paymentOrders.id, current.id)).returning();
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
