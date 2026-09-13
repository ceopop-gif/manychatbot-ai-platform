import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { authUsers } from "@/db/schema";
import {
  getDefaultAdminPermissions,
  hasPlatformPermission,
  hashPassword,
  isSameOriginRequest,
  isValidUsername,
  normalizeAdminPermissions,
  normalizeAdminRole,
  normalizeUsername,
  type AdminRole,
  type PlatformPermission,
  validatePassword,
} from "@/lib/auth";

function publicAdmin(user: typeof authUsers.$inferSelect) {
  const role = normalizeAdminRole(user.adminRole);
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    adminRole: role,
    permissions: normalizeAdminPermissions(parsePermissions(user.permissions), role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function parsePermissions(value: unknown): unknown {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function permissionList(value: unknown, role: AdminRole): PlatformPermission[] {
  const permissions = normalizeAdminPermissions(value, role);
  return role === "owner" || permissions.includes("overview.view") ? permissions : ["overview.view", ...permissions];
}

async function currentAdmin() {
  const user = await getChatGPTUser();
  if (!user || !hasPlatformPermission(user, "users.manage")) return null;
  return user;
}

export async function GET() {
  const user = await currentAdmin();
  if (!user) return Response.json({ error: "ไม่มีสิทธิ์จัดการผู้ใช้แอดมิน" }, { status: 403 });
  const users = await getDb().select().from(authUsers).where(eq(authUsers.role, "admin")).orderBy(desc(authUsers.createdAt));
  return Response.json({ users: users.map(publicAdmin) });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const creator = await currentAdmin();
  if (!creator) return Response.json({ error: "ไม่มีสิทธิ์จัดการผู้ใช้แอดมิน" }, { status: 403 });
  try {
    const payload = await request.json().catch(() => null) as {
      username?: string;
      displayName?: string;
      email?: string;
      password?: string;
      adminRole?: string;
      permissions?: unknown;
    } | null;
    const username = normalizeUsername(payload?.username ?? "");
    const displayName = payload?.displayName?.trim() ?? "";
    const email = payload?.email?.trim().toLowerCase() ?? "";
    const password = payload?.password ?? "";
    const adminRole = normalizeAdminRole(payload?.adminRole);
    if (!isValidUsername(username)) return Response.json({ error: "Username ต้องเป็นภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–32 ตัว" }, { status: 400 });
    if (!displayName || displayName.length > 100) return Response.json({ error: "กรุณากรอกชื่อแอดมินไม่เกิน 100 ตัวอักษร" }, { status: 400 });
    if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return Response.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    const passwordError = validatePassword(password);
    if (passwordError) return Response.json({ error: passwordError }, { status: 400 });
    if (adminRole === "owner" && creator.adminRole !== "owner") return Response.json({ error: "เฉพาะ Owner เท่านั้นที่สร้าง Owner ได้" }, { status: 403 });
    const permissions = permissionList(payload?.permissions ?? getDefaultAdminPermissions(adminRole), adminRole);
    const db = getDb();
    const existing = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.username, username)).limit(1);
    if (existing.length) return Response.json({ error: "Username นี้ถูกใช้แล้ว" }, { status: 409 });
    const [created] = await db.insert(authUsers).values({
      id: crypto.randomUUID(),
      username,
      displayName,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
      adminRole,
      permissions: JSON.stringify(permissions),
      status: "active",
    }).returning();
    return Response.json({ user: publicAdmin(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") return Response.json({ error: "Username นี้ถูกใช้แล้ว" }, { status: 409 });
    return Response.json({ error: error instanceof Error ? error.message : "สร้างผู้ใช้แอดมินไม่สำเร็จ" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const creator = await currentAdmin();
  if (!creator) return Response.json({ error: "ไม่มีสิทธิ์จัดการผู้ใช้แอดมิน" }, { status: 403 });
  try {
    const payload = await request.json().catch(() => null) as {
      id?: string;
      displayName?: string;
      email?: string;
      adminRole?: string;
      permissions?: unknown;
      status?: string;
    } | null;
    const id = payload?.id?.trim() ?? "";
    if (!id) return Response.json({ error: "ไม่พบผู้ใช้แอดมิน" }, { status: 400 });
    const [target] = await getDb().select().from(authUsers).where(and(eq(authUsers.id, id), eq(authUsers.role, "admin"))).limit(1);
    if (!target) return Response.json({ error: "ไม่พบผู้ใช้แอดมิน" }, { status: 404 });
    const adminRole = normalizeAdminRole(payload?.adminRole ?? target.adminRole);
    const status = payload?.status === "suspended" ? "suspended" : "active";
    if (target.id === creator.id && (status !== "active" || adminRole !== "owner")) return Response.json({ error: "ไม่สามารถลดสิทธิ์หรือปิดบัญชีตัวเองได้" }, { status: 400 });
    if (adminRole === "owner" && creator.adminRole !== "owner") return Response.json({ error: "เฉพาะ Owner เท่านั้นที่กำหนด Owner ได้" }, { status: 403 });
    if (target.adminRole === "owner" && adminRole !== "owner") {
      const owners = await getDb().select({ id: authUsers.id }).from(authUsers).where(and(eq(authUsers.role, "admin"), eq(authUsers.adminRole, "owner"), eq(authUsers.status, "active")));
      if (owners.length <= 1) return Response.json({ error: "ต้องมี Owner ที่ใช้งานได้อย่างน้อย 1 บัญชี" }, { status: 400 });
    }
    const displayName = payload?.displayName?.trim() ?? target.displayName;
    const email = payload?.email?.trim().toLowerCase() ?? target.email;
    if (!displayName || displayName.length > 100) return Response.json({ error: "กรุณากรอกชื่อแอดมินไม่เกิน 100 ตัวอักษร" }, { status: 400 });
    if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return Response.json({ error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    const permissions = permissionList(payload?.permissions ?? parsePermissions(target.permissions) ?? getDefaultAdminPermissions(adminRole), adminRole);
    const [updated] = await getDb().update(authUsers).set({ displayName, email, adminRole, permissions: JSON.stringify(permissions), status, updatedAt: new Date().toISOString() }).where(eq(authUsers.id, target.id)).returning();
    return Response.json({ user: publicAdmin(updated) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "แก้ไขผู้ใช้แอดมินไม่สำเร็จ" }, { status: 500 });
  }
}
