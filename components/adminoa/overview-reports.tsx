"use client";

import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Headphones,
  MessagesSquare,
  PlugZap,
  Route,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AdminRecord,
  ChannelAccountRecord,
  ConversationRecord,
  ProviderRecord,
  ReportRecord,
  SkillRecord,
  WorkspaceRecord,
} from "@/lib/adminoa-types";
import { ChannelMark, EmptyState, SectionTitle, formatDateTime } from "./shared";

export function OverviewView({
  workspace,
  admins,
  skills,
  providers,
  accounts,
  conversations,
  report,
  onNavigate,
}: {
  workspace?: WorkspaceRecord;
  admins: AdminRecord[];
  skills: SkillRecord[];
  providers: ProviderRecord[];
  accounts: ChannelAccountRecord[];
  conversations: ConversationRecord[];
  report: ReportRecord | null;
  onNavigate: (view: string) => void;
}) {
  const activeProviders = providers.filter((item) => item.status === "active").length;
  const activeLine = accounts.filter((item) => item.platform === "line" && item.status === "active").length;
  const readySteps = [admins.length > 0, skills.some((item) => item.status === "active"), activeProviders > 0, activeLine > 0].filter(Boolean).length;
  const progress = readySteps * 25;
  const steps = [
    { label: "Admin AI", detail: admins.length ? `${admins.length} คน` : "ยังไม่ได้สร้าง", done: admins.length > 0, icon: UserRoundCog, view: "admins" },
    { label: "Skill การตอบ", detail: skills.length ? `${skills.length} Skill` : "ยังไม่ได้เพิ่ม", done: skills.some((item) => item.status === "active"), icon: Sparkles, view: "skills" },
    { label: "AI Provider", detail: activeProviders ? `${activeProviders} พร้อมใช้` : "ยังไม่ผ่านทดสอบ", done: activeProviders > 0, icon: BrainCircuit, view: "providers" },
    { label: "LINE OA", detail: activeLine ? `${activeLine} เชื่อมแล้ว` : "รอ Token และ Webhook", done: activeLine > 0, icon: PlugZap, view: "channels" },
  ];
  const summary = report?.summary;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <SectionTitle
        eyebrow="AI Call Center Control Room"
        title={workspace?.name || "ศูนย์ควบคุม AdminOA"}
        detail="ดูข้อความจาก LINE OA ในกล่องกลาง พร้อมผลว่า AI Router เลือก Admin คนใด ใช้ Skill อะไร และเคสใดต้องส่งต่อพนักงานจริง"
        action={<Button onClick={() => onNavigate("inbox")} className="h-11 rounded-xl bg-slate-950 px-5 hover:bg-slate-800"><Headphones /> เปิดหน้ารับแชต</Button>}
      />

      <section className="overflow-hidden rounded-[26px] bg-[#07161d] p-5 text-white shadow-xl shadow-slate-300/50 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="lg:w-72">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-300"><Route className="size-4" /> Live routing</div>
            <p className="mt-3 text-3xl font-black">{progress}%</p>
            <p className="mt-1 text-sm text-slate-300">ความพร้อมรับแชตจริงอัตโนมัติ</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ label, detail, done, icon: Icon, view }, index) => (
              <button key={label} onClick={() => onNavigate(view)} className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-300/40 hover:bg-white/10">
                <div className="flex items-center gap-3"><span className={`flex size-9 items-center justify-center rounded-xl ${done ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-slate-300"}`}>{done ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}</span><span className="text-xs text-slate-400">ขั้นที่ {index + 1}</span><ArrowRight className="ml-auto size-4 text-slate-600 transition group-hover:text-cyan-300" /></div>
                <p className="mt-4 font-bold">{label}</p>
                <p className={`mt-1 text-xs ${done ? "text-emerald-300" : "text-amber-300"}`}>{detail}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "ข้อความวันนี้", value: summary?.inboundToday ?? 0, icon: MessagesSquare, tone: "bg-cyan-50 text-cyan-800" },
          { label: "AI ตอบแล้ว", value: summary?.aiToday ?? 0, icon: Bot, tone: "bg-indigo-50 text-indigo-700" },
          { label: "รอพนักงานจริง", value: summary?.humanHandoffConversations ?? 0, icon: CircleAlert, tone: "bg-amber-50 text-amber-700" },
          { label: "AI ปิดคำถามได้", value: `${summary?.aiResolutionRate ?? 0}%`, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
          { label: "เวลาตอบ AI เฉลี่ย", value: summary?.averageAiLatencyMs ? `${(summary.averageAiLatencyMs / 1000).toFixed(1)} วิ` : "–", icon: Clock3, tone: "bg-slate-100 text-slate-700" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`}><Icon className="size-4" /></span>
            <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><h2 className="font-black text-slate-950">แชตล่าสุด</h2><p className="mt-1 text-xs text-slate-500">ข้อความจริงที่รับจากช่องทางที่เชื่อมต่อ</p></div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("inbox")}>ดูทั้งหมด <ArrowRight /></Button>
          </div>
          {conversations.length === 0 ? (
            <div className="mt-4"><EmptyState title="ยังไม่มีข้อความจากลูกค้า" detail="เมื่อเปิด Webhook ที่ LINE OA แล้ว ข้อความจะเข้าหน้านี้และถูกส่งให้ Admin AI ที่กำหนดทันที" /></div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {conversations.slice(0, 6).map((item) => (
                <button key={item.id} onClick={() => onNavigate("inbox")} className="flex w-full items-center gap-3 py-3 text-left">
                  <ChannelMark platform={item.platform} compact />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{item.customerName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.lastMessagePreview}</p></div>
                  <div className="shrink-0 text-right"><p className={`text-xs font-bold ${item.humanTakeover ? "text-amber-700" : "text-indigo-700"}`}>{item.humanTakeover ? item.humanAgentName || "รอพนักงาน" : item.adminName || "รอ Router"}</p><p className="mt-1 text-[11px] text-slate-400">{formatDateTime(item.lastMessageAt)}</p></div>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">เส้นทางคำตอบทุกข้อความ</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">ระบบบังคับลำดับนี้ก่อนส่งกลับ LINE OA</p>
          <ol className="mt-5 space-y-3">
            {[
              ["01", "ตรวจลายเซ็น LINE", "ป้องกัน Webhook ปลอม"],
              ["02", "วิเคราะห์เจตนาคำถาม", "เทียบกับ Skill ของทุก Admin"],
              ["03", "เลือก Admin ผู้เชี่ยวชาญ", "บันทึกเหตุผลและความมั่นใจ"],
              ["04", "Admin อ่าน Skill แล้วตอบ", "ส่งกลับ LINE พร้อมชื่อผู้ตอบ"],
              ["05", "ส่งต่อเมื่อไม่มั่นใจ", "พัก AI และรอพนักงานจริง"],
            ].map(([number, title, detail]) => (
              <li key={number} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-[11px] font-black text-cyan-300">{number}</span>
                <div><p className="text-sm font-bold text-slate-800">{title}</p><p className="text-xs text-slate-500">{detail}</p></div>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}

export function ReportsView({ report }: { report: ReportRecord | null }) {
  const summary = report?.summary;
  const days = report?.days ?? [];
  const maxValue = Math.max(1, ...days.map((day) => Math.max(day.inbound, day.ai)));
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SectionTitle eyebrow="Operations report" title="รายงาน AI Call Center" detail="วัดจำนวนแชต งานที่ AI ตอบสำเร็จ งานที่ต้องส่งต่อ และความเร็วในการตอบจากข้อมูลจริงในระบบ" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["ข้อความลูกค้าวันนี้", summary?.inboundToday ?? 0, "ข้อความขาเข้า"],
          ["AI ตอบวันนี้", summary?.aiToday ?? 0, "คำตอบอัตโนมัติ"],
          ["เจ้าหน้าที่ตอบวันนี้", summary?.adminToday ?? 0, "คำตอบจากหลังบ้าน"],
          ["เคสที่กำลังเปิด", summary?.openConversations ?? 0, `รอพนักงานจริง ${summary?.humanHandoffConversations ?? 0} เคส`],
        ].map(([label, value, detail]) => (
          <article key={String(label)} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="font-black text-slate-950">ปริมาณข้อความ 7 วัน</h2><p className="mt-1 text-xs text-slate-500">ฟ้า = ลูกค้าส่งเข้า · ม่วง = AI ตอบกลับ</p></div>
          {days.length === 0 ? <div className="mt-4"><EmptyState title="ยังไม่มีข้อมูลรายงาน" detail="รายงานจะเริ่มคำนวณเมื่อได้รับข้อความแรกจาก LINE OA" /></div> : (
            <div className="mt-7 flex h-64 items-end gap-3">
              {days.map((day) => (
                <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end justify-center gap-1">
                    <div className="w-[42%] rounded-t-lg bg-cyan-500" style={{ height: `${Math.max(day.inbound ? 8 : 2, (day.inbound / maxValue) * 100)}%` }} title={`ลูกค้า ${day.inbound}`} />
                    <div className="w-[42%] rounded-t-lg bg-indigo-500" style={{ height: `${Math.max(day.ai ? 8 : 2, (day.ai / maxValue) * 100)}%` }} title={`AI ${day.ai}`} />
                  </div>
                  <p className="text-center text-xs font-medium text-slate-500">{day.label}</p>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="rounded-[24px] bg-slate-950 p-6 text-white shadow-lg">
          <Badge className="border-0 bg-cyan-300 text-slate-950">AI Quality</Badge>
          <p className="mt-5 text-5xl font-black">{summary?.aiResolutionRate ?? 0}%</p>
          <p className="mt-2 text-sm text-slate-300">สัดส่วนบทสนทนาที่มีคำตอบจาก AI</p>
          <div className="mt-6 rounded-2xl bg-white/8 p-4">
            <p className="text-xs text-slate-400">เวลาประมวลผลเฉลี่ย</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">{summary?.averageAiLatencyMs ? `${(summary.averageAiLatencyMs / 1000).toFixed(1)} วินาที` : "ยังไม่มีข้อมูล"}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
