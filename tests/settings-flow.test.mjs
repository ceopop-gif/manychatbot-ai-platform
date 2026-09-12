import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const connections = await readFile(new URL("../components/adminoa/connections.tsx", import.meta.url), "utf8");
const dashboard = await readFile(new URL("../app/dashboard-client.tsx", import.meta.url), "utf8");
const dialog = await readFile(new URL("../components/ui/dialog.tsx", import.meta.url), "utf8");

test("LINE OA setup no longer requires a manually created chatbot", () => {
  assert.match(connections, /ระบบจะสร้างตัวรับข้อความสำหรับ LINE OA ให้อัตโนมัติ/);
  assert.match(connections, /fetch\("\/api\/chatbots"/);
  assert.match(connections, /chatbotId: resolvedBotId/);
  assert.doesNotMatch(connections, /disabled=\{!bots\.length \|\| hasLineAccount\}/);
  assert.match(connections, /Multi LINE OA/);
  assert.doesNotMatch(connections, /รับได้ 1 LINE OA/);
});

test("AI settings support create, edit and automatic connection testing", () => {
  assert.match(dashboard, /label: "ตั้งค่า AI"/);
  assert.match(connections, /function openEditProvider/);
  assert.match(connections, /action: "update"/);
  assert.match(connections, /บันทึกและทดสอบ AI/);
  assert.match(connections, /ความสร้างสรรค์ 0–100/);
  assert.match(connections, /ความยาวคำตอบ 100–4,000 Token/);
});

test("LINE settings provide a direct route to AI configuration", () => {
  assert.match(connections, /onOpenProviders/);
  assert.match(connections, /ยังไม่ได้ตั้งค่า AI/);
  assert.match(connections, /เชื่อม LINE OA ได้ก่อน แต่ต้องตั้งค่า AI/);
});

test("dashboard includes ChatPOS payment management", () => {
  assert.match(dashboard, /label: "ChatPOS Payment"/);
  assert.match(dashboard, /<PaymentsView/);
});


test("AI settings dialog remains usable on mobile screens", () => {
  assert.match(connections, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(connections, /overflow-y-auto overscroll-contain/);
  assert.match(connections, />ปิด<\/Button>/);
  assert.match(dialog, /size-11 touch-manipulation/);
  assert.match(dialog, /aria-label="ปิดหน้าต่าง"/);
});
