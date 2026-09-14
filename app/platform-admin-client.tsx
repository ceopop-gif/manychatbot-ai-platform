"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Database,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import AdminUsersPanel from "@/components/platform/admin-users";

export type AdminView = "overview" | "merchants" | "access" | "billing" | "health" | "settings";

type Merchant = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  createdAt: string;
  workspaceCount: number;
  botCount: number;
  channelCount: number;
  activeChannelCount: number;
  aiProviderCount: number;
  activeConversationCount: number;
  unreadCount: number;
  paidOrderCount: number;
  paidAmountSatang: number;
  primaryPlan: string;
  latestWorkspace: string;
};

type PlatformData = {
  stats: {
    merchantCount: number;
    activeMerchantCount: number;
    workspaceCount: number;
    activeChannelCount: number;
    aiProviderCount: number;
    openConversationCount: number;
    paidAmountSatang: number;
  };
  merchants: Merchant[];
  checkedAt: string;
};

const navItems: Array<{ id: AdminView; label: string; detail: string; href: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "ภาพรวมแพลตฟอร์ม", detail: "สถานะรวมทั้งหมด", href: "/admin", icon: LayoutDashboard },
  { id: "merchants", label: "ร้านค้าทั้งหมด", detail: "ดูแลระบบลูกค้า", href: "/admin/merchants", icon: Store },
  { id: "access", label: "ผู้ใช้งานและสิทธิ์", detail: "บัญชีและสถานะ", href: "/admin/access", icon: UsersRound },
  { id: "billing", label: "แพ็กเกจและรายได้", detail: "ภาพรวมการชำระเงิน", href: "/admin/billing", icon: CircleDollarSign },
  { id: "health", label: "สุขภาพระบบ", detail: "บริการและการเชื่อมต่อ", href: "/admin/health", icon: Activity },
  { id: "settings", label: "ตั้งค่าแพลตฟอร์ม", detail: "ความปลอดภัยและนโยบาย", href: "/admin/settings", icon: Settings2 },
];

