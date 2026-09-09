"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  Crown,
  Headphones,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Network,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { AdminsView, SkillsView } from "@/components/adminoa/admin-skills";
import { CallCenterView } from "@/components/adminoa/call-center";
import { ChannelsView, ProvidersView } from "@/components/adminoa/connections";
import { OverviewView, ReportsView } from "@/components/adminoa/overview-reports";
import { SystemsView } from "@/components/adminoa/systems";
import type {
  AdminRecord,
  ChannelAccountRecord,
  ChatbotRecord,
  ConversationRecord,
  ProviderRecord,
  ReportRecord,
  SkillRecord,
  WorkspaceRecord,
} from "@/lib/adminoa-types";

type View = "overview" | "inbox" | "admins" | "skills" | "providers" | "channels" | "reports" | "systems";

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "inbox", label: "ข้อความ LINE OA", icon: Headphones },
  { id: "overview", label: "ภาพรวมระบบ", icon: LayoutDashboard },
  { id: "admins", label: "Admin AI", icon: UserRoundCog },
  { id: "skills", label: "Skill ของ Admin", icon: Sparkles },
  { id: "providers", label: "AI Provider", icon: BrainCircuit },
  { id: "channels", label: "เชื่อม LINE OA", icon: Network },
  { id: "reports", label: "รายงานการแชต", icon: BarChart3 },
  { id: "systems", label: "ระบบลูกค้า", icon: Building2 },
];

