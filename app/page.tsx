import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  FileText,
  Headphones,
  Layers3,
  LogIn,
  MessageCircle,
  MessagesSquare,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Webhook,
} from "lucide-react";
import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

const features = [
  { icon: Layers3, title: "หลายธุรกิจในหลังบ้านเดียว", detail: "สร้างระบบลูกค้าได้หลายราย และแยกข้อมูล LINE OA, AI, Skill และประวัติแชตออกจากกัน" },
  { icon: MessagesSquare, title: "ต่อ LINE OA ได้หลายบัญชี", detail: "แต่ละธุรกิจเพิ่ม LINE OA ได้หลายบัญชี พร้อม Webhook และสถานะการเชื่อมต่อของแต่ละบัญชี" },
  { icon: BrainCircuit, title: "AI Router เลือกผู้เชี่ยวชาญ", detail: "วิเคราะห์คำถามแล้วส่งให้ Admin AI ที่มี Skill ตรงเรื่อง พร้อมส่งต่อพนักงานจริงเมื่อจำเป็น" },
  { icon: FileText, title: "สอน AI ด้วย .MD และ .PDF", detail: "เพิ่มคู่มือสินค้า บริการ นโยบาย และคำตอบของธุรกิจเป็นคลังความรู้เฉพาะแต่ละ Admin" },
  { icon: Headphones, title: "กล่องข้อความกลาง", detail: "ติดตามลูกค้า ข้อความที่ยังไม่ได้อ่าน สถานะ AI และงานที่ต้องให้พนักงานเข้ารับช่วงต่อ" },
  { icon: WalletCards, title: "ชำระเงินผ่าน ChatPOS", detail: "สร้างลิงก์รับเงิน ส่งกลับใน LINE OA และติดตามสถานะรอชำระหรือชำระสำเร็จจาก Webhook" },
];

