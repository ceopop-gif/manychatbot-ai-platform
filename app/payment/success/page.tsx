import { Check, LayoutDashboard } from "lucide-react";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-[#f1fff6] p-4"><section className="w-full max-w-lg rounded-[30px] border border-[#bce4ca] bg-white p-8 text-center shadow-xl"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#06C755] text-white"><Check className="size-8" /></span><h1 className="mt-6 text-3xl font-black text-[#102218]">รับข้อมูลการชำระแล้ว</h1><p className="mt-3 leading-7 text-slate-500">ระบบกำลังตรวจสอบสถานะยืนยันจาก ChatPOS ผ่าน Webhook</p>{reference && <p className="mt-4 rounded-xl bg-slate-50 p-3 font-mono text-sm font-bold text-slate-600">{reference}</p>}<a href="/admin" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#102218] px-5 font-black text-white"><LayoutDashboard className="size-5" /> กลับหลังบ้าน</a></section></main>;
}
