import { eq } from "drizzle-orm";
import { authUsers } from "@/db/schema";
import { getDb } from "@/db";
import {
  createSession,
  hashPassword,
  isSameOriginRequest,
  isValidUsername,
  normalizeUsername,
  safeReturnPath,
  validatePassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });

  const payload = await request.json().catch(() => null) as {
    username?: string;
    password?: string;
    confirmPassword?: string;
    displayName?: string;
    email?: string;
    returnTo?: string;
  } | null;
  const username = normalizeUsername(payload?.username ?? "");
  const password = payload?.password ?? "";
  const displayName = payload?.displayName?.trim() ?? "";
  const email = payload?.email?.trim().toLowerCase() ?? "";

  if (!isValidUsername(username)) {
    return Response.json({ error: "ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–32 ตัวอักษร และต้องขึ้นต้นด้วยตัวอักษรหรือตัวเลข" }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) return Response.json({ error: passwordError }, { status: 400 });
  if (password !== (payload?.confirmPassword ?? "")) return Response.json({ error: "ยืนยันรหัสผ่านไม่ตรงกัน" }, { status: 400 });
  if (displayName.length > 100) return Response.json({ error: "ชื่อผู้ใช้แสดงต้องไม่เกิน 100 ตัวอักษร" }, { status: 400 });
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return Response.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });

  const db = getDb();
  const existing = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.username, username)).limit(1);
  if (existing.length > 0) return Response.json({ error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" }, { status: 409 });

  try {
    const [user] = await db.insert(authUsers).values({
      id: crypto.randomUUID(),
      username,
      displayName: displayName || username,
      email,
      passwordHash: await hashPassword(password),
    }).returning({ id: authUsers.id, username: authUsers.username, displayName: authUsers.displayName });
    await createSession(user.id);
    return Response.json({ user, returnTo: safeReturnPath(payload?.returnTo ?? "/signup") }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return Response.json({ error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" }, { status: 409 });
    }
    throw error;
  }
}
