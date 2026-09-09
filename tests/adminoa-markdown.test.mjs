import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

after(async () => {
  await vite.close();
});

function createTextPdfFile(text) {
  const stream = `BT\n/F1 18 Tf\n72 720 Td\n(${text}) Tj\nET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new File([pdf], "knowledge.pdf", { type: "application/pdf" });
}

test("accepts only Markdown and PDF knowledge files", async () => {
  const { adminDocumentType, maxFileBytes, MAX_PDF_FILE_BYTES } = await vite.ssrLoadModule("/lib/admin-document-limits.ts");
  assert.equal(adminDocumentType("faq.md"), "markdown");
  assert.equal(adminDocumentType("policy.PDF"), "pdf");
  assert.equal(adminDocumentType("notes.txt"), null);
  assert.equal(maxFileBytes("pdf"), MAX_PDF_FILE_BYTES);
});

test("extracts searchable PDF text as employee knowledge", async () => {
  const { extractPdfKnowledge } = await vite.ssrLoadModule("/lib/pdf-text-extractor.ts");
  const result = await extractPdfKnowledge(createTextPdfFile("Promotion knowledge PDF"));
  assert.equal(result.pageCount, 1);
  assert.equal(result.isTruncated, false);
  assert.match(result.content, /Promotion knowledge PDF/);
});

test("compiles every AI employee field together with the skill as Markdown", async () => {
  const { compileSkillMarkdown } = await vite.ssrLoadModule("/lib/skill-markdown.ts");
  const markdown = compileSkillMarkdown(
    {
      name: "Admin Bee",
      gender: "female",
      age: 32,
      avatarId: "avatar-04",
      role: "Promotion Specialist",
      department: "ฝ่ายขาย",
      description: "ดูแลโปรโมชันที่ยืนยันแล้ว",
      personality: "ร่าเริง ใจเย็น",
      customerTypingStyle: "ตอบสั้น ใช้คำลงท้ายค่ะ",
    },
    {
      name: "โปรโมชัน",
      objective: "แนะนำโปรที่ตรงความต้องการ",
      instructions: "ตรวจวันหมดอายุก่อนตอบ",
      knowledge: "โปร A ลด 10%",
      routingKeywords: "โปร, ส่วนลด",
      minimumConfidence: 80,
      tone: "เป็นกันเอง",
      escalationRules: "ไม่มีโปรในข้อมูลให้ส่งต่อ",
      prohibitedTopics: "ห้ามสร้างส่วนลดใหม่",
      version: 3,
    },
    [
      {
        fileName: "promotion-faq.md",
        fileType: "markdown",
        content: "# โปรเดือนนี้\n\nโปร A ใช้ได้ถึงวันที่ 30 กันยายน",
      },
      {
        fileName: "terms.pdf",
        fileType: "pdf",
        pageCount: 12,
        content: "## หน้า 4\nเงื่อนไขการใช้สิทธิ์สำหรับสมาชิก",
        isTruncated: true,
      },
    ],
  );

  for (const expected of [
    "format: adminoa-ai-skill",
    'admin_name: "Admin Bee"',
    "Admin Bee",
    "หญิง",
    "32 ปี",
    "avatar-04",
    "ร่าเริง ใจเย็น",
    "ตอบสั้น ใช้คำลงท้ายค่ะ",
    "โปร A ลด 10%",
    "employee_document_count: 2",
    "promotion-faq.md",
    "โปร A ใช้ได้ถึงวันที่ 30 กันยายน",
    "terms.pdf (PDF 12 หน้า)",
    "เงื่อนไขการใช้สิทธิ์สำหรับสมาชิก",
    "ระบบนำเข้าข้อความบางส่วน",
    "ความมั่นใจขั้นต่ำ: 80%",
    "ห้ามสร้างส่วนลดใหม่",
  ]) {
    assert.match(markdown, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
