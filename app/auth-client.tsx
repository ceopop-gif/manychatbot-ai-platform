"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, CircleHelp, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { toast } from "sonner";

export default function AuthClient({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const [returnTo] = useState(() => {
    const fallback = isRegister ? "/signup" : "/admin";
    if (typeof window === "undefined") return fallback;
    const requestedReturnTo = new URLSearchParams(window.location.search).get("return_to");
    return requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : fallback;
  });
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, displayName, email, password, confirmPassword, returnTo }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; returnTo?: string; user?: { role?: "admin" | "merchant" } };
      if (!response.ok) throw new Error(data.error || "ไม่สามารถดำเนินการได้");
      const destination = data.returnTo || returnTo;
      if (destination === "/admin" || destination === "/store") {
        window.location.assign(data.user?.role === "admin" ? "/admin" : "/store");
      } else {
        window.location.assign(destination);
      }
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "ไม่สามารถดำเนินการได้");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_82%_10%,#d5ffea_0,transparent_34%),linear-gradient(180deg,#f4fff8_0%,#ffffff_100%)] px-4 py-10 text-[#102218]">
      <section className="w-full max-w-md rounded-3xl border border-[#cfe6d7] bg-white p-7 shadow-xl shadow-[#10321d]/10 sm:p-9">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#06C755] text-white"><Bot className="size-6" /></span>
          <span><strong className="block text-lg font-black">ChatMarathon</strong><span className="text-xs font-black tracking-[.14em] text-[#00A843]">SECURE ACCESS</span></span>
        </Link>
        <div className="mt-8 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#e4faec] text-[#008C39]"><LockKeyhole className="size-5" /></span><div><h1 className="text-2xl font-black">{isRegister ? "สร้างบัญชี" : "เข้าสู่ระบบ"}</h1><p className="text-sm text-slate-500">{isRegister ? "สร้างบัญชีเพื่อเริ่มใช้งานหลังบ้าน" : "เข้าสู่ระบบเพื่อจัดการหลังบ้านของคุณ"}</p></div></div>

        <form onSubmit={submit} className="mt-7 grid gap-4">
          {isRegister && <label><span className="mb-1.5 block text-sm font-bold">ชื่อที่แสดง</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={100} className="h-12 w-full rounded-xl border border-slate-200 px-3 outline-none transition focus:border-[#06C755] focus:ring-2 focus:ring-[#b8efcd]" placeholder="ชื่อผู้ดูแล" /></label>}
          <label><span className="mb-1.5 block text-sm font-bold">Username</span><span className="relative block"><UserRound className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" /><input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={32} className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 outline-none transition focus:border-[#06C755] focus:ring-2 focus:ring-[#b8efcd]" placeholder="เช่น admin01" /></span>{isRegister && <span className="mt-1 block text-xs text-slate-500">ใช้ภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–32 ตัว</span>}</label>
          {isRegister && <label><span className="mb-1.5 block text-sm font-bold">อีเมล <span className="font-normal text-slate-400">(ไม่บังคับ)</span></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} className="h-12 w-full rounded-xl border border-slate-200 px-3 outline-none transition focus:border-[#06C755] focus:ring-2 focus:ring-[#b8efcd]" /></label>}
          <label>
            <span className="mb-1.5 flex items-center gap-2 text-sm font-bold">
              <span>Password</span>
              {isRegister && <span className="group relative inline-flex">
                <button type="button" aria-label="ดูเงื่อนไขการสร้างรหัสผ่าน" aria-describedby="password-tooltip" className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-[#e4faec] hover:text-[#008C39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755]">
                  <CircleHelp className="size-4" />
                </button>
                <span id="password-tooltip" role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-72 -translate-x-1/2 rounded-xl bg-[#102218] px-4 py-3 text-left text-xs font-normal leading-5 text-white shadow-xl group-hover:block group-focus-within:block sm:left-0 sm:translate-x-0">
                  <strong className="mb-1 block text-sm text-[#9af0bb]">เงื่อนไขรหัสผ่าน</strong>
                  <span className="block">• อย่างน้อย 8 ตัวอักษร</span>
                  <span className="block">• มีตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a–z)</span>
                  <span className="block">• มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A–Z)</span>
                  <span className="block">• มีตัวเลขอย่างน้อย 1 ตัว (0–9)</span>
                </span>
              </span>}
            </span>
            <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} maxLength={128} className="h-12 w-full rounded-xl border border-slate-200 px-3 outline-none transition focus:border-[#06C755] focus:ring-2 focus:ring-[#b8efcd]" placeholder={isRegister ? "อย่างน้อย 8 ตัวอักษร" : "กรอกรหัสผ่าน"} />
          </label>
          {isRegister && <label><span className="mb-1.5 block text-sm font-bold">ยืนยัน Password</span><input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" maxLength={128} className="h-12 w-full rounded-xl border border-slate-200 px-3 outline-none transition focus:border-[#06C755] focus:ring-2 focus:ring-[#b8efcd]" /></label>}
          {isRegister && <p className="text-xs leading-5 text-slate-500">รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข</p>}
          <button type="submit" disabled={saving} className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#06C755] px-5 text-sm font-black text-white transition hover:bg-[#05b84e] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="size-5 animate-spin" /> : <LockKeyhole className="size-5" />}{isRegister ? "สร้างบัญชีและเริ่มใช้งาน" : "เข้าสู่ระบบ"}<ArrowRight className="size-4" /></button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{isRegister ? <>มีบัญชีอยู่แล้ว? <Link href="/login" className="font-black text-[#008C39] hover:underline">เข้าสู่ระบบ</Link></> : <>ยังไม่มีบัญชี? <Link href="/register" className="font-black text-[#008C39] hover:underline">สร้างบัญชี</Link></>}</div>
      </section>
    </main>
  );
}
