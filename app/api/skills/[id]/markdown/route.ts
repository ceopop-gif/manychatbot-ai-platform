import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminDocuments, adminProfiles, adminSkills } from "@/db/schema";
import { compileSkillMarkdown } from "@/lib/skill-markdown";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await context.params;
  const db = getDb();
  const [skill] = await db.select().from(adminSkills).where(and(eq(adminSkills.id, id), eq(adminSkills.ownerUserId, user.id))).limit(1);
  if (!skill) return Response.json({ error: "ไม่พบ Skill" }, { status: 404 });
  const [admin] = await db.select().from(adminProfiles).where(and(eq(adminProfiles.id, skill.adminId), eq(adminProfiles.ownerUserId, user.id))).limit(1);
  if (!admin) return Response.json({ error: "ไม่พบ Admin เจ้าของ Skill" }, { status: 404 });
  const documents = await db.select().from(adminDocuments).where(and(eq(adminDocuments.adminId, admin.id), eq(adminDocuments.ownerUserId, user.id)));

  const markdown = compileSkillMarkdown(admin, skill, documents);
  const filename = `adminoa-skill-${skill.id.slice(0, 8)}.md`;
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