export default async function HomePage() {
  const user = await getChatGPTUser();
  const dashboardHref = user ? "/admin" : chatGPTSignInPath("/admin");
  const signupHref = user ? "/signup" : chatGPTSignInPath("/signup");

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#102218]">
      <header className="sticky top-0 z-40 border-b border-[#dce9e1] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center px-2 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-2 sm:gap-3" aria-label="ChatMarathon หน้าแรก">
            <span className="relative flex size-11 items-center justify-center rounded-[15px] bg-[#06C755] text-white shadow-lg shadow-[#06C755]/20"><Bot className="size-6" /><span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-[#102218]" /></span>
            <span><strong className="block text-base font-black tracking-tight sm:text-lg">ChatMarathon</strong><span className="hidden text-xs font-black tracking-[.16em] text-[#00A843] sm:block">MULTI LINE OA + AI</span></span>
          </a>
          <nav className="ml-auto hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex"><a href="#how" className="hover:text-[#00A843]">เริ่มใช้งาน</a><a href="#features" className="hover:text-[#00A843]">ความสามารถ</a><a href="#chatpos" className="hover:text-[#00A843]">ChatPOS</a></nav>
          <div className="ml-auto flex items-center gap-2 md:ml-8">
            <a href={dashboardHref} target="_top" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#9edbb6] bg-white px-2 py-2.5 text-sm font-black text-[#008C39] transition hover:bg-[#edfff4] sm:px-4">
              <LogIn className="size-4" />
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              <span className="sm:hidden">Login</span>
            </a>
            <a href={signupHref} target="_top" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#06C755] px-2 py-2.5 text-sm font-black text-white shadow-lg shadow-[#06C755]/20 transition hover:bg-[#05b84e] sm:px-4">
              <span className="sm:hidden">สมัคร</span><span className="hidden sm:inline">สมัครใช้งาน</span> <ArrowRight className="hidden size-4 sm:block" />
            </a>
          </div>
        </div>
      </header>

      <section id="top" className="relative border-b border-[#dce9e1] bg-[radial-gradient(circle_at_85%_20%,#cffff0_0,transparent_35%),linear-gradient(180deg,#f7fffa_0%,#ffffff_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#a8ebc4] bg-white px-3 py-1.5 text-xs font-black text-[#008C39] shadow-sm"><Sparkles className="size-4" /> หลังบ้านเดียว ดูแล LINE OA ได้ทุกบัญชี</div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.15] tracking-[-.04em] text-[#102218] sm:text-5xl lg:text-[4rem]">สร้างทีมแอดมิน AI<br /><span className="text-[#06C755]">ให้ทุก LINE OA</span> ของคุณ</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">รับข้อความจากหลายบัญชี วิเคราะห์คำถาม เลือก AI ที่ตรงกับงาน และสร้างลิงก์ชำระเงินผ่าน ChatPOS — จัดการครบในระบบเดียว</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={signupHref} target="_top" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#06C755] px-7 text-base font-black text-white shadow-xl shadow-[#06C755]/25 transition hover:-translate-y-0.5 hover:bg-[#05b84e]">เริ่มสร้างระบบของคุณ <ArrowRight className="size-5" /></a>
              <a href={dashboardHref} target="_top" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#06C755] bg-white px-7 text-base font-black text-[#008C39] transition hover:-translate-y-0.5 hover:bg-[#effff5]"><LogIn className="size-5" /> เข้าสู่ระบบ</a>
            </div>
            <a href="#how" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#176438] hover:text-[#00A843]">ดูขั้นตอนการทำงาน <ChevronRight className="size-4" /></a>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-600">{["แยกข้อมูลแต่ละธุรกิจ", "Token เก็บแบบเข้ารหัส", "รองรับมือถือและคอมพิวเตอร์"].map((item) => <span key={item} className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#dff9e9] text-[#00A843]"><Check className="size-3.5" /></span>{item}</span>)}</div>
          </div>

          <div className="relative mx-auto w-full max-w-[590px]">
            <div className="absolute -inset-5 rounded-[42px] bg-[#06C755]/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-[#b9dfc8] bg-[#0d2116] p-3 shadow-2xl shadow-[#10321d]/20 sm:p-4">
              <div className="flex items-center gap-2 px-2 pb-3 text-white"><span className="size-2.5 rounded-full bg-[#06C755]" /><span className="text-xs font-black">ระบบกำลังทำงาน</span><span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">3 LINE OA พร้อม</span></div>
              <div className="overflow-hidden rounded-[22px] bg-[#f3f7f5]">
                <div className="flex items-center border-b border-slate-200 bg-white px-4 py-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#06C755] text-white"><MessageCircle className="size-5" /></span><div className="ml-3"><p className="text-sm font-black">กล่องข้อความรวม</p><p className="text-xs font-semibold text-slate-400">LINE OA · ฝ่ายขาย</p></div><span className="ml-auto rounded-full bg-[#e0faea] px-2.5 py-1 text-xs font-black text-[#008C39]">AI ตอบอัตโนมัติ</span></div>
                <div className="grid min-h-[360px] sm:grid-cols-[.78fr_1.22fr]">
                  <div className="hidden border-r border-slate-200 bg-white p-3 sm:block">{["สอบถามราคาแพ็กเกจ", "ติดตามสถานะชำระเงิน", "ขอคุยกับเจ้าหน้าที่"].map((name, index) => <div key={name} className={`mb-2 rounded-xl p-3 ${index === 0 ? "bg-[#e8faef]" : "bg-slate-50"}`}><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${index === 0 ? "bg-[#06C755]" : "bg-slate-300"}`} /><p className="text-xs font-black">{name}</p></div><p className="mt-1.5 truncate text-xs text-slate-400">LINE OA #{index + 1} · เมื่อสักครู่</p></div>)}</div>
                  <div className="flex flex-col p-4"><div className="rounded-2xl rounded-tl-sm bg-white p-3 text-sm leading-6 shadow-sm">สนใจแพ็กเกจสำหรับ 3 สาขา และต้องการลิงก์ชำระเงินค่ะ</div><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-[#dff9e9] px-2.5 py-1 text-xs font-black text-[#008C39]">Skill: ฝ่ายขาย</span><span className="rounded-full bg-[#e8eefc] px-2.5 py-1 text-xs font-black text-indigo-700">AI Router 96%</span></div><div className="mt-3 ml-7 rounded-2xl rounded-tr-sm bg-[#06C755] p-3 text-sm leading-6 text-white shadow-sm">ได้เลยค่ะ ระบบรองรับหลายสาขาในหลังบ้านเดียว ฉันสร้างลิงก์ ChatPOS ให้ชำระได้ทันทีนะคะ</div><div className="mt-3 ml-7 rounded-2xl border border-[#a6dfbd] bg-white p-3"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-[#102218] text-white"><CreditCard className="size-4" /></span><div><p className="text-xs font-black">ChatPOS Payment</p><p className="text-xs text-slate-400">รอชำระ · 30 นาที</p></div><strong className="ml-auto text-sm">฿2,500</strong></div><div className="mt-3 rounded-xl bg-[#06C755] py-2 text-center text-xs font-black text-white">ชำระเงิน</div></div><div className="mt-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-400">พิมพ์ข้อความ…<Route className="ml-auto size-4 text-[#06C755]" /></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-black tracking-[.14em] text-[#00A843]">เริ่มง่ายเหมือนเปิด LINE OA</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">เปิดระบบพร้อมใช้งานใน 4 ขั้นตอน</h2><p className="mt-4 leading-7 text-slate-500">หน้าสมัครจะพาใส่ข้อมูลทีละขั้น ไม่ต้องตั้งค่าทุกอย่างพร้อมกัน และกลับมาเพิ่มบัญชีภายหลังได้</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-4">{[
          ["01", Building2, "สมัครธุรกิจ", "กรอกชื่อธุรกิจ ผู้ดูแล และเลือกแพ็กเกจ"],
          ["02", MessageCircle, "เชื่อม LINE OA", "เพิ่ม Channel ID, Secret และ Access Token"],
          ["03", BrainCircuit, "ตั้งค่า AI", "เลือก Provider, Model และเพิ่มคลังความรู้"],
          ["04", Webhook, "เปิดรับข้อความ", "ตั้ง Webhook แล้วเริ่มให้ AI ดูแลลูกค้า"],
        ].map(([number, Icon, title, detail]) => <article key={String(number)} className="relative rounded-[24px] border border-[#d8e9de] bg-[#f8fffa] p-5"><span className="text-xs font-black text-[#00A843]">STEP {String(number)}</span><span className="mt-5 flex size-12 items-center justify-center rounded-2xl bg-[#06C755] text-white"><Icon className="size-6" /></span><h3 className="mt-5 text-lg font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{String(detail)}</p></article>)}</div>
      </section>

      <section id="features" className="border-y border-[#dce9e1] bg-[#f4fbf7] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-sm font-black tracking-[.14em] text-[#00A843]">MASTER BACKOFFICE</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">ควบคุมทุก LINE OA และ AI จากจุดเดียว</h2></div><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, detail }) => <article key={title} className="rounded-[24px] border border-[#d7e7dd] bg-white p-6 shadow-sm"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#e3f9ec] text-[#008C39]"><Icon className="size-5" /></span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p></article>)}</div></div>
      </section>

      <section id="chatpos" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="overflow-hidden rounded-[32px] bg-[#102218] p-6 text-white sm:p-10 lg:grid lg:grid-cols-[1fr_.8fr] lg:items-center lg:gap-12 lg:p-14"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-[#62ec9a]"><ShieldCheck className="size-4" /> CHATPOS PAYMENT READY</span><h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">เปลี่ยนบทสนทนาให้เป็นยอดชำระ โดยไม่ต้องออกจาก LINE</h2><p className="mt-4 max-w-2xl leading-7 text-slate-300">Admin หรือ AI สร้างลิงก์ ChatPOS ตามยอดที่ต้องการ ส่งให้ลูกค้า และรับสถานะกลับด้วย Webhook ทุกธุรกรรมแยกตามระบบลูกค้าอย่างชัดเจน</p></div><div className="mt-8 grid gap-3 lg:mt-0">{["สร้างยอดไม่เกิน 50,000 บาทต่อรายการ", "แนบชื่อลูกค้า เบอร์โทร และรายละเอียด", "สถานะรอชำระ ชำระสำเร็จ ยกเลิก และหมดอายุ", "เก็บ Merchant ID และ Webhook Secret แยกแต่ละธุรกิจ"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/8 p-4 text-sm font-bold"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-white"><Check className="size-4" /></span>{item}</div>)}</div></div></section>

      <section className="border-t border-[#dce9e1] bg-[#f0fff5] px-4 py-16"><div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left"><div><h2 className="text-2xl font-black sm:text-3xl">พร้อมสร้าง Admin AI ให้ LINE OA แล้วหรือยัง?</h2><p className="mt-2 text-slate-600">สมัครทีละขั้น และกลับมาเพิ่มบัญชี LINE OA ได้หลายบัญชีตามแพ็กเกจ</p></div><a href={signupHref} target="_top" className="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-2xl bg-[#06C755] px-7 font-black text-white shadow-lg shadow-[#06C755]/20">สมัครใช้งาน <ArrowRight className="size-5" /></a></div></section>
      <footer className="border-t border-[#dce9e1] px-4 py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-sm text-slate-500 sm:flex-row"><p className="font-bold text-[#102218]">ChatMarathon · ChatMarathon AI</p><p>Multi LINE OA · AI Router · ChatPOS Payment</p></div></footer>
    </main>
  );
}