export default function DashboardClient() {
  const [view, setView] = useState<View>("inbox");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [bots, setBots] = useState<ChatbotRecord[]>([]);
  const [accounts, setAccounts] = useState<ChannelAccountRecord[]>([]);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");

  const activeWorkspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const workspaceBots = bots.filter((item) => item.workspaceId === activeWorkspaceId);
  const workspaceBotIds = useMemo(() => new Set(workspaceBots.map((item) => item.id)), [workspaceBots]);
  const workspaceAccounts = accounts.filter((item) => workspaceBotIds.has(item.chatbotId));
  const currentTitle = navItems.find((item) => item.id === view)?.label ?? "AdminOA";

  const loadGlobal = useCallback(async (preferredWorkspaceId?: string) => {
    const [workspaceResponse, botResponse, accountResponse] = await Promise.all([
      fetch("/api/workspaces"),
      fetch("/api/chatbots"),
      fetch("/api/channel-accounts"),
    ]);
    const [workspaceData, botData, accountData] = await Promise.all([
      workspaceResponse.json(),
      botResponse.json(),
      accountResponse.json(),
    ]);
    if (!workspaceResponse.ok || !botResponse.ok || !accountResponse.ok) {
      throw new Error(workspaceData.error || botData.error || accountData.error || "โหลดข้อมูลระบบไม่สำเร็จ");
    }
    const nextWorkspaces = (workspaceData.workspaces ?? []) as WorkspaceRecord[];
    setWorkspaces(nextWorkspaces);
    setBots((botData.chatbots ?? []) as ChatbotRecord[]);
    setAccounts((accountData.accounts ?? []) as ChannelAccountRecord[]);
    setActiveWorkspaceId((current) => {
      const wanted = preferredWorkspaceId || current;
      return nextWorkspaces.some((item) => item.id === wanted) ? wanted : nextWorkspaces[0]?.id ?? "";
    });
  }, []);

  const loadWorkspaceData = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return;
    setWorkspaceLoading(true);
    try {
      const query = encodeURIComponent(workspaceId);
      const [adminResponse, skillResponse, providerResponse, conversationResponse, reportResponse] = await Promise.all([
        fetch(`/api/admins?workspaceId=${query}`),
        fetch(`/api/skills?workspaceId=${query}`),
        fetch(`/api/ai-providers?workspaceId=${query}`),
        fetch(`/api/conversations?workspaceId=${query}`),
        fetch(`/api/reports?workspaceId=${query}`),
      ]);
      const [adminData, skillData, providerData, conversationData, reportData] = await Promise.all([
        adminResponse.json(),
        skillResponse.json(),
        providerResponse.json(),
        conversationResponse.json(),
        reportResponse.json(),
      ]);
      if (!adminResponse.ok || !skillResponse.ok || !providerResponse.ok || !conversationResponse.ok || !reportResponse.ok) {
        throw new Error(adminData.error || skillData.error || providerData.error || conversationData.error || reportData.error || "โหลดข้อมูลหลังบ้านไม่สำเร็จ");
      }
      setAdmins(adminData.admins ?? []);
      setSkills(skillData.skills ?? []);
      setProviders(providerData.providers ?? []);
      setConversations(conversationData.conversations ?? []);
      setReport(reportData as ReportRecord);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลหลังบ้านไม่สำเร็จ");
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  const refreshLiveInbox = useCallback(async (workspaceId: string) => {
    try {
      const query = encodeURIComponent(workspaceId);
      const [conversationResponse, reportResponse] = await Promise.all([
        fetch(`/api/conversations?workspaceId=${query}`),
        fetch(`/api/reports?workspaceId=${query}`),
      ]);
      if (!conversationResponse.ok || !reportResponse.ok) return;
      const [conversationData, reportData] = await Promise.all([
        conversationResponse.json(),
        reportResponse.json(),
      ]);
      setConversations(conversationData.conversations ?? []);
      setReport(reportData as ReportRecord);
    } catch {
      // Keep the last good inbox state during a transient polling failure.
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadGlobal()
      .catch((error) => active && setLoadError(error instanceof Error ? error.message : "โหลดระบบไม่สำเร็จ"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [loadGlobal]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void loadWorkspaceData(activeWorkspaceId);
    const timer = window.setInterval(() => void refreshLiveInbox(activeWorkspaceId), 8000);
    return () => window.clearInterval(timer);
  }, [activeWorkspaceId, loadWorkspaceData, refreshLiveInbox]);

  async function reloadWorkspace() {
    if (activeWorkspaceId) await loadWorkspaceData(activeWorkspaceId);
  }

  async function reloadEverything() {
    await loadGlobal(activeWorkspaceId);
    if (activeWorkspaceId) await loadWorkspaceData(activeWorkspaceId);
  }

  async function createWorkspace(payload: { name: string; customerName: string; customerEmail: string; plan: string }) {
    try {
      const response = await fetch("/api/workspaces", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "สร้างระบบไม่สำเร็จ");
      await loadGlobal(data.workspace.id);
      setActiveWorkspaceId(data.workspace.id);
      toast.success(`สร้าง ${data.workspace.name} แล้ว`, { description: `รหัสระบบ ${data.workspace.systemCode}` });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้างระบบไม่สำเร็จ");
      return false;
    }
  }

  async function createBot(payload: { name: string; businessSystem: string; description: string; greeting: string }) {
    if (!activeWorkspaceId) return false;
    try {
      const response = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, workspaceId: activeWorkspaceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "สร้างแชตบอตไม่สำเร็จ");
      await loadGlobal(activeWorkspaceId);
      toast.success(`สร้าง ${data.chatbot.name} แล้ว`, { description: "พร้อมเพิ่ม LINE OA" });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้างแชตบอตไม่สำเร็จ");
      return false;
    }
  }

  function navigate(next: string) {
    setView(next as View);
    setMobileNav(false);
  }

  const content =
    view === "overview" ? <OverviewView workspace={activeWorkspace} admins={admins} skills={skills} providers={providers} accounts={workspaceAccounts} conversations={conversations} report={report} onNavigate={navigate} />
      : view === "inbox" ? <CallCenterView workspaceId={activeWorkspaceId} conversations={conversations} admins={admins} onReload={reloadWorkspace} onNavigate={navigate} />
        : view === "admins" ? <AdminsView workspaceId={activeWorkspaceId} admins={admins} onReload={reloadWorkspace} onOpenSkills={() => setView("skills")} />
          : view === "skills" ? <SkillsView workspaceId={activeWorkspaceId} admins={admins} skills={skills} onReload={reloadWorkspace} />
            : view === "providers" ? <ProvidersView workspaceId={activeWorkspaceId} providers={providers} onReload={reloadWorkspace} />
              : view === "channels" ? <ChannelsView bots={workspaceBots} accounts={workspaceAccounts} admins={admins} providers={providers} onReload={reloadEverything} onOpenSystems={() => setView("systems")} />
                : view === "reports" ? <ReportsView report={report} />
                  : <SystemsView workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} bots={bots} onSelectWorkspace={setActiveWorkspaceId} onCreateWorkspace={createWorkspace} onCreateBot={createBot} />;

  return (
    <main className="min-h-screen bg-[#edf2f5] text-slate-950">
      <Toaster richColors position="top-right" />
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/10 bg-[#07161d] p-4 text-white transition-transform lg:static lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="relative flex size-11 items-center justify-center rounded-[15px] bg-gradient-to-br from-cyan-300 to-cyan-600 text-slate-950 shadow-lg shadow-cyan-950/40"><Bot className="size-5" /><span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#07161d] bg-emerald-400" /></span>
            <div><p className="text-[17px] font-black tracking-tight">ADMINOA</p><p className="text-[10px] font-black tracking-[0.16em] text-cyan-300">MANYCHATBOT AI</p></div>
            <button onClick={() => setMobileNav(false)} className="ml-auto lg:hidden" aria-label="ปิดเมนู"><X className="size-5" /></button>
          </div>

          <button onClick={() => navigate("systems")} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400"><Crown className="size-4 text-amber-300" /> ระบบที่กำลังจัดการ</div>
            <p className="mt-2 truncate text-sm font-black">{activeWorkspace?.name || "กำลังโหลด…"}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{activeWorkspace?.systemCode || "ADMINOA"}</p>
          </button>

          <nav className="mt-5 space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => {
              const badge = id === "inbox" ? conversations.filter((item) => item.unreadCount > 0).length : id === "admins" ? admins.length : id === "channels" ? workspaceAccounts.length : 0;
              return <button key={id} onClick={() => navigate(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${view === id ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30" : "text-slate-300 hover:bg-white/7 hover:text-white"}`}><Icon className="size-[18px]" />{label}{badge > 0 && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${view === id ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{badge}</span>}</button>;
            })}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-4">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300"><ShieldCheck className="size-4 text-emerald-300" /> AI Router เลือกตาม Skill</div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-center"><div className="rounded-lg bg-white/5 p-2"><strong className="block text-sm text-white">{admins.length}</strong><span className="text-[9px] text-slate-500">Admin</span></div><div className="rounded-lg bg-white/5 p-2"><strong className="block text-sm text-white">{skills.length}</strong><span className="text-[9px] text-slate-500">Skill</span></div><div className="rounded-lg bg-white/5 p-2"><strong className="block text-sm text-white">{providers.filter((item) => item.status === "active").length}</strong><span className="text-[9px] text-slate-500">AI</span></div></div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3"><span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900"><Crown className="size-5" /></span><div className="min-w-0"><p className="truncate text-xs font-black">ดร.ป็อบ</p><p className="truncate text-[10px] text-slate-400">Super Master</p></div><ChevronDown className="ml-auto size-4 text-slate-500" /></div>
          </div>
        </aside>
        {mobileNav && <button className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMobileNav(false)} aria-label="ปิดเมนู" />}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="เปิดเมนู"><Menu /></Button>
            <div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{currentTitle}</p><p className="hidden truncate text-xs text-slate-400 sm:block">{activeWorkspace?.name || "กำลังโหลดระบบ"}</p></div>
            <div className="ml-auto flex items-center gap-2">
              {workspaces.length > 1 && <Select value={activeWorkspaceId} onValueChange={setActiveWorkspaceId}><SelectTrigger className="hidden h-9 w-52 rounded-xl md:flex"><SelectValue /></SelectTrigger><SelectContent>{workspaces.map((workspace) => <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>)}</SelectContent></Select>}
              <Button variant="outline" size="sm" className="hidden rounded-xl xl:flex" onClick={() => toast.success("สถานะระบบล่าสุด", { description: `${workspaceAccounts.filter((item) => item.status === "active").length} LINE OA พร้อม · ${providers.filter((item) => item.status === "active").length} AI พร้อม` })}><Activity /> สถานะรวม</Button>
              <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setView("inbox")} aria-label="การแจ้งเตือน"><Bell />{conversations.some((item) => item.unreadCount > 0 || item.status === "escalated") && <span className="absolute right-1 top-1 size-2 rounded-full border-2 border-white bg-rose-500" />}</Button>
            </div>
          </header>

          {loadError && <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800">{loadError}</div>}
          <div className={`relative min-h-0 flex-1 ${view === "inbox" ? "flex p-3 md:p-5" : "overflow-y-auto p-4 md:p-6"}`}>
            {loading ? <div className="flex min-h-[70vh] w-full items-center justify-center"><LoaderCircle className="size-7 animate-spin text-cyan-700" /><span className="ml-3 text-sm font-semibold text-slate-500">กำลังโหลด AdminOA</span></div> : content}
            {workspaceLoading && !loading && <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur"><LoaderCircle className="size-3.5 animate-spin" /> อัปเดตข้อมูล</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
