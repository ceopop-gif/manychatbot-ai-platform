import { and, desc, eq } from "drizzle-orm";
import { getMerchantUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { smsOtpChallenges } from "@/db/schema";
import { isSameOriginRequest } from "@/lib/auth";
import { normalizeThaiMobile, requestOtp } from "@/lib/sms-up";

const OTP_TTL_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const user = await getMerchantUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = await request.json().catch(() => null) as { mobile?: string } | null;
    const mobile = normalizeThaiMobile(payload?.mobile ?? "");
    const db = getDb();
    const [latest] = await db.select().from(smsOtpChallenges)
      .where(and(eq(smsOtpChallenges.userId, user.id), eq(smsOtpChallenges.status, "pending")))
      .orderBy(desc(smsOtpChallenges.requestedAt))
      .limit(1);
    if (latest && Date.now() - new Date(latest.requestedAt).getTime() < REQUEST_COOLDOWN_MS) {
      return Response.json({ error: "กรุณารอ 60 วินาทีก่อนขอรหัสใหม่" }, { status: 429 });
    }

    const provider = await requestOtp(mobile);
    const now = new Date();
    await db.update(smsOtpChallenges).set({ status: "expired", updatedAt: now.toISOString() })
      .where(and(eq(smsOtpChallenges.userId, user.id), eq(smsOtpChallenges.status, "pending")));
    const [challenge] = await db.insert(smsOtpChallenges).values({
      id: crypto.randomUUID(),
      userId: user.id,
      phone: mobile,
      otpId: provider.otpId,
      referenceCode: provider.referenceCode,
      status: "pending",
      attempts: 0,
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
      updatedAt: now.toISOString(),
    }).returning({ id: smsOtpChallenges.id, referenceCode: smsOtpChallenges.referenceCode });
    return Response.json({ challengeId: challenge.id, referenceCode: challenge.referenceCode, expiresInSeconds: OTP_TTL_MS / 1000 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "ส่ง OTP ไม่สำเร็จ" }, { status: 400 });
  }
}
