import { ArrowLeft, X } from "lucide-react";

export default async function PaymentCancelPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-lg rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-xl"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-900 text-white"><X className="size-8" /></span><h1 className="mt-6 text-3xl font-black">ยังไม่ได้ชำระเงิน</h1><p className="mt-3 leading-7 text-slate-500">รายการถูกปิดหรือย้อนกลับก่อนชำระ คุณสามารถเปิดลิงก์เดิมอีกครั้งได้หากรายการยังไม่หมดอายุ</p>{reference && <p className="mt-4 rounded-xl bg-slate-50 p-3 font-mono text-sm font-bold text-slate-600">{reference}</p>}<a href="/admin" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#06C755] px-5 font-black text-white"><ArrowLeft className="size-5" /> กลับหลังบ้าน</a></section></main>;
}
