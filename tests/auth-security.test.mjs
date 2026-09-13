import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const auth = await readFile(new URL("../lib/auth.ts", import.meta.url), "utf8");
const login = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
const register = await readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../drizzle-pg/0001_wakeful_blackheart.sql", import.meta.url), "utf8");
const adapter = await readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8");


test("password auth uses salted scrypt and constant-time verification", () => {
  assert.match(auth, /scrypt\$/);
  assert.match(auth, /randomBytes\(16\)/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /PASSWORD_MIN_LENGTH = 8/);
  assert.doesNotMatch(auth, /passwordHash\s*:\s*password/);
});

test("sessions use hashed random tokens and hardened cookies", () => {
  assert.match(auth, /randomBytes\(32\)/);
  assert.match(auth, /hashSessionToken\(rawToken\)/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /sameSite: "strict"/);
  assert.match(auth, /maxAge: SESSION_TTL_MS \/ 1000/);
  assert.match(auth, /cookieStore\.delete\(SESSION_COOKIE\)/);
});

test("login and registration protect browser requests and avoid auth enumeration", () => {
  assert.match(login, /isSameOriginRequest\(request\)/);
  assert.match(login, /ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง/);
  assert.match(login, /MAX_FAILED_LOGINS = 5/);
  assert.match(login, /consumeLoginAttempt/);
  assert.match(register, /validatePassword/);
  assert.match(register, /idx_auth_users_username|authUsers\.username/);
});

test("auth migration creates only hashed-session and account primitives", () => {
  assert.match(migration, /CREATE TABLE "auth_users"/);
  assert.match(migration, /CREATE TABLE "auth_sessions"/);
  assert.match(migration, /UNIQUE INDEX "idx_auth_users_username"/);
  assert.match(migration, /UNIQUE INDEX "idx_auth_sessions_token_hash"/);
});

test("legacy ChatGPT header authentication is no longer accepted", () => {
  assert.match(adapter, /getAppUser/);
  assert.doesNotMatch(adapter, /oai-authenticated-user/);
});
