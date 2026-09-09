import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminDocuments, adminProfiles, adminSkills, workspaces } from "@/db/schema";
import { compileSkillMarkdown } from "@/lib/skill-markdown";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถบันทึก Skill ได้";
}

function confidenceValue(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(50, Math.min(95, Math.round(number))) : fallback;
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim() ?? "";
    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });
    const [skills, admins] = await Promise.all([
      db.select().from(adminSkills).where(and(eq(adminSkills.ownerUserId, user.id), eq(adminSkills.workspaceId, workspaceId))).orderBy(desc(adminSkills.updatedAt)),
      db.select().from(adminProfiles).where(and(eq(adminProfiles.ownerUserId, user.id), eq(adminProfiles.workspaceId, workspaceId))),
    ]);
    return Response.json({
      skills: skills.map((skill) => {
        const admin = admins.find((item) => item.id === skill.adminId);
        const { compiledMarkdown, ...safeSkill } = skill;
        return {
          ...safeSkill,
          adminName: admin?.name ?? "ไม่พบ Admin",
          hasCompiledMarkdown: Boolean(compiledMarkdown || admin),
        };
      }),
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
      adminId?: string;
      name?: string;
      objective?: string;
      instructions?: string;
      knowledge?: string;
      routingKeywords?: string;
      minimumConfidence?: number;
      tone?: string;
      escalationRules?: string;
      prohibitedTopics?: string;
    };
    const workspaceId = payload.workspaceId?.trim() ?? "";
    const adminId = payload.adminId?.trim() ?? "";
    const name = payload.name?.trim() ?? "";
    const instructions = payload.instructions?.trim() ?? "";
    if (!workspaceId || !adminId || !name || !instructions) {
      return Response.json({ error: "กรุณาเลือก Admin และกรอกชื่อกับวิธีตอบของ Skill" }, { status: 400 });
    }
    const db = getDb();
    const [admin] = await db.select().from(adminProfiles).where(and(eq(adminProfiles.id, adminId), eq(adminProfiles.workspaceId, workspaceId), eq(adminProfiles.ownerUserId, user.id))).limit(1);
    if (!admin) return Response.json({ error: "ไม่พบ Admin ที่เลือก" }, { status: 404 });
    const documents = await db.select().from(adminDocuments).where(and(eq(adminDocuments.adminId, adminId), eq(adminDocuments.ownerUserId, user.id)));
    const skillValues = {
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      workspaceId,
      adminId,
      name,
      objective: payload.objective?.trim() ?? "",
      instructions,
      knowledge: payload.knowledge?.trim() ?? "",
      routingKeywords: payload.routingKeywords?.trim() ?? "",
      minimumConfidence: confidenceValue(payload.minimumConfidence, 70),
      tone: payload.tone?.trim() || "สุภาพ กระชับ เป็นมืออาชีพ",
      escalationRules: payload.escalationRules?.trim() ?? "",
      prohibitedTopics: payload.prohibitedTopics?.trim() ?? "",
      version: 1,
    };
    const [skill] = await db.insert(adminSkills).values({
      ...skillValues,
      compiledMarkdown: compileSkillMarkdown(admin, skillValues, documents),
    }).returning();
    return Response.json({ skill: { ...skill, adminName: admin.name } }, { status: 201 });
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
      objective?: string;
      instructions?: string;
      knowledge?: string;
      routingKeywords?: string;
      minimumConfidence?: number;
      tone?: string;
      escalationRules?: string;
      prohibitedTopics?: string;
      status?: string;
    };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [current] = await db.select().from(adminSkills).where(and(eq(adminSkills.id, id), eq(adminSkills.ownerUserId, user.id))).limit(1);
    if (!current) return Response.json({ error: "ไม่พบ Skill" }, { status: 404 });
    const [admin] = await db.select().from(adminProfiles).where(and(eq(adminProfiles.id, current.adminId), eq(adminProfiles.ownerUserId, user.id))).limit(1);
    if (!admin) return Response.json({ error: "ไม่พบ Admin เจ้าของ Skill" }, { status: 404 });
    const documents = await db.select().from(adminDocuments).where(and(eq(adminDocuments.adminId, current.adminId), eq(adminDocuments.ownerUserId, user.id)));
    const nextVersion = current.version + 1;
    const nextSkill = {
      name: payload.name?.trim() || current.name,
      objective: payload.objective?.trim() ?? current.objective,
      instructions: payload.instructions?.trim() || current.instructions,
      knowledge: payload.knowledge?.trim() ?? current.knowledge,
      routingKeywords: payload.routingKeywords?.trim() ?? current.routingKeywords,
      minimumConfidence: confidenceValue(payload.minimumConfidence, current.minimumConfidence),
      tone: payload.tone?.trim() || current.tone,
      escalationRules: payload.escalationRules?.trim() ?? current.escalationRules,
      prohibitedTopics: payload.prohibitedTopics?.trim() ?? current.prohibitedTopics,
      status: payload.status === "inactive" ? "inactive" : payload.status === "active" ? "active" : current.status,
      version: nextVersion,
    };
    const [skill] = await db.update(adminSkills).set({
      ...nextSkill,
      compiledMarkdown: compileSkillMarkdown(admin, nextSkill, documents),
      updatedAt: new Date().toISOString(),
    }).where(and(eq(adminSkills.id, id), eq(adminSkills.ownerUserId, user.id))).returning();
    return Response.json({ skill });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
