import { and, eq } from "drizzle-orm";
import { authUsers } from "@/db/schema";
import {
  consumeLoginAttempt,
  createSession,
  findAuthUser,
  getRequestRateLimitKey,
  getDummyPasswordHash,
  isSameOriginRequest,
  normalizeUsername,
  safeReturnPath,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/db";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });

  const payload = await request.json().catch(() => null) as { username?: string; password?: string; returnTo?: string } | null;
  const username = normalizeUsername(payload?.username ?? "");
  const password = payload?.password ?? "";
  const rate = consumeLoginAttempt(getRequestRateLimitKey(request, username));
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง" }), {
      status: 429,
      headers: { "content-type": "application/json; charset=utf-8", "retry-after": String(rate.retryAfterSeconds) },
    });
  }

  const user = username ? await findAuthUser(username) : null;
  const now = Date.now();
  const locked = user?.lockedUntil && new Date(user.lockedUntil).getTime() > now;
  const passwordHash = user?.passwordHash ?? await getDummyPasswordHash();
  const validPassword = await verifyPassword(password, passwordHash);

  if (!user || user.status !== "active" || locked || !validPassword) {
    if (user && !locked && !validPassword) {
      const failedLoginCount = user.failedLoginCount + 1;
      await getDb().update(authUsers).set({
        failedLoginCount,
        lockedUntil: failedLoginCount >= MAX_FAILED_LOGINS ? new Date(now + LOCKOUT_MS).toISOString() : null,
        updatedAt: new Date().toISOString(),
      }).where(and(eq(authUsers.id, user.id), eq(authUsers.failedLoginCount, user.failedLoginCount)));
    }
    return Response.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  await getDb().update(authUsers).set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date().toISOString() }).where(eq(authUsers.id, user.id));
  await createSession(user.id);
  return Response.json({
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role === "admin" ? "admin" : "merchant" },
    returnTo: safeReturnPath(payload?.returnTo ?? "/admin"),
  });
}
