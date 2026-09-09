import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminDocuments, adminProfiles, adminSkills, workspaces } from "@/db/schema";
import { recompileAdminSkills } from "@/lib/recompile-admin-skills";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถบันทึก Admin ได้";
}

async function ownsWorkspace(ownerUserId: string, workspaceId: string) {
  const [workspace] = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, ownerUserId)))
    .limit(1);
  return Boolean(workspace);
}

function genderValue(value: unknown, fallback = "unspecified") {
  return value === "female" || value === "male" || value === "nonbinary" || value === "unspecified" ? value : fallback;
}

function ageValue(value: unknown, fallback = 28) {
  const age = typeof value === "number" ? value : Number(value);
  return Number.isFinite(age) ? Math.max(18, Math.min(100, Math.round(age))) : fallback;
}

function avatarValue(value: unknown, fallback = "avatar-01") {
  return typeof value === "string" && /^avatar-(0[1-9]|10)$/.test(value) ? value : fallback;
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim() ?? "";
    if (!workspaceId || !(await ownsWorkspace(user.id, workspaceId))) {
      return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });
    }
    const db = getDb();
    const [admins, skills, documents] = await Promise.all([
      db.select().from(adminProfiles).where(and(eq(adminProfiles.ownerUserId, user.id), eq(adminProfiles.workspaceId, workspaceId))).orderBy(desc(adminProfiles.createdAt)),
      db.select({ id: adminSkills.id, adminId: adminSkills.adminId, name: adminSkills.name, status: adminSkills.status, version: adminSkills.version }).from(adminSkills).where(and(eq(adminSkills.ownerUserId, user.id), eq(adminSkills.workspaceId, workspaceId))),
      db.select({ adminId: adminDocuments.adminId }).from(adminDocuments).where(and(eq(adminDocuments.ownerUserId, user.id), eq(adminDocuments.workspaceId, workspaceId))),
    ]);
    return Response.json({
      admins: admins.map((admin) => ({
        ...admin,
        skills: skills.filter((skill) => skill.adminId === admin.id),
        activeSkillCount: skills.filter((skill) => skill.adminId === admin.id && skill.status === "active").length,
        documentCount: documents.filter((document) => document.adminId === admin.id).length,
      })),
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      workspaceId?: string;
      name?: string;
      gender?: string;
      age?: number;
      avatarId?: string;
      role?: string;
      department?: string;
      description?: string;
      personality?: string;
      customerTypingStyle?: string;
      color?: string;
      isFallback?: boolean;
    };
    const workspaceId = payload.workspaceId?.trim() ?? "";
    const name = payload.name?.trim() ?? "";
    if (!workspaceId || !name) return Response.json({ error: "กรุณากรอกชื่อ Admin และเลือกระบบ" }, { status: 400 });
    if (!(await ownsWorkspace(user.id, workspaceId))) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });

    const db = getDb();
    const id = crypto.randomUUID();
    if (payload.isFallback) {
      await db.update(adminProfiles).set({ isFallback: false, updatedAt: new Date().toISOString() }).where(and(eq(adminProfiles.ownerUserId, user.id), eq(adminProfiles.workspaceId, workspaceId)));
    }
    const [admin] = await db.insert(adminProfiles).values({
      id,
      ownerUserId: user.id,
      workspaceId,
      name,
      gender: genderValue(payload.gender),
      age: ageValue(payload.age),
      avatarId: avatarValue(payload.avatarId),
      role: payload.role?.trim() || "AI Admin",
      department: payload.department?.trim() || "บริการลูกค้า",
      description: payload.description?.trim() ?? "",
      personality: payload.personality?.trim() ?? "",
      customerTypingStyle: payload.customerTypingStyle?.trim() ?? "",
      color: payload.color?.trim() || "cyan",
      isFallback: Boolean(payload.isFallback),
    }).returning();
    return Response.json({ admin: { ...admin, skills: [], activeSkillCount: 0, documentCount: 0 } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      id?: string;
      name?: string;
      gender?: string;
      age?: number;
      avatarId?: string;
      role?: string;
      department?: string;
      description?: string;
      personality?: string;
      customerTypingStyle?: string;
      color?: string;
      status?: string;
      isFallback?: boolean;
    };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [current] = await db.select().from(adminProfiles).where(and(eq(adminProfiles.id, id), eq(adminProfiles.ownerUserId, user.id))).limit(1);
    if (!current) return Response.json({ error: "ไม่พบ Admin" }, { status: 404 });
    if (payload.isFallback) {
      await db.update(adminProfiles).set({ isFallback: false, updatedAt: new Date().toISOString() }).where(and(eq(adminProfiles.ownerUserId, user.id), eq(adminProfiles.workspaceId, current.workspaceId)));
    }
    const [admin] = await db.update(adminProfiles).set({
      name: payload.name?.trim() || current.name,
      gender: genderValue(payload.gender, current.gender),
      age: ageValue(payload.age, current.age),
      avatarId: avatarValue(payload.avatarId, current.avatarId),
      role: payload.role?.trim() || current.role,
      department: payload.department?.trim() || current.department,
      description: payload.description?.trim() ?? current.description,
      personality: payload.personality?.trim() ?? current.personality,
      customerTypingStyle: payload.customerTypingStyle?.trim() ?? current.customerTypingStyle,
      color: payload.color?.trim() || current.color,
      status: payload.status === "inactive" ? "inactive" : payload.status === "active" ? "active" : current.status,
      isFallback: payload.isFallback ?? current.isFallback,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(adminProfiles.id, id), eq(adminProfiles.ownerUserId, user.id))).returning();

    const recompiledSkillCount = await recompileAdminSkills(user.id, id);
    return Response.json({ admin, recompiledSkillCount });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
