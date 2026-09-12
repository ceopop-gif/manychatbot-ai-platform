export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded";

const paidAliases = new Set(["paid", "success", "completed"]);
const knownStatuses = new Set<PaymentStatus>(["pending", "paid", "failed", "cancelled", "expired", "refunded"]);

export function normalizePaymentStatus(value: string): PaymentStatus | null {
  const normalized = value.trim().toLowerCase();
  if (paidAliases.has(normalized)) return "paid";
  return knownStatuses.has(normalized as PaymentStatus) ? (normalized as PaymentStatus) : null;
}

export function resolvePaymentStatus(currentValue: string, received: PaymentStatus): PaymentStatus {
  const current = normalizePaymentStatus(currentValue) ?? "pending";

  // A refund is only meaningful after a confirmed payment, and a refund is final.
  if (current === "refunded") return "refunded";
  if (received === "refunded") return current === "paid" ? "refunded" : current;

  // Never let late pending/failure events downgrade money that was already confirmed.
  if (current === "paid") return "paid";

  // A confirmed payment may legitimately arrive after an earlier failure/expiry event.
  if (received === "paid") return "paid";
  if (current === "pending") return received;

  // Other terminal failure states do not replace one another on replay or reordering.
  return current;
}