function formatMoney(satang: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(satang / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

function planLabel(plan: string) {
  return ({ trial: "ทดลองใช้", pro: "Pro", business: "Business", master: "Master" } as Record<string, string>)[plan] || plan;
}

function MerchantTable({ merchants, compact = false }: { merchants: Merchant[]; compact?: boolean }) {
  const rows = compact ? merchants.slice(0, 5) : merchants;
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">ร้านค้า</th><th className="px-5 py-4">แพ็กเกจ</th><th className="px-5 py-4">ระบบ</th><th className="px-5 py-4">LINE OA</th><th className="px-5 py-4">สถานะ</th><th className="px-5 py-4" /></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map((merchant) => <tr key={merchant.id} className="transition hover:bg-slate-50/80"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 font-black text-indigo-700">{merchant.displayName.slice(0, 1).toUpperCase()}</span><div><p className="font-black text-slate-900">{merchant.displayName}</p><p className="text-xs text-slate-500">@{merchant.username} · {merchant.email || "ไม่ระบุอีเมล"}</p></div></div></td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">{planLabel(merchant.primaryPlan)}</span></td><td className="px-5 py-4"><p className="font-black text-slate-800">{merchant.workspaceCount}</p><p className="text-xs text-slate-500">{merchant.latestWorkspace}</p></td><td className="px-5 py-4"><p className="font-black text-slate-800">{merchant.activeChannelCount}<span className="font-normal text-slate-400">/{merchant.channelCount}</span></p><p className="text-xs text-slate-500">เชื่อมต่ออยู่</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs font-black ${merchant.status === "active" ? "text-emerald-600" : "text-amber-600"}`}><span className={`size-2 rounded-full ${merchant.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />{merchant.status === "active" ? "ใช้งานปกติ" : merchant.status}</span></td><td className="px-5 py-4 text-right"><ChevronRight className="ml-auto size-4 text-slate-300" /></td></tr>)}</tbody>
      </table>
    </div>
    {!rows.length && <div className="flex flex-col items-center justify-center px-5 py-16 text-center"><Store className="size-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">ยังไม่มีร้านค้า</p><p className="mt-1 text-sm text-slate-500">บัญชีที่สมัครใหม่จะแสดงในหน้านี้โดยอัตโนมัติ</p></div>}
  </div>;
}

export default function PlatformAdminClient({ displayName, initialView = "overview" }: { displayName: string; initialView?: AdminView }) {
  const router = useRouter();
  const pathname = usePathname();
  const view = navItems.find((item) => item.href === pathname)?.id ?? initialView;
  const [mobileNav, setMobileNav] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PlatformData | null>(null);

  const currentNav = navItems.find((item) => item.id === view) ?? navItems[0];
  const merchants = useMemo(() => data?.merchants ?? [], [data]);
  const stats = data?.stats;
  const planCounts = useMemo(() => merchants.reduce<Record<string, number>>((result, merchant) => {
    result[merchant.primaryPlan] = (result[merchant.primaryPlan] || 0) + 1;
    return result;
  }, {}), [merchants]);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      const response = await fetch("/api/platform/overview", { cache: "no-store" });
      const nextData = await response.json() as PlatformData & { error?: string };
      if (!response.ok) throw new Error(nextData.error || "โหลดข้อมูลแพลตฟอร์มไม่สำเร็จ");
      setData(nextData);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "โหลดข้อมูลแพลตฟอร์มไม่สำเร็จ", { action: { label: "โหลดใหม่", onClick: () => window.location.reload() } });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void load().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      window.location.assign("/admin/login");
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ");
      setLoggingOut(false);
    }
  }

  function navigate(next: AdminView) {
    const nextItem = navItems.find((item) => item.id === next);
    if (nextItem) router.push(nextItem.href);
    setMobileNav(false);
  }

  const content = loading ? <div className="flex min-h-[60vh] items-center justify-center"><RefreshCw className="size-6 animate-spin text-indigo-600" /><span className="ml-3 text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลแพลตฟอร์ม</span></div> : view === "overview" ? <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="ร้านค้าทั้งหมด" value={stats?.merchantCount ?? 0} detail={`${stats?.activeMerchantCount ?? 0} ร้านกำลังใช้งาน`} icon={Store} tone="indigo" /><MetricCard label="ระบบร้านค้า" value={stats?.workspaceCount ?? 0} detail="พื้นที่ทำงานที่สร้างไว้" icon={Building2} tone="cyan" /><MetricCard label="LINE OA ที่ออนไลน์" value={stats?.activeChannelCount ?? 0} detail="พร้อมรับข้อความ" icon={Activity} tone="emerald" /><MetricCard label="ยอดชำระสะสม" value={formatMoney(stats?.paidAmountSatang ?? 0)} detail="จากรายการที่ชำระแล้ว" icon={CircleDollarSign} tone="amber" /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><section><SectionHeading title="ร้านค้าที่เข้ามาล่าสุด" detail="ติดตามภาพรวมลูกค้าจากศูนย์กลาง" action={{ label: "ดูร้านค้าทั้งหมด", onClick: () => navigate("merchants") }} /><MerchantTable merchants={merchants} compact /></section><section><SectionHeading title="สุขภาพแพลตฟอร์ม" detail="สถานะบริการสำคัญ" action={{ label: "ดูรายละเอียด", onClick: () => navigate("health") }} /><div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4"><HealthRow label="ฐานข้อมูล PostgreSQL" detail="เชื่อมต่อและตอบสนองปกติ" status="ปกติ" /><HealthRow label="ระบบจัดการผู้ใช้" detail={`${stats?.merchantCount ?? 0} บัญชีร้านค้า`} status="ปกติ" /><HealthRow label="LINE Messaging API" detail={`${stats?.activeChannelCount ?? 0} ช่องทางออนไลน์`} status="พร้อม" /><HealthRow label="AI Provider" detail={`${stats?.aiProviderCount ?? 0} provider ที่ active`} status="พร้อม" /></div></section></div>
  </> : view === "merchants" ? <><PageIntro title="ร้านค้าทั้งหมด" detail="ดูบัญชี พื้นที่ทำงาน การเชื่อมต่อ และสถานะของร้านค้าทั้งแพลตฟอร์ม" icon={Store} /><MerchantTable merchants={merchants} /></> : view === "access" ? <><PageIntro title="ผู้ใช้งานและสิทธิ์" detail="แยกบัญชีผู้ดูแลแพลตฟอร์มออกจากบัญชีร้านค้าอย่างชัดเจน" icon={UsersRound} /><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2"><div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5"><ShieldCheck className="size-6 text-indigo-600" /><p className="mt-4 text-sm font-black text-indigo-900">Admin ระบบ</p><p className="mt-1 text-3xl font-black text-indigo-700">1 ระดับ</p><p className="mt-1 text-sm text-indigo-700/70">เห็นข้อมูลรวมและดูแลร้านค้าทั้งหมด</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><Store className="size-6 text-emerald-600" /><p className="mt-4 text-sm font-black text-emerald-900">Merchant</p><p className="mt-1 text-3xl font-black text-emerald-700">{merchants.length} บัญชี</p><p className="mt-1 text-sm text-emerald-700/70">เห็นและจัดการข้อมูลร้านตัวเองเท่านั้น</p></div></div><div className="border-t border-slate-100 p-5"><h3 className="font-black text-slate-900">บัญชีร้านค้า</h3><div className="mt-4 divide-y divide-slate-100">{merchants.map((merchant) => <div key={merchant.id} className="flex items-center gap-3 py-3"><span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600"><UserRound className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{merchant.displayName}</p><p className="truncate text-xs text-slate-500">@{merchant.username} · สมัครเมื่อ {formatDate(merchant.createdAt)}</p></div><span className="text-xs font-black text-emerald-600">{merchant.status === "active" ? "Active" : merchant.status}</span></div>)}{!merchants.length && <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีบัญชีร้านค้า</p>}</div></div></div></> : view === "billing" ? <><PageIntro title="แพ็กเกจและรายได้" detail="ภาพรวมแพ็กเกจของร้านค้าและยอดชำระจากทั้งแพลตฟอร์ม" icon={CircleDollarSign} /><div className="grid gap-4 sm:grid-cols-3">{[["trial", "ทดลองใช้", "bg-slate-100 text-slate-700"], ["pro", "Pro", "bg-indigo-100 text-indigo-700"], ["business", "Business", "bg-violet-100 text-violet-700"]].map(([id, label, tone]) => <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone}`}>{label}</span><p className="mt-5 text-3xl font-black text-slate-900">{planCounts[id] || 0}</p><p className="mt-1 text-sm text-slate-500">ร้านค้า</p></div>)}</div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-start gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><CircleDollarSign className="size-6" /></span><div><h3 className="font-black text-slate-900">ยอดชำระสะสม</h3><p className="mt-1 text-3xl font-black text-slate-900">{formatMoney(stats?.paidAmountSatang ?? 0)}</p><p className="mt-1 text-sm text-slate-500">ยอดรวมจากรายการชำระสำเร็จของร้านค้าทั้งหมด</p></div></div></div></> : view === "health" ? <><PageIntro title="สุขภาพระบบ" detail="ติดตามบริการหลักและการเชื่อมต่อของร้านค้าทั้งแพลตฟอร์ม" icon={Activity} /><div className="grid gap-4 md:grid-cols-2">{[["ฐานข้อมูล", "PostgreSQL", "ฐานข้อมูลหลักพร้อมใช้งาน", Database, "เชื่อมต่อปกติ"], ["การสนทนา", `${stats?.openConversationCount ?? 0} ห้อง`, "ห้องสนทนาที่ยังไม่ปิด", BarChart3, "กำลังทำงาน"], ["LINE OA", `${stats?.activeChannelCount ?? 0} ช่องทาง`, "ช่องทางที่ active", Activity, "พร้อมรับข้อความ"], ["AI Provider", `${stats?.aiProviderCount ?? 0} รายการ`, "provider ที่ผ่านการตั้งค่า", CheckCircle2, "พร้อมใช้งาน"]].map(([label, value, detail, Icon, status]) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon className="size-6" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p><p className="text-sm text-slate-500">{detail}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{status}</span></div>)}</div></> : <><PageIntro title="ตั้งค่าแพลตฟอร์ม" detail="นโยบายและขอบเขตการเข้าถึงสำหรับ Admin ระบบ" icon={Settings2} /><div className="grid gap-4 md:grid-cols-2"><PolicyCard icon={ShieldCheck} title="การแบ่งสิทธิ์" detail="Admin ระบบเห็นข้อมูลรวมของร้านค้า ส่วน Merchant เห็นเฉพาะ workspace ของตัวเอง" /><PolicyCard icon={Database} title="การปกป้องข้อมูล" detail="ข้อมูล token และ secret ของร้านค้าถูกแยกตาม owner และเข้ารหัสก่อนจัดเก็บ" /><PolicyCard icon={Clock3} title="Session" detail="เซสชันหมดอายุภายใน 7 วัน และใช้ cookie แบบ HttpOnly" /><PolicyCard icon={AlertTriangle} title="การแจ้งเตือน" detail="การเชื่อมต่อที่ผิดพลาดหรือบริการไม่พร้อมจะแสดงในหน้า health" /></div></>;

  return <main className="min-h-screen bg-[#f4f7fb] text-slate-950"><div className="flex min-h-screen"><aside className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-white/10 bg-[linear-gradient(160deg,#0b1020_0%,#171b3c_58%,#25154b_100%)] p-4 text-white transition-transform lg:static lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}><div className="flex items-center gap-3 px-2 py-2"><span className="relative flex size-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-cyan-300 to-indigo-500 text-slate-950 shadow-lg shadow-indigo-950/50"><ShieldCheck className="size-6" /><span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#0b1020] bg-cyan-300" /></span><div><p className="text-[17px] font-black tracking-tight">ChatMarathon</p><p className="text-xs font-black tracking-[0.16em] text-cyan-300">PLATFORM ADMIN</p></div><button onClick={() => setMobileNav(false)} className="ml-auto lg:hidden" aria-label="ปิดเมนู"><X className="size-5" /></button></div><div className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4"><div className="flex items-center gap-2 text-xs font-black text-cyan-200"><ShieldCheck className="size-4" /> สิทธิ์ระดับ Platform</div><p className="mt-2 text-sm font-black text-white">ดูแลระบบรวมทุกร้านค้า</p><p className="mt-1 text-xs leading-5 text-slate-400">จัดการบัญชี สถานะบริการ และภาพรวมการใช้งาน</p></div><nav className="mt-6 space-y-1">{navItems.map(({ id, label, detail, href, icon: Icon }) => <Link key={id} href={href} onClick={() => setMobileNav(false)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${view === id ? "bg-white text-indigo-950 shadow-xl shadow-indigo-950/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`flex size-9 items-center justify-center rounded-xl ${view === id ? "bg-indigo-100 text-indigo-700" : "bg-white/8 text-cyan-200"}`}><Icon className="size-[18px]" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black">{label}</span><span className={`block truncate text-[11px] ${view === id ? "text-indigo-600/70" : "text-slate-500"}`}>{detail}</span></span>{view === id && <ChevronRight className="size-4 text-indigo-500" />}</Link>)}</nav><div className="mt-auto border-t border-white/10 pt-4"><div className="rounded-2xl bg-white/8 p-4"><p className="text-xs font-black text-slate-400">PLATFORM STATUS</p><div className="mt-3 flex items-center gap-2 text-sm font-bold text-white"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />ระบบทำงานปกติ</div><p className="mt-1 text-xs text-slate-500">อัปเดตล่าสุดจากฐานข้อมูล</p></div><div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/8 p-3"><span className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><UserRound className="size-5" /></span><div className="min-w-0"><p className="truncate text-xs font-black text-white">{displayName}</p><p className="truncate text-xs text-slate-400">Admin ระบบ</p></div><button type="button" onClick={() => setLogoutOpen(true)} className="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut className="size-4" /></button></div></div></aside>{mobileNav && <button className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setMobileNav(false)} aria-label="ปิดเมนู" />}<div className="flex min-w-0 flex-1 flex-col"><header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-7"><Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="เปิดเมนู" /><div className="min-w-0"><p className="truncate text-sm font-black text-indigo-950">{currentNav.label}</p><p className="hidden truncate text-xs text-slate-400 sm:block">ศูนย์ควบคุม ChatMarathon · Admin ระบบ</p></div><div className="ml-auto flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 md:flex"><span className="size-2 rounded-full bg-emerald-500" /> LIVE</span><Button variant="outline" size="sm" className="rounded-xl" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={refreshing ? "animate-spin" : ""} /> รีเฟรช</Button></div></header><div className="overflow-y-auto p-4 md:p-7"><div className="mx-auto max-w-[1500px]"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-500">{view === "overview" ? "Control center" : "Platform management"}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{currentNav.label}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{currentNav.detail} · ข้อมูลจะอัปเดตจากร้านค้าทั้งหมด</p></div>{data && <p className="text-xs font-semibold text-slate-400">อัปเดต {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.checkedAt))}</p>}</div>{content}</div></div></div></div><AlertDialog open={logoutOpen} onOpenChange={(open) => !loggingOut && setLogoutOpen(open)}><AlertDialogContent className="rounded-3xl"><AlertDialogHeader><AlertDialogMedia className="rounded-2xl bg-rose-50 text-rose-600"><LogOut className="size-7" /></AlertDialogMedia><AlertDialogTitle>ต้องการออกจากระบบหรือไม่?</AlertDialogTitle><AlertDialogDescription>คุณจะต้องเข้าสู่ระบบใหม่อีกครั้งเมื่อต้องการกลับมาใช้งานบัญชีแอดมิน</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={loggingOut} className="cursor-pointer">ยกเลิก</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={loggingOut} onClick={(event) => { event.preventDefault(); void logout(); }} className="cursor-pointer">{loggingOut ? <RefreshCw className="animate-spin" /> : <LogOut />} ออกจากระบบ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></main>;
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number | string; detail: string; icon: typeof Store; tone: "indigo" | "cyan" | "emerald" | "amber" }) {
  const tones = { indigo: "bg-indigo-100 text-indigo-700", cyan: "bg-cyan-100 text-cyan-700", emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`flex size-11 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="size-5" /></span><p className="mt-5 text-sm font-bold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}

function SectionHeading({ title, detail, action }: { title: string; detail: string; action?: { label: string; onClick: () => void } }) {
  return <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="text-sm text-slate-500">{detail}</p></div>{action && <button onClick={action.onClick} className="inline-flex items-center gap-1 text-sm font-black text-indigo-600 hover:text-indigo-800">{action.label}<ChevronRight className="size-4" /></button>}</div>;
}

function PageIntro({ title, detail, icon: Icon }: { title: string; detail: string; icon: typeof Store }) {
  return <><div className="mb-6 flex items-start gap-4 rounded-2xl border border-indigo-100 bg-[linear-gradient(110deg,#eef2ff,#ecfeff)] p-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm"><Icon className="size-6" /></span><div><h2 className="text-xl font-black text-indigo-950">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p></div></div>{title === "ผู้ใช้งานและสิทธิ์" && <AdminUsersPanel />}</>;
}

function HealthRow({ label, detail, status }: { label: string; detail: string; status: string }) {
  return <div className="flex items-center gap-3 rounded-xl p-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{label}</p><p className="truncate text-xs text-slate-500">{detail}</p></div><span className="text-xs font-black text-emerald-600">{status}</span></div>;
}

function PolicyCard({ icon: Icon, title, detail }: { icon: typeof ShieldCheck; title: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><Icon className="size-5" /></span><h3 className="mt-4 font-black text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p></div>;
}
