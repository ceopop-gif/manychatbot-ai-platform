import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessions, authUsers } from "@/db/schema";

const SESSION_COOKIE = "chatmarathon_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_SCRYPT = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const DUMMY_PASSWORD = "chatmarathon-invalid-password";
const DUMMY_HASH_PROMISE = hashPassword(DUMMY_PASSWORD);

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function normalizeUsername(value: string): string {
  return value.trim().normalize("NFKC").toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`;
  if (value.length > PASSWORD_MAX_LENGTH) return `รหัสผ่านต้องไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`;
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await deriveKey(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_SCRYPT);
  return `scrypt$${PASSWORD_SCRYPT.N}$${PASSWORD_SCRYPT.r}$${PASSWORD_SCRYPT.p}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nText, rText, pText, salt, encodedKey] = parts;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  const expectedKey = Buffer.from(encodedKey, "base64url");
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || expectedKey.length !== PASSWORD_KEY_LENGTH) return false;
  try {
    const derivedKey = await deriveKey(password, salt, expectedKey.length, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

export async function findAuthUser(username: string) {
  const [user] = await getDb().select().from(authUsers).where(eq(authUsers.username, username)).limit(1);
  return user ?? null;
}

export async function createSession(userId: string): Promise<void> {
  const rawToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  const db = getDb();
  await db.delete(authSessions).where(and(eq(authSessions.userId, userId), lt(authSessions.expiresAt, now.toISOString())));
  await db.insert(authSessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashSessionToken(rawToken),
    expiresAt,
    lastSeenAt: now.toISOString(),
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) await getDb().delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(rawToken)));
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAppUser(): Promise<AuthUser | null> {
  const requestHeaders = await headers();
  if (isUnsafeCrossOriginRequest(requestHeaders)) return null;
  const rawToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!rawToken || !/^[A-Za-z0-9_-]{43}$/.test(rawToken)) return null;

  const [record] = await getDb()
    .select({
      userId: authUsers.id,
      displayName: authUsers.displayName,
      email: authUsers.email,
      username: authUsers.username,
      status: authUsers.status,
      expiresAt: authSessions.expiresAt,
      lastSeenAt: authSessions.lastSeenAt,
    })
    .from(authSessions)
    .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
    .where(eq(authSessions.tokenHash, hashSessionToken(rawToken)))
    .limit(1);

  if (!record || record.status !== "active") return null;
  const now = new Date();
  if (new Date(record.expiresAt).getTime() <= now.getTime()) {
    await getDb().delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(rawToken)));
    return null;
  }
  if (now.getTime() - new Date(record.lastSeenAt).getTime() > 5 * 60 * 1000) {
    await getDb().update(authSessions).set({ lastSeenAt: now.toISOString() }).where(eq(authSessions.tokenHash, hashSessionToken(rawToken)));
  }
  return { id: record.userId, displayName: record.displayName, email: record.email, fullName: record.displayName };
}

export function loginPath(returnTo = "/admin"): string {
  return `/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function registerPath(returnTo = "/signup"): string {
  return `/register?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  try {
    const url = new URL(value, "https://chatmarathon.local");
    return url.origin === "https://chatmarathon.local" ? `${url.pathname}${url.search}${url.hash}` : "/admin";
  } catch {
    return "/admin";
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function consumeLoginAttempt(key: string, limit = 10, windowMs = 15 * 60 * 1000): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count > limit) return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  return { allowed: true, retryAfterSeconds: 0 };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getRequestRateLimitKey(request: Request, username: string): string {
  const ip = request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
  return `${ip}:${username}`;
}

async function getDummyPasswordHash(): Promise<string> {
  return DUMMY_HASH_PROMISE;
}

function isUnsafeCrossOriginRequest(requestHeaders: Headers): boolean {
  const origin = requestHeaders.get("origin");
  if (!origin) return false;
  const host = requestHeaders.get("host");
  try {
    return !host || new URL(origin).host !== host;
  } catch {
    return true;
  }
}

function deriveKey(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export { getDummyPasswordHash };
