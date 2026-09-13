"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, BrainCircuit, Building2, Check, CreditCard, KeyRound, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const steps = [
  { title: "ข้อมูลธุรกิจ", icon: Building2 },
  { title: "เชื่อม LINE OA", icon: MessageCircle },
  { title: "ตั้งค่า AI", icon: BrainCircuit },
  { title: "แพ็กเกจและ Payment", icon: CreditCard },
];

const modelDefaults: Record<string, { model: string; name: string }> = {
  openai: { model: "gpt-5-mini", name: "OpenAI หลัก" },
  anthropic: { model: "claude-sonnet-4-5", name: "Anthropic หลัก" },
  gemini: { model: "gemini-2.5-flash", name: "Gemini หลัก" },
  custom: { model: "custom-model", name: "Custom AI" },
};

export default function SignupClient({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [accountName, setAccountName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState(modelDefaults.openai.model);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [plan, setPlan] = useState("trial");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [otpReferenceCode, setOtpReferenceCode] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = window.setTimeout(() => setOtpCooldown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpCooldown]);

  function next() {
    if (step === 0 && !workspaceName.trim()) return toast.error("กรุณากรอกชื่อธุรกิจหรือชื่อระบบ");
    if (step === 0 && !customerPhone.trim()) return toast.error("กรุณากรอกเบอร์โทรผู้ดูแล");
    if (step === 0 && !phoneVerified) return toast.error("กรุณายืนยันเบอร์โทรด้วย SMS OTP ก่อน");
    const lineFields = [channelId, channelSecret, accessToken];
    if (step === 1 && lineFields.some((value) => value.trim()) && !lineFields.every((value) => value.trim())) return toast.error("กรอกข้อมูล LINE OA ให้ครบ 3 ช่อง หรือเว้นว่างทั้งหมดเพื่อตั้งค่าภายหลัง");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function skipOptionalStep() {
    if (step === 1) {
      setAccountName("");
      setChannelId("");
      setChannelSecret("");
      setAccessToken("");
    }
    if (step === 2) {
      setApiKey("");
      setBaseUrl("");
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function changeProvider(value: string) {
    setProvider(value);
    setModel(modelDefaults[value].model);
  }

  async function requestOtp(resend = false) {
    if (!customerPhone.trim()) return toast.error("กรุณากรอกเบอร์โทรผู้ดูแลก่อนส่ง OTP");
    if (resend && !otpChallengeId) return toast.error("ไม่พบรายการ OTP กรุณาขอรหัสใหม่");
    setOtpSending(true);
    try {
      const response = await fetch(resend ? "/api/sms-otp/resend" : "/api/sms-otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(resend ? { challengeId: otpChallengeId } : { mobile: customerPhone }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; challengeId?: string; referenceCode?: string };
      if (!response.ok) throw new Error(data.error || "ส่ง OTP ไม่สำเร็จ");
      setOtpChallengeId(data.challengeId || otpChallengeId);
      setOtpReferenceCode(data.referenceCode || "");
      setOtpCode("");
      setOtpCooldown(60);
      setOtpDialogOpen(true);
      toast.success(resend ? "ส่ง OTP ใหม่แล้ว" : "ส่ง OTP แล้ว", { description: "กรุณาตรวจสอบข้อความ SMS ที่เบอร์ของคุณ" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่ง OTP ไม่สำเร็จ");
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyPhoneOtp() {
    if (!otpChallengeId || !/^[0-9]{4,8}$/.test(otpCode.trim())) return toast.error("กรุณากรอกรหัส OTP 4–8 หลัก");
    setOtpVerifying(true);
    try {
      const response = await fetch("/api/sms-otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId: otpChallengeId, otpCode: otpCode.trim() }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "ยืนยัน OTP ไม่สำเร็จ");
      setPhoneVerified(true);
      setOtpDialogOpen(false);
      toast.success("ยืนยันเบอร์โทรสำเร็จ");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ยืนยัน OTP ไม่สำเร็จ");
    } finally {
      setOtpVerifying(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceName,
          customerName,
           customerPhone,
           otpChallengeId,
          customerEmail,
          plan,
          line: { accountName, channelId, channelSecret, accessToken },
          ai: apiKey.trim() ? { provider, ...modelDefaults[provider], model, baseUrl, apiKey } : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "สมัครใช้งานไม่สำเร็จ");
      setComplete(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สมัครใช้งานไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (complete) return <main className="flex min-h-screen items-center justify-center bg-[#f4fff8] p-4"><div className="w-full max-w-xl rounded-[30px] border border-[#bee3cb] bg-white p-7 text-center shadow-xl sm:p-10"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#06C755] text-white"><Check className="size-8" /></span><h1 className="mt-6 text-3xl font-black">สร้างระบบเรียบร้อยแล้ว</h1><p className="mt-3 leading-7 text-slate-500">ระบบได้สร้างธุรกิจ แชตบอต และพื้นที่สำหรับ ChatPOS ให้แล้ว ข้อมูล LINE OA หรือ AI ที่กรอกไว้จะอยู่ในสถานะรอตรวจสอบก่อนเปิดตอบอัตโนมัติ</p><Link href="/admin" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#06C755] px-6 font-black text-white">เข้าสู่หลังบ้าน <ArrowRight className="size-5" /></Link></div></main>;

  const CurrentIcon = steps[step].icon;
  return (
    <main className="min-h-screen bg-[#f4fff8] text-[#102218]">
      <header className="border-b border-[#d7eadf] bg-white"><div className="mx-auto flex h-[72px] max-w-6xl items-center px-4 sm:px-6"><Link href="/" className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-[14px] bg-[#06C755] text-white"><Bot className="size-5" /></span><span><strong className="block text-base font-black">ChatMarathon</strong><span className="text-xs font-black tracking-[.14em] text-[#00A843]">CREATE ACCOUNT</span></span></Link><Link href="/admin" className="ml-auto text-sm font-black text-[#008C39]">ไปหลังบ้าน</Link></div></header>
      <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[300px_1fr] lg:py-12">
        <aside className="rounded-[26px] bg-[#102218] p-5 text-white lg:sticky lg:top-6 lg:h-fit">
          <p className="text-xs font-black tracking-[.14em] text-[#65eb9c]">สมัครใช้งานทีละขั้น</p><h1 className="mt-2 text-2xl font-black">สร้าง LINE OA + AI ของคุณ</h1>
          <div className="mt-6 grid grid-cols-4 gap-2 lg:grid-cols-1">{steps.map(({ title, icon: Icon }, index) => <button key={title} type="button" onClick={() => index < step && setStep(index)} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition ${index === step ? "bg-[#06C755]" : index < step ? "bg-white/10" : "opacity-45"}`}><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon className="size-4" /></span><div className="hidden lg:block"><p className="text-xs font-bold opacity-70">ขั้นตอน {index + 1}</p><p className="text-sm font-black">{title}</p></div>{index < step && <Check className="ml-auto hidden size-4 lg:block" />}</button>)}</div>
          <div className="mt-6 rounded-2xl bg-white/8 p-4 text-xs leading-5 text-slate-300"><ShieldCheck className="mb-2 size-5 text-[#65eb9c]" />Token และ Secret จะถูกเข้ารหัสก่อนบันทึก และจะไม่แสดงค่าจริงกลับมาบนหน้าจอ</div>
        </aside>

        <section className="rounded-[26px] border border-[#d7eadf] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#e2faeb] text-[#008C39]"><CurrentIcon className="size-5" /></span><div><p className="text-xs font-black text-[#00A843]">ขั้นตอน {step + 1} จาก {steps.length}</p><h2 className="text-2xl font-black">{steps[step].title}</h2></div></div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e7f1eb]"><div className="h-full rounded-full bg-[#06C755] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>

          {step === 0 && <div className="mt-8 grid gap-5"><div><h3 className="font-black">ข้อมูลบัญชีธุรกิจ</h3><p className="mt-1 text-sm text-slate-500">ใช้สำหรับแยกพื้นที่ทำงานและระบุผู้ดูแลหลัก</p></div><label><span className="mb-1.5 block text-sm font-bold">ชื่อธุรกิจหรือชื่อระบบ *</span><Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="เช่น ChatMarathon — บริษัท ABC" className="h-12 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold">ชื่อผู้ดูแล</span><Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="h-12 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold">เบอร์โทรผู้ดูแล *</span><div className="flex gap-2"><Input inputMode="tel" value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); setPhoneVerified(false); setOtpChallengeId(""); }} placeholder="08x-xxx-xxxx" className="h-12 min-w-0 rounded-xl" /><Button type="button" onClick={() => void requestOtp()} disabled={otpSending || otpCooldown > 0 || phoneVerified} className={`h-12 shrink-0 rounded-xl px-4 ${phoneVerified ? "bg-emerald-600 hover:bg-emerald-600" : "bg-[#06C755] hover:bg-[#05b84e]"}`}>{phoneVerified ? "ยืนยันแล้ว" : otpCooldown > 0 ? `รอ ${otpCooldown} วิ` : otpSending ? <LoaderCircle className="animate-spin" /> : "ส่ง OTP"}</Button></div><span className="mt-1 block text-xs text-slate-500">ระบบจะส่งรหัส OTP ไปยังเบอร์นี้เพื่อยืนยันก่อนสร้างระบบร้านค้า</span></label><label><span className="mb-1.5 block text-sm font-bold">อีเมล</span><Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="h-12 rounded-xl" /></label></div>}

          {step === 1 && <div className="mt-8 grid gap-5"><div className="rounded-2xl border border-[#bde4cb] bg-[#f0fff5] p-4"><p className="font-black text-[#007d33]">เตรียมข้อมูลจาก LINE Developers</p><ol className="mt-2 list-inside list-decimal space-y-1 text-sm leading-6 text-slate-600"><li>สร้าง Messaging API channel สำหรับ LINE OA</li><li>คัดลอก Channel ID และ Channel secret</li><li>ออก Long-lived channel access token</li></ol></div><label><span className="mb-1.5 block text-sm font-bold">ชื่อ LINE OA</span><Input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="เช่น @abcshop" className="h-12 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold">Channel ID</span><Input value={channelId} onChange={(event) => setChannelId(event.target.value)} className="h-12 rounded-xl font-mono" /></label><label><span className="mb-1.5 block text-sm font-bold">Channel secret</span><Input type="password" value={channelSecret} onChange={(event) => setChannelSecret(event.target.value)} className="h-12 rounded-xl font-mono" /></label><label><span className="mb-1.5 block text-sm font-bold">Channel access token</span><Input type="password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} className="h-12 rounded-xl font-mono" /></label><p className="text-xs leading-5 text-slate-500">ยังไม่มีข้อมูลใช่ไหม? กด “ข้ามไปตั้งค่าภายหลัง” ได้เลย หรือเว้นว่างทั้ง 3 ช่อง แล้วเข้าไปเชื่อมภายหลังในเมนู “เชื่อม LINE OA”</p></div>}

          {step === 2 && <div className="mt-8 grid gap-5"><div><h3 className="font-black">เลือกสมอง AI ให้ระบบ</h3><p className="mt-1 text-sm text-slate-500">เว้น API Token ว่างได้ หากต้องการตั้งค่าภายหลัง</p></div><label><span className="mb-1.5 block text-sm font-bold">AI Provider</span><Select value={provider} onValueChange={changeProvider}><SelectTrigger className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="anthropic">Anthropic</SelectItem><SelectItem value="gemini">Google Gemini</SelectItem><SelectItem value="custom">Java / Custom API</SelectItem></SelectContent></Select></label><label><span className="mb-1.5 block text-sm font-bold">Model ID</span><Input value={model} onChange={(event) => setModel(event.target.value)} className="h-12 rounded-xl font-mono" /></label>{provider === "custom" && <label><span className="mb-1.5 block text-sm font-bold">Base URL</span><Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://..." className="h-12 rounded-xl font-mono" /></label>}<label><span className="mb-1.5 flex items-center gap-2 text-sm font-bold"><KeyRound className="size-4 text-[#00A843]" /> API Token</span><Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="เว้นว่างเพื่อตั้งค่าภายหลัง" className="h-12 rounded-xl font-mono" /></label></div>}

          {step === 3 && <div className="mt-8 grid gap-5"><div><h3 className="font-black">เลือกรูปแบบการใช้งาน</h3><p className="mt-1 text-sm text-slate-500">การสมัครครั้งนี้ยังไม่หักเงิน แอดมินจะสร้างยอดและลิงก์ ChatPOS จากหลังบ้านตามแพ็กเกจที่ตกลง</p></div><div className="grid gap-3 sm:grid-cols-3">{[["trial", "ทดลองใช้", "เริ่มตั้งค่าระบบก่อน"], ["pro", "Pro", "สำหรับธุรกิจที่เริ่มใช้งานจริง"], ["business", "Business", "หลายทีมและหลาย LINE OA"]].map(([id, title, detail]) => <button type="button" key={id} onClick={() => setPlan(id)} className={`rounded-2xl border p-4 text-left transition ${plan === id ? "border-[#06C755] bg-[#effff5] ring-2 ring-[#b8efcd]" : "border-slate-200"}`}><span className={`flex size-6 items-center justify-center rounded-full border ${plan === id ? "border-[#06C755] bg-[#06C755] text-white" : "border-slate-300"}`}>{plan === id && <Check className="size-4" />}</span><p className="mt-4 font-black">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></button>)}</div><div className="rounded-2xl bg-[#102218] p-5 text-white"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#06C755]"><CreditCard className="size-5" /></span><div><p className="font-black">ChatPOS Payment พร้อมเชื่อมต่อ</p><p className="mt-1 text-sm leading-6 text-slate-300">หลังสร้างระบบ ให้เพิ่ม Merchant ID และ Webhook Secret ที่เมนู ChatPOS Payment แล้วจึงสร้างลิงก์รับเงินส่งให้ลูกค้าได้</p></div></div></div></div>}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5"><Button type="button" variant="outline" disabled={step === 0 || saving} onClick={() => setStep((current) => current - 1)} className="min-h-12 rounded-xl px-5"><ArrowLeft /> ย้อนกลับ</Button><div className="flex flex-wrap justify-end gap-3">{(step === 1 || step === 2) && <Button type="button" variant="ghost" disabled={saving} onClick={skipOptionalStep} className="min-h-12 rounded-xl px-4 text-[#008C39] hover:bg-[#effff5] hover:text-[#007d33]">ข้ามไปตั้งค่าภายหลัง <ArrowRight /></Button>}{step < steps.length - 1 ? <Button type="button" onClick={next} className="min-h-12 rounded-xl bg-[#06C755] px-6 hover:bg-[#05b84e]">ถัดไป <ArrowRight /></Button> : <Button type="button" disabled={saving} onClick={submit} className="min-h-12 rounded-xl bg-[#06C755] px-6 hover:bg-[#05b84e]">{saving ? <LoaderCircle className="animate-spin" /> : <Bot />} สร้างระบบของฉัน</Button>}</div></div>
        </section>
      </div>
      <Dialog open={otpDialogOpen} onOpenChange={(open) => !otpVerifying && setOtpDialogOpen(open)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันเบอร์โทรผู้ดูแล</DialogTitle>
            <DialogDescription>กรอกรหัส OTP ที่ส่งไปยังเบอร์ {customerPhone} ภายใน 10 นาที</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <label><span className="mb-1.5 block text-sm font-bold">รหัส OTP</span><Input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/[^0-9]/g, ""))} placeholder="กรอกรหัสจาก SMS" className="h-12 rounded-xl text-center text-xl font-black tracking-[0.35em]" /></label>
            {otpReferenceCode && <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">รหัสอ้างอิง: <strong className="font-mono text-slate-700">{otpReferenceCode}</strong></p>}
            <p className="text-center text-xs leading-5 text-slate-500">ไม่ได้รับข้อความ? {otpCooldown > 0 ? `ส่งใหม่ได้ใน ${otpCooldown} วินาที` : <button type="button" onClick={() => void requestOtp(true)} disabled={otpSending} className="font-black text-[#008C39] underline">ส่ง OTP อีกครั้ง</button>}</p>
          </div>
          <DialogFooter><Button type="button" variant="outline" disabled={otpVerifying} onClick={() => setOtpDialogOpen(false)}>ยกเลิก</Button><Button type="button" disabled={otpVerifying || otpCode.length < 4} onClick={() => void verifyPhoneOtp()} className="bg-[#06C755] hover:bg-[#05b84e]">{otpVerifying ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} ยืนยัน OTP</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
