import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatMarathon | หลาย LINE OA + AI + ChatPOS",
  description: "หลังบ้านรวมหลาย LINE OA และ Admin AI พร้อมกล่องข้อความกลาง ระบบ Skill Router และลิงก์รับชำระเงินผ่าน ChatPOS",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body className="antialiased">{children}</body></html>;
}
