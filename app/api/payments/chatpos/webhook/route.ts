import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { paymentOrders, paymentProfiles } from "@/db/schema";
import { normalizePaymentStatus, resolvePaymentStatus } from "@/lib/payment-status";
import { decryptSecret } from "@/lib/secret-vault";

const encoder = new TextEncoder();

function toHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalConstantTime(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function verifySignature(body: string, secret: string, received: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const normalized = received.replace(/^sha256=/i, "").trim().toLowerCase();
  return equalConstantTime(toHex(signed), normalized);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody) as { reference?: string; status?: string; transaction_id?: string; amount?: number; currency?: string };
    const reference = payload.reference?.trim() ?? "";
    if (!reference) return Response.json({ error: "missing_reference" }, { status: 400 });
    const db = getDb();
    const [order] = await db.select().from(paymentOrders).where(eq(paymentOrders.reference, reference)).limit(1);
    if (!order) return Response.json({ error: "order_not_found" }, { status: 404 });
    const [profile] = await db.select().from(paymentProfiles).where(eq(paymentProfiles.workspaceId, order.workspaceId)).limit(1);
    if (!profile?.webhookSecretEncrypted) return Response.json({ error: "payment_profile_not_ready" }, { status: 409 });
    const signature = request.headers.get("x-chatpos-signature") || request.headers.get("x-signature") || "";
    if (!signature || !(await verifySignature(rawBody, await decryptSecret(profile.webhookSecretEncrypted), signature))) {
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }
    if (payload.amount !== undefined && Math.round(Number(payload.amount) * 100) !== order.amountSatang) {
      return Response.json({ error: "amount_mismatch" }, { status: 409 });
    }
    if (payload.currency && payload.currency.trim().toUpperCase() !== order.currency.toUpperCase()) {
      return Response.json({ error: "currency_mismatch" }, { status: 409 });
    }
    const receivedStatus = normalizePaymentStatus(payload.status ?? "");
    if (!receivedStatus) return Response.json({ error: "unsupported_status" }, { status: 422 });
    const status = resolvePaymentStatus(order.status, receivedStatus);
    const transactionId = payload.transaction_id?.trim() ?? "";
    if (receivedStatus === "paid" && order.transactionId && transactionId && order.transactionId !== transactionId) {
      return Response.json({ error: "transaction_mismatch" }, { status: 409 });
    }
    if (status === order.status && !(!order.transactionId && transactionId)) {
      return Response.json({ received: true, reference: order.reference, status: order.status, ignored: true });
    }
    const now = new Date().toISOString();
    const [updated] = await db.update(paymentOrders).set({
      status,
      transactionId: order.transactionId || transactionId,
      paidAt: status === "paid" ? order.paidAt || now : order.paidAt,
      updatedAt: now,
    }).where(eq(paymentOrders.id, order.id)).returning();
    return Response.json({ received: true, reference: updated.reference, status: updated.status });
  } catch {
    return Response.json({ error: "invalid_webhook" }, { status: 400 });
  }
}
