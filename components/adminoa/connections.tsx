"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  BrainCircuit,
  Check,
  CircleAlert,
  Copy,
  KeyRound,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  ServerCog,
  ShieldCheck,
  TestTube2,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AdminRecord, ChannelAccountRecord, ChatbotRecord, ProviderRecord } from "@/lib/adminoa-types";
import { ChannelMark, EmptyState, SectionTitle, StatusBadge, channelMeta, formatDateTime } from "./shared";

const providerLabels = {
  openai: { label: "OpenAI", color: "bg-emerald-500", base: "https://api.openai.com/v1", model: "gpt-5-mini" },
  anthropic: { label: "Anthropic", color: "bg-orange-500", base: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5" },
  gemini: { label: "Google Gemini", color: "bg-blue-600", base: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash" },
  custom: { label: "Java / Custom API", color: "bg-violet-600", base: "", model: "your-model" },
} as const;

export function ProvidersView({
  workspaceId,
  providers,
  onReload,
}: {
  workspaceId: string;
  providers: ProviderRecord[];
  onReload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState("");
  const [provider, setProvider] = useState<ProviderRecord["provider"]>("openai");
  const [name, setName] = useState<string>("OpenAI หลัก");
  const [model, setModel] = useState<string>(providerLabels.openai.model);
  const [baseUrl, setBaseUrl] = useState<string>(providerLabels.openai.base);
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(providers.length === 0);

  function changeProvider(value: ProviderRecord["provider"]) {
    setProvider(value);
    const meta = providerLabels[value];
    setName(`${meta.label} หลัก`);
    setModel(meta.model);
    setBaseUrl(meta.base);
  }

  async function createProvider() {
    if (!name.trim() || !model.trim() || !apiKey.trim()) return toast.error("กรุณากรอกชื่อ Model และ API Token");
    if (provider === "custom" && !baseUrl.trim()) return toast.error("กรุณากรอก HTTPS Endpoint ของ Java/Custom API");
    setSaving(true);
    try {
      const response = await fetch("/api/ai-providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, provider, name, model, baseUrl, apiKey, isDefault }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "บันทึก AI Provider ไม่สำเร็จ");
      await onReload();
      setOpen(false);
      setApiKey("");
      toast.success("บันทึก AI Token แบบเข้ารหัสแล้ว", { description: "กดทดสอบเพื่อยืนยันว่า Provider ตอบกลับได้จริง" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึก AI Provider ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function providerAction(id: string, action: "test" | "default") {
    if (action === "test") setTestingId(id);
    try {
      const response = await fetch("/api/ai-providers", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ดำเนินการไม่สำเร็จ");
      await onReload();
      toast.success(action === "test" ? `เชื่อมต่อสำเร็จใน ${(data.test.latencyMs / 1000).toFixed(1)} วินาที` : "ตั้งเป็น AI หลักแล้ว", { description: action === "test" ? data.test.text : undefined });
    } catch (error) {
      await onReload();
      toast.error(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setTestingId("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <SectionTitle eyebrow="Bring your own AI" title="AI Provider และ Token" detail="เชื่อม Token ของคุณเองได้หลาย Provider ระบบเก็บ Token แบบเข้ารหัสและเลือกตัวหลักแยกตามระบบลูกค้า" action={<Button onClick={() => { setIsDefault(providers.length === 0); setOpen(true); }} className="h-11 rounded-xl bg-cyan-700 px-5 hover:bg-cyan-800"><Plus /> เชื่อม AI Provider</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[["Token ไม่แสดงซ้ำ", "หลังบันทึก ระบบส่งกลับเพียงสถานะว่ามี Token", LockKeyhole], ["แยกตามลูกค้า", "แต่ละระบบใช้บัญชี AI และ Model ของตนเอง", ServerCog], ["ต้องทดสอบก่อนใช้", "Webhook จะเลือกเฉพาะ Provider ที่สถานะพร้อม", TestTube2]].map(([title, detail, Icon]) => <div key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-black text-slate-800"><Icon className="size-4 text-cyan-700" />{String(title)}</div><p className="mt-2 text-xs leading-5 text-slate-500">{String(detail)}</p></div>)}
      </div>
      {providers.length === 0 ? <EmptyState icon={BrainCircuit} title="ยังไม่ได้เชื่อม AI" detail="เพิ่ม OpenAI, Anthropic, Gemini หรือ Java/Custom API แล้วกดทดสอบก่อนนำไปผูกกับ LINE OA" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((item) => {
            const meta = providerLabels[item.provider] ?? providerLabels.custom;
            return <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3"><span className={`flex size-11 items-center justify-center rounded-2xl font-black text-white ${meta.color}`}>{meta.label.slice(0, 2)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-black text-slate-950">{item.name}</h2>{item.isDefault && <Badge className="border-0 bg-indigo-50 text-indigo-700">AI หลัก</Badge>}</div><p className="mt-1 text-sm font-semibold text-slate-600">{meta.label}</p></div><StatusBadge status={item.status} /></div>
              <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">Model</span><span className="truncate font-mono text-xs font-bold text-slate-800">{item.model}</span></div><div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">API Token</span><span className="font-bold text-emerald-700">{item.hasApiKey ? "เข้ารหัสแล้ว" : "ยังไม่มี"}</span></div><div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">ทดสอบล่าสุด</span><span className="text-xs font-semibold text-slate-700">{formatDateTime(item.lastTestedAt)}</span></div></div>
              {item.lastError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">{item.lastError}</p>}
              <div className="mt-4 flex gap-2"><Button disabled={testingId === item.id} onClick={() => providerAction(item.id, "test")} className="flex-1 rounded-xl bg-slate-950 hover:bg-slate-800">{testingId === item.id ? <LoaderCircle className="animate-spin" /> : <TestTube2 />} ทดสอบ</Button>{!item.isDefault && <Button variant="outline" onClick={() => providerAction(item.id, "default")} className="rounded-xl">ใช้เป็นหลัก</Button>}</div>
            </article>;
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle>เชื่อม AI Provider</DialogTitle><DialogDescription>Token จะถูกเข้ารหัสก่อนบันทึก และจะไม่ถูกส่งกลับมาแสดงบนหน้าจออีก</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <label><span className="mb-1.5 block text-sm font-bold text-slate-700">ประเภท AI</span><Select value={provider} onValueChange={(value) => changeProvider(value as ProviderRecord["provider"])}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(providerLabels).map(([id, meta]) => <SelectItem key={id} value={id}>{meta.label}</SelectItem>)}</SelectContent></Select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อการเชื่อมต่อ *</span><Input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">Model ID *</span><Input value={model} onChange={(event) => setModel(event.target.value)} className="h-11 rounded-xl font-mono text-sm" /></label></div>
            <label><span className="mb-1.5 block text-sm font-bold text-slate-700">Base URL {provider === "custom" ? "*" : "(แก้ได้เมื่อใช้ Gateway)"}</span><Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://..." className="h-11 rounded-xl font-mono text-sm" /></label>
            <label><span className="mb-1.5 block text-sm font-bold text-slate-700">API Token *</span><Input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="วาง Token ของ Provider" className="h-11 rounded-xl font-mono text-sm" /></label>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"><div><p className="text-sm font-bold text-slate-800">ใช้เป็น AI หลัก</p><p className="text-xs text-slate-500">เลือกอัตโนมัติเมื่อ LINE OA ไม่ได้ระบุ Provider</p></div><Switch checked={isDefault} onCheckedChange={setIsDefault} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button><Button disabled={saving} onClick={createProvider} className="bg-cyan-700 hover:bg-cyan-800">{saving ? <LoaderCircle className="animate-spin" /> : <KeyRound />} เข้ารหัสและบันทึก</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ChannelsView({
  bots,
  accounts,
  admins,
  providers,
  onReload,
  onOpenSystems,
}: {
  bots: ChatbotRecord[];
  accounts: ChannelAccountRecord[];
  admins: AdminRecord[];
  providers: ProviderRecord[];
  onReload: () => Promise<void>;
  onOpenSystems: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const selected = accounts.find((item) => item.id === selectedId);
  const selectedChannelId = selected?.channelId ?? "";
  const selectedProviderId = selected?.aiProviderId ?? "none";
  const selectedAutoReply = selected?.autoReply ?? true;
  const [botId, setBotId] = useState(bots[0]?.id ?? "");
  const [accountName, setAccountName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelSecret, setNewChannelSecret] = useState("");
  const [newAccessToken, setNewAccessToken] = useState("");
  const [newProviderId, setNewProviderId] = useState("none");
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [providerId, setProviderId] = useState("none");
  const [autoReply, setAutoReply] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedId) {
      setChannelId(selectedChannelId);
      setChannelSecret("");
      setAccessToken("");
      setProviderId(selectedProviderId);
      setAutoReply(selectedAutoReply);
    }
  }, [selectedId, selectedChannelId, selectedProviderId, selectedAutoReply]);

  function openAddAccount() {
    setBotId(bots[0]?.id ?? "");
    setAccountName("");
    setExternalId("");
    setNewChannelId("");
    setNewChannelSecret("");
    setNewAccessToken("");
    setNewProviderId("none");
    setAddOpen(true);
  }

  async function createAccount() {
    if (!botId || !accountName.trim()) return toast.error("กรุณาเลือกแชตบอตและกรอกชื่อ LINE OA");
    if (!newChannelId.trim() || !newChannelSecret.trim() || !newAccessToken.trim()) return toast.error("กรุณากรอก Channel ID, Channel secret และ Channel access token ให้ครบ");
    setSaving(true);
    try {
      const response = await fetch("/api/channel-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatbotId: botId, accountName, externalId, channelId: newChannelId, channelSecret: newChannelSecret, accessToken: newAccessToken, aiProviderId: newProviderId === "none" ? null : newProviderId, autoReply: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เพิ่ม LINE OA ไม่สำเร็จ");

      const connectResponse = await fetch("/api/channel-accounts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: data.account.id, action: "connect" }),
      });
      const connectData = await connectResponse.json();
      await onReload();
      setAddOpen(false);
      if (!connectResponse.ok) {
        setSelectedId(data.account.id);
        setConfigOpen(true);
        toast.error(connectData.error || "บันทึกข้อมูลแล้ว แต่ LINE ยังเชื่อมต่อไม่สำเร็จ");
        return;
      }
      toast.success("เชื่อม LINE OA สำเร็จ", { description: "1 ระบบนี้เชื่อมกับ LINE OA บัญชีนี้ และข้อความใหม่จะเข้ากล่องกลาง" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เพิ่ม LINE OA ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function saveConfiguration(action: "save" | "connect") {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch("/api/channel-accounts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action,
          channelId,
          channelSecret,
          accessToken,
          adminId: null,
          aiProviderId: providerId === "none" ? null : providerId,
          autoReply,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "บันทึกการเชื่อมต่อไม่สำเร็จ");
      await onReload();
      setChannelSecret("");
      setAccessToken("");
      if (action === "connect") {
        setConfigOpen(false);
        toast.success("เชื่อม LINE OA และตั้ง Webhook สำเร็จ", { description: "ข้อความใหม่จะเข้ากล่องกลางและ AI Router จะเลือก Admin ที่ตรงกับ Skill" });
      } else toast.success("บันทึกการตั้งค่าแล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกการเชื่อมต่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success("คัดลอก Webhook URL แล้ว")).catch(() => toast.error("คัดลอกไม่สำเร็จ"));
  }

  const activeProviders = providers.filter((item) => item.status === "active");
  const lineAccounts = accounts.filter((item) => item.platform === "line");
  const hasLineAccount = lineAccounts.length > 0;
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SectionTitle eyebrow="One system, one LINE OA" title="เชื่อม LINE Official Account" detail="หนึ่งระบบเชื่อมได้ 1 LINE OA เท่านั้น ต้องใช้ Channel ID, Channel secret และ Channel access token จาก LINE Developers เพื่อรับข้อความเข้ากล่องกลาง" action={<Button disabled={!bots.length || hasLineAccount} onClick={openAddAccount} className="h-11 rounded-xl bg-[#06C755] px-5 text-white hover:bg-[#05a948]"><Plus /> {hasLineAccount ? "เชื่อมครบ 1 บัญชีแล้ว" : "เชื่อม LINE OA"}</Button>} />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {[["Channel ID", "ค่าระบุ Messaging API Channel", KeyRound], ["Channel secret", "ใช้ตรวจสอบลายเซ็น Webhook", ShieldCheck], ["Channel access token", "ใช้รับข้อมูลและส่งคำตอบกลับ LINE", LockKeyhole]].map(([title, detail, Icon]) => <div key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-sm font-black text-slate-800"><Icon className="size-4 text-[#06A84D]" /> {String(title)}</div><p className="mt-2 text-xs leading-5 text-slate-500">{String(detail)}</p></div>)}
      </div>
      {!bots.length ? <div><EmptyState icon={Bot} title="ต้องสร้างแชตบอตก่อน" detail="LINE OA ต้องผูกกับแชตบอตภายในระบบลูกค้าที่กำลังจัดการ" /><Button onClick={onOpenSystems} className="mx-auto mt-4 flex rounded-xl bg-slate-950">ไปสร้างแชตบอต</Button></div> : <>
        <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5"><div><h2 className="font-black text-slate-950">LINE OA ของระบบนี้</h2><p className="mt-1 text-xs text-slate-500">ข้อความเข้า → กล่องกลาง → AI Router → พนักงาน AI ที่ Skill ตรงที่สุด</p></div><Badge className={`ml-auto border-0 ${hasLineAccount ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{lineAccounts.length}/1 บัญชี</Badge></div>
          {lineAccounts.length === 0 ? <div className="p-5"><EmptyState icon={Webhook} title="ยังไม่ได้เชื่อม LINE OA" detail="เตรียมค่าจาก LINE Developers ให้ครบ 3 ค่า แล้วกดเชื่อม LINE OA" /><Button onClick={openAddAccount} className="mx-auto mt-4 flex rounded-xl bg-[#06C755] text-white hover:bg-[#05a948]"><Plus /> เชื่อม LINE OA บัญชีแรก</Button></div> : <div className="divide-y divide-slate-100">{lineAccounts.map((account) => {
            const bot = bots.find((item) => item.id === account.chatbotId);
            const provider = providers.find((item) => item.id === account.aiProviderId);
            const readyAdmins = admins.filter((item) => item.status === "active" && item.activeSkillCount > 0).length;
            return <div key={account.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center"><div className="flex items-center gap-3"><ChannelMark platform="line" /><div className="min-w-0"><p className="truncate font-black text-slate-900">{account.accountName}</p><p className="mt-1 text-xs text-slate-500">{bot?.name || "ไม่พบแชตบอต"}{account.externalId ? ` · ${account.externalId}` : ""}</p><p className="mt-1 font-mono text-xs text-slate-400">Channel ID: {account.channelId || "ยังไม่ครบ"}</p></div></div><div><p className="text-[11px] font-bold text-slate-400">AI ROUTER</p><p className={`mt-1 text-sm font-bold ${readyAdmins ? "text-emerald-700" : "text-amber-700"}`}>{readyAdmins ? `เลือกจาก ${readyAdmins} พนักงาน AI` : "รอเพิ่ม Skill"}</p></div><div><p className="text-[11px] font-bold text-slate-400">AI PROVIDER</p><p className={`mt-1 text-sm font-bold ${provider ? "text-slate-800" : "text-amber-700"}`}>{provider?.name || "ใช้ AI หลัก"}</p></div><div className="flex items-center gap-2"><StatusBadge status={account.status} /><Button variant="outline" className="rounded-xl" onClick={() => { setSelectedId(account.id); setConfigOpen(true); }}>ตั้งค่า</Button></div></div>;
          })}</div>}
        </article>
      </>}

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl"><DialogHeader><DialogTitle>เชื่อม LINE Official Account</DialogTitle><DialogDescription>ระบบนี้รับได้ 1 LINE OA กรุณาคัดลอกค่าจาก LINE Developers → Messaging API มาใส่ให้ครบ</DialogDescription></DialogHeader><div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">ชื่อ LINE OA *</span><Input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="เช่น LINE OA บริษัท ABC" className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">LINE Basic ID</span><Input value={externalId} onChange={(event) => setExternalId(event.target.value)} placeholder="@youraccount (ถ้ามี)" className="h-11 rounded-xl" /></label></div>
        <label><span className="mb-1.5 block text-sm font-bold text-slate-700">แชตบอตภายในระบบ</span><Select value={botId} onValueChange={setBotId}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{bots.map((bot) => <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>)}</SelectContent></Select></label>
        <label><span className="mb-1.5 block text-sm font-bold text-slate-700">Channel ID *</span><Input value={newChannelId} onChange={(event) => setNewChannelId(event.target.value)} placeholder="ตัวเลข Channel ID จาก Basic settings" className="h-11 rounded-xl font-mono text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">Channel secret *</span><Input type="password" autoComplete="new-password" value={newChannelSecret} onChange={(event) => setNewChannelSecret(event.target.value)} placeholder="วาง Channel secret" className="h-11 rounded-xl font-mono text-sm" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">Channel access token *</span><Input type="password" autoComplete="new-password" value={newAccessToken} onChange={(event) => setNewAccessToken(event.target.value)} placeholder="วาง Token แบบ long-lived" className="h-11 rounded-xl font-mono text-sm" /></label></div>
        <label><span className="mb-1.5 block text-sm font-bold text-slate-700">AI Provider ที่ใช้</span><Select value={newProviderId} onValueChange={setNewProviderId}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">ใช้ AI หลักของระบบ</SelectItem>{activeProviders.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.name} · {provider.model}</SelectItem>)}</SelectContent></Select></label>
        <div className="flex gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950"><LockKeyhole className="mt-1 size-5 shrink-0" /><p>Secret และ Token จะถูกเข้ารหัสก่อนบันทึก ไม่แสดงค่าจริงซ้ำบนหน้าจอ ระบบจะตรวจ Token และตั้ง Webhook ให้อัตโนมัติ</p></div>
      </div><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>ยกเลิก</Button><Button disabled={saving} onClick={createAccount} className="bg-[#06C755] text-white hover:bg-[#05a948]">{saving ? <LoaderCircle className="animate-spin" /> : <Zap />} ตรวจสอบและเชื่อม LINE OA</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl"><DialogHeader><DialogTitle>ตั้งค่าการเชื่อมต่อ {selected?.accountName}</DialogTitle><DialogDescription>ข้อความจะเดินทางจาก LINE OA → กล่องกลาง → AI Router → Admin ที่มี Skill ตรงที่สุด</DialogDescription></DialogHeader>{selected && <div className="grid gap-5">
        {selected.webhookUrl && <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-cyan-950"><Webhook className="size-4" /> Webhook URL เฉพาะบัญชี</div><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-xs text-cyan-900">{selected.webhookUrl}</code><Button size="icon-sm" variant="outline" onClick={() => copyWebhook(selected.webhookUrl)} aria-label="คัดลอก"><Copy /></Button></div></div>}
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">Channel ID *</span><Input value={channelId} onChange={(event) => setChannelId(event.target.value)} className="h-11 rounded-xl font-mono text-sm" /></label><div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-500">สถานะข้อมูลลับ</p><div className="mt-2 flex gap-3 text-xs"><span className={selected.hasChannelSecret ? "text-emerald-700" : "text-amber-700"}>{selected.hasChannelSecret ? "✓ มี Secret" : "ยังไม่มี Secret"}</span><span className={selected.hasAccessToken ? "text-emerald-700" : "text-amber-700"}>{selected.hasAccessToken ? "✓ มี Token" : "ยังไม่มี Token"}</span></div></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-slate-700">Channel secret</span><Input type="password" autoComplete="new-password" value={channelSecret} onChange={(event) => setChannelSecret(event.target.value)} placeholder={selected.hasChannelSecret ? "เว้นว่างเพื่อใช้ค่าเดิม" : "วาง Channel secret"} className="h-11 rounded-xl font-mono text-sm" /></label><label><span className="mb-1.5 block text-sm font-bold text-slate-700">Channel access token</span><Input type="password" autoComplete="new-password" value={accessToken} onChange={(event) => setAccessToken(event.target.value)} placeholder={selected.hasAccessToken ? "เว้นว่างเพื่อใช้ค่าเดิม" : "วาง Channel access token"} className="h-11 rounded-xl font-mono text-sm" /></label></div>
        <div className="rounded-2xl border border-slate-200 p-4"><div className="mb-4 flex items-center gap-2"><Link2 className="size-4 text-cyan-700" /><p className="font-black text-slate-900">เส้นทางประมวลผล</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="text-xs font-bold text-cyan-700">AI ROUTER</p><p className="mt-1 text-sm font-black text-cyan-950">เลือกจาก {admins.filter((admin) => admin.status === "active" && admin.activeSkillCount > 0).length} Admin ที่มี Skill</p><p className="mt-1 text-xs text-cyan-800">เลือกใหม่ตามคำถามแต่ละข้อความ</p></div><label><span className="mb-1.5 block text-sm font-bold text-slate-700">AI Provider</span><Select value={providerId} onValueChange={setProviderId}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">ใช้ AI หลัก</SelectItem>{activeProviders.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.name} · {provider.model}</SelectItem>)}</SelectContent></Select></label></div><div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-bold text-slate-800">AI Router และ Admin AI ตอบอัตโนมัติ</p><p className="text-xs text-slate-500">ถ้าไม่มี Admin ที่ตรง ระบบจะส่งเข้าคิวพนักงานจริง</p></div><Switch checked={autoReply} onCheckedChange={setAutoReply} /></div></div>
        {(!admins.some((admin) => admin.activeSkillCount > 0) || !activeProviders.length) && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><CircleAlert className="mt-1 size-5 shrink-0" /><p>ยังเปิดตอบจริงไม่ได้: ต้องมี Admin ที่มี Skill และ AI Provider ที่ทดสอบผ่านอย่างน้อย 1 ตัว</p></div>}
      </div>}<DialogFooter><Button variant="outline" disabled={saving} onClick={() => saveConfiguration("save")}>{saving ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} บันทึกอย่างเดียว</Button><Button disabled={saving} onClick={() => saveConfiguration("connect")} className="bg-[#06C755] text-white hover:bg-[#05a948]">{saving ? <LoaderCircle className="animate-spin" /> : <Zap />} ตรวจสอบและตั้ง Webhook</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
