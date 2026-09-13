import { and, eq } from "drizzle-orm";
import { getMerchantUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { smsOtpChallenges } from "@/db/schema";
import { isSameOriginRequest } from "@/lib/auth";
import { resendOtp } from "@/lib/sms-up";

const OTP_TTL_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const user = await getMerchantUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = await request.json().catch(() => null) as { challengeId?: string } | null;
    const challengeId = payload?.challengeId?.trim() ?? "";
    if (!challengeId) return Response.json({ error: "ไม่พบรายการขอ OTP" }, { status: 400 });
    const db = getDb();
    const [challenge] = await db.select().from(smsOtpChallenges).where(and(
      eq(smsOtpChallenges.id, challengeId),
      eq(smsOtpChallenges.userId, user.id),
      eq(smsOtpChallenges.status, "pending"),
    )).limit(1);
    if (!challenge) return Response.json({ error: "OTP นี้ไม่พร้อมใช้งาน กรุณาขอรหัสใหม่" }, { status: 400 });
    if (Date.now() - new Date(challenge.requestedAt).getTime() < REQUEST_COOLDOWN_MS) {
      return Response.json({ error: "กรุณารอ 60 วินาทีก่อนส่ง OTP อีกครั้ง" }, { status: 429 });
    }
    const provider = await resendOtp(challenge.otpId);
    const now = new Date();
    await db.update(smsOtpChallenges).set({
      otpId: provider.otpId,
      referenceCode: provider.referenceCode,
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      updatedAt: now.toISOString(),
    }).where(eq(smsOtpChallenges.id, challenge.id));
    return Response.json({ challengeId: challenge.id, referenceCode: provider.referenceCode, expiresInSeconds: OTP_TTL_MS / 1000 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "ส่ง OTP ซ้ำไม่สำเร็จ" }, { status: 400 });
  }
}
