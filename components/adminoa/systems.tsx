"use client";

import { useState } from "react";
import { Bot, Boxes, Building2, Crown, LoaderCircle, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ChatbotRecord, WorkspaceRecord } from "@/lib/adminoa-types";
import { EmptyState, SectionTitle, StatusBadge } from "./shared";

export function SystemsView({
  workspaces,
  activeWorkspaceId,
  bots,
  onSelectWorkspace,
  onCreateWorkspace,
  onCreateBot,
}: {
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string;
  bots: ChatbotRecord[];
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (payload: { name: string; customerName: string; customerEmail: string; plan: string }) => Promise<boolean>;
  onCreateBot: (payload: { name: string; businessSystem: string; description: string; greeting: string }) => Promise<boolean>;
}) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [plan, setPlan] = useState("trial");
  const [botName, setBotName] = useState("");
  const [businessSystem, setBusinessSystem] = useState("");
  const [description, setDescription] = useState("");
  const [greeting, setGreeting] = useState("สวัสดีค่ะ มีอะไรให้ Admin AI ช่วยดูแลวันนี้คะ?");
  const activeWorkspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const workspaceBots = bots.filter((bot) => bot.workspaceId === activeWorkspaceId);

  async function createWorkspace() {
    if (!workspaceName.trim()) return toast.error("กรุณากรอกชื่อระบบ");
    setSaving(true);
    const ok = await onCreateWorkspace({ name: workspaceName, customerName, customerEmail, plan });
    setSaving(false);
    if (ok) {
      setWorkspaceOpen(false);
      setWorkspaceName("");
      setCustomerName("");
      setCustomerEmail("");
    }
  }

  async function createBot() {
    if (!botName.trim()) return toast.error("กรุณากรอกชื่อแชตบอต");
    setSaving(true);
    const ok = await onCreateBot({ name: botName, businessSystem, description, greeting });
    setSaving(false);
    if (ok) {
      setBotOpen(false);
      setBotName("");
      setBusinessSystem("");
      setDescription("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <SectionTitle eyebrow="Super master" title="ระบบลูกค้าและแชตบอต" detail="สร้าง AdminOA ได้หลายระบบ แต่ละระบบแยก Admin, Skill, AI Token, LINE OA และประวัติแชตออกจากกัน" action={<Button onClick={() => setWorkspaceOpen(true)} className="h-11 rounded-xl bg-cyan-700 px-5 hover:bg-cyan-800"><Plus /> สร้างระบบลูกค้า</Button>} />
      <div className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-black text-slate-950">ระบบทั้งหมด</h2><p className="mt-1 text-xs text-slate-500">เลือกเพื่อจัดการข้อมูลภายใน</p></div><Badge variant="outline">{workspaces.length} ระบบ</Badge></div>
          <div className="mt-4 space-y-2">
            {workspaces.map((workspace) => <button key={workspace.id} onClick={() => onSelectWorkspace(workspace.id)} className={`w-full rounded-2xl border p-4 text-left transition ${workspace.id === activeWorkspaceId ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100" : "border-slate-200 hover:bg-slate-50"}`}><div className="flex items-start gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${workspace.plan === "master" ? "bg-amber-400 text-slate-950" : "bg-slate-950 text-white"}`}>{workspace.plan === "master" ? <Crown className="size-5" /> : <Building2 className="size-5" />}</span><div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{workspace.name}</p><p className="mt-1 font-mono text-[11px] font-bold text-slate-400">{workspace.systemCode}</p></div><StatusBadge status={workspace.status} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white/70 p-2"><strong className="block text-lg text-slate-950">{workspace.botCount}</strong>แชตบอต</div><div className="rounded-xl bg-white/70 p-2"><strong className="block text-lg text-slate-950">{workspace.channelCount}</strong>ช่องทาง</div><div className="rounded-xl bg-white/70 p-2"><strong className="block text-lg text-slate-950">{workspace.unreadCount}</strong>รอตอบ</div></div></button>)}
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3"><div><h2 className="font-black text-slate-950">แชตบอตใน {activeWorkspace?.name || "ระบบที่เลือก"}</h2><p className="mt-1 text-xs text-slate-500">LINE OA ทุกบัญชีต้องผูกกับแชตบอตหนึ่งตัว</p></div><Button disabled={!activeWorkspaceId} onClick={() => setBotOpen(true)} variant="outline" className="ml-auto rounded-xl"><Plus /> สร้างแชตบอต</Button></div>
          {workspaceBots.length === 0 ? <div className="mt-4"><EmptyState icon={Boxes} title="ยังไม่มีแชตบอต" detail="สร้างแชตบอตตัวแรกเพื่อเป็นศูนย์กลางของ LINE OA, Admin และ AI Provider" /></div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{workspaceBots.map((bot) => <div key={bot.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-700 text-white"><Bot className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-black text-slate-900">{bot.name}</p><p className="mt-1 text-xs text-slate-500">{bot.businessSystem || "AI Call Center"}</p></div><Settings2 className="size-4 text-slate-400" /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{bot.description || bot.greeting}</p><div className="mt-4 flex gap-2"><Badge variant="outline">{bot.channelCount} ช่องทาง</Badge><Badge variant="outline">{bot.unreadCount} รอตอบ</Badge></div></div>)}</div>}
        </article>
      </div>

      <Dialog open={workspaceOpen} onOpenChange={setWorkspaceOpen}><DialogContent className="rounded-2xl sm:max-w-xl"><DialogHeader><DialogTitle>สร้างระบบลูกค้าใหม่</DialogTitle><DialogDescription>ข้อมูล Admin, Skill, Token และแชตของแต่ละระบบจะถูกแยกออกจากกัน</DialogDescription></DialogHeader><div className="grid gap-4"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อระบบ *</span><Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="เช่น AdminOA — บริษัท ABC" className="h-11 rounded-xl" /></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อผู้ดูแล</span><Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">อีเมลผู้ดูแล</span><Input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="h-11 rounded-xl" /></label></div><label><span className="mb-1.5 block text-sm font-bold text-slate-700">แพ็กเกจ</span><Select value={plan} onValueChange={setPlan}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="trial">ทดลองใช้</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent></Select></label></div><DialogFooter><Button variant="outline" onClick={() => setWorkspaceOpen(false)}>ยกเลิก</Button><Button disabled={saving} onClick={createWorkspace} className="bg-cyan-700 hover:bg-cyan-800">{saving ? <LoaderCircle className="animate-spin" /> : <Plus />} สร้างระบบ</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={botOpen} onOpenChange={setBotOpen}><DialogContent className="rounded-2xl sm:max-w-xl"><DialogHeader><DialogTitle>สร้างแชตบอต</DialogTitle><DialogDescription>แชตบอตจะรับบัญชีช่องทางภายใน {activeWorkspace?.name}</DialogDescription></DialogHeader><div className="grid gap-4"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อแชตบอต *</span><Input value={botName} onChange={(event) => setBotName(event.target.value)} placeholder="เช่น ABC Customer Service" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ระบบธุรกิจ</span><Input value={businessSystem} onChange={(event) => setBusinessSystem(event.target.value)} placeholder="เช่น ร้านอาหาร ระบบจอง หรือฝ่ายขาย" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">หน้าที่</span><Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ข้อความต้อนรับ</span><Textarea value={greeting} onChange={(event) => setGreeting(event.target.value)} className="min-h-20 rounded-xl" /></label></div><DialogFooter><Button variant="outline" onClick={() => setBotOpen(false)}>ยกเลิก</Button><Button disabled={saving} onClick={createBot} className="bg-cyan-700 hover:bg-cyan-800">{saving ? <LoaderCircle className="animate-spin" /> : <Bot />} สร้างแชตบอต</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
