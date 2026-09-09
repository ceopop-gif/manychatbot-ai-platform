import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminDocuments, adminProfiles, adminSkills } from "@/db/schema";
import { compileSkillMarkdown } from "@/lib/skill-markdown";

export async function recompileAdminSkills(ownerUserId: string, adminId: string) {
  const db = getDb();
  const [admin] = await db.select().from(adminProfiles).where(and(eq(adminProfiles.id, adminId), eq(adminProfiles.ownerUserId, ownerUserId))).limit(1);
  if (!admin) return 0;
  const [skills, documents] = await Promise.all([
    db.select().from(adminSkills).where(and(eq(adminSkills.adminId, adminId), eq(adminSkills.ownerUserId, ownerUserId))),
    db.select().from(adminDocuments).where(and(eq(adminDocuments.adminId, adminId), eq(adminDocuments.ownerUserId, ownerUserId))),
  ]);
  const now = new Date().toISOString();
  await Promise.all(skills.map(async (skill) => {
    const version = skill.version + 1;
    await db.update(adminSkills).set({
      compiledMarkdown: compileSkillMarkdown(admin, { ...skill, version }, documents),
      version,
      updatedAt: now,
    }).where(and(eq(adminSkills.id, skill.id), eq(adminSkills.ownerUserId, ownerUserId)));
  }));
  return skills.length;
}
