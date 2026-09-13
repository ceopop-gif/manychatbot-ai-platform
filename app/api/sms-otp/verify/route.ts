import { and, eq } from "drizzle-orm";
import { getMerchantUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { smsOtpChallenges } from "@/db/schema";
import { isSameOriginRequest } from "@/lib/auth";
import { verifyOtp } from "@/lib/sms-up";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const user = await getMerchantUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = await request.json().catch(() => null) as { challengeId?: string; otpCode?: string } | null;
    const challengeId = payload?.challengeId?.trim() ?? "";
    const otpCode = payload?.otpCode?.trim() ?? "";
    if (!challengeId || !/^[0-9]{4,8}$/.test(otpCode)) return Response.json({ error: "กรุณากรอกรหัส OTP ให้ถูกต้อง" }, { status: 400 });
    const db = getDb();
    const [challenge] = await db.select().from(smsOtpChallenges).where(and(
      eq(smsOtpChallenges.id, challengeId),
      eq(smsOtpChallenges.userId, user.id),
      eq(smsOtpChallenges.status, "pending"),
    )).limit(1);
    if (!challenge) return Response.json({ error: "OTP นี้ไม่พร้อมใช้งาน กรุณาขอรหัสใหม่" }, { status: 400 });
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      await db.update(smsOtpChallenges).set({ status: "expired", updatedAt: new Date().toISOString() }).where(eq(smsOtpChallenges.id, challenge.id));
      return Response.json({ error: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่" }, { status: 400 });
    }
    if (challenge.attempts >= MAX_ATTEMPTS) return Response.json({ error: "กรอกรหัส OTP ผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่" }, { status: 429 });

    const result = await verifyOtp(challenge.otpId, otpCode);
    if (!result.result) {
      const attempts = challenge.attempts + 1;
      const locked = Boolean(result.isErrorCount) || attempts >= MAX_ATTEMPTS;
      const expired = Boolean(result.isExprCode);
      await db.update(smsOtpChallenges).set({ status: locked || expired ? (expired ? "expired" : "locked") : "pending", attempts, updatedAt: new Date().toISOString() }).where(eq(smsOtpChallenges.id, challenge.id));
      return Response.json({ error: expired ? "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่" : locked ? "กรอกรหัส OTP ผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่" : `รหัส OTP ไม่ถูกต้อง เหลือโอกาสอีก ${MAX_ATTEMPTS - attempts} ครั้ง` }, { status: locked ? 429 : 400 });
    }

    await db.update(smsOtpChallenges).set({ status: "verified", verifiedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(smsOtpChallenges.id, challenge.id));
    return Response.json({ verified: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "ยืนยัน OTP ไม่สำเร็จ" }, { status: 400 });
  }
}
