import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdminOA | AI Router เลือก Admin ตาม Skill",
  description: "กล่องข้อความกลางสำหรับ LINE OA ที่วิเคราะห์คำถาม เลือก Admin AI ผู้เชี่ยวชาญตาม Skill และส่งต่อพนักงานจริงเมื่อ AI ตอบไม่ได้",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body className="antialiased">{children}</body></html>;
}
