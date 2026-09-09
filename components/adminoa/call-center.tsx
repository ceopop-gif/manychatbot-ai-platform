"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Headphones,
  LoaderCircle,
  MessageSquareText,
  Route,
  Search,
  Send,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRecord, ConversationRecord, MessageRecord } from "@/lib/adminoa-types";
import { AdminAvatar, ChannelMark, EmptyState, StatusBadge, formatDateTime } from "./shared";

type InboxFilter = "all" | "unread" | "human";

export function CallCenterView({
  workspaceId,
  conversations,
  admins,
  onReload,
  onNavigate,
}: {
  workspaceId: string;
  conversations: ConversationRecord[];
  admins: AdminRecord[];
  onReload: () => Promise<void>;
  onNavigate: (view: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [mobileThread, setMobileThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];

  const visible = useMemo(() => conversations.filter((item) => {
    const text = `${item.customerName} ${item.lastCustomerMessage} ${item.lastMessagePreview} ${item.channelName} ${item.adminName}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "unread" && item.unreadCount > 0) || (filter === "human" && item.humanTakeover);
    return matchesSearch && matchesFilter;
  }), [conversations, filter, search]);

  useEffect(() => {
    if (!selectedId && conversations[0]) setSelectedId(conversations[0].id);
    if (selectedId && !conversations.some((item) => item.id === selectedId)) setSelectedId(conversations[0]?.id ?? "");
  }, [conversations, selectedId]);

  useEffect(() => {
    if (!selected?.id || !workspaceId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    let firstLoad = true;
    const loadThread = async () => {
      if (firstLoad) setLoadingThread(true);
      try {
        const response = await fetch(`/api/conversations?workspaceId=${encodeURIComponent(workspaceId)}&conversationId=${encodeURIComponent(selected.id)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "โหลดข้อความไม่สำเร็จ");
        if (!cancelled) setMessages(data.messages ?? []);
      } catch (error) {
        if (!cancelled && firstLoad) toast.error(error instanceof Error ? error.message : "โหลดข้อความไม่สำเร็จ");
      } finally {
        if (!cancelled && firstLoad) setLoadingThread(false);
        firstLoad = false;
      }
    };
    void loadThread();
    const timer = window.setInterval(() => void loadThread(), 7000);
    if (selected.unreadCount > 0) {
      fetch("/api/conversations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, markRead: true }),
      }).then(() => onReload()).catch(() => undefined);
    }
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selected?.id, workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, content: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ส่งข้อความไม่สำเร็จ");
      setMessages((items) => [...items, data.message]);
      setReply("");
      await onReload();
      toast.success("พนักงานส่งข้อความกลับ LINE OA แล้ว");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  async function updateConversation(patch: Record<string, unknown>, successMessage?: string) {
    if (!selected) return;
    setActing(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...patch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      await onReload();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setActing(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl py-8">
        <div className="mb-5 rounded-[24px] border border-cyan-100 bg-cyan-50 p-5">
          <div className="flex items-center gap-3"><Route className="size-6 text-cyan-800" /><div><h1 className="font-black text-cyan-950">LINE OA → กล่องกลาง → AI Router</h1><p className="mt-1 text-sm text-cyan-800">ทุกคำถามจะถูกวิเคราะห์และส่งให้ Admin AI ที่มี Skill ตรงที่สุด หากไม่ตรงจะรอพนักงานจริง</p></div></div>
        </div>
        <EmptyState icon={Headphones} title="พร้อมรับข้อความจาก LINE OA" detail="เมื่อเปิด Webhook แล้ว ชื่อลูกค้า คำถาม Admin ที่ถูกเลือก และคำตอบทั้งหมดจะปรากฏในหน้านี้อัตโนมัติ" />
        <div className="mt-4 flex flex-wrap justify-center gap-2"><Button onClick={() => onNavigate("admins")} className="rounded-xl bg-slate-950 hover:bg-slate-800"><UserRoundCog /> สร้างทีม Admin AI</Button><Button onClick={() => onNavigate("channels")} variant="outline" className="rounded-xl"><ChannelMark platform="line" compact /> เชื่อม LINE OA</Button></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
      <section className={`${mobileThread ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-r border-slate-200 md:w-[330px] md:shrink-0 lg:w-[380px]`}>
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between"><div><h1 className="text-xl font-black text-slate-950">ข้อความ LINE OA</h1><p className="text-xs text-slate-500">กล่องกลาง · {admins.filter((item) => item.status === "active" && item.activeSkillCount > 0).length} Admin พร้อม</p></div><Badge className="border-0 bg-emerald-50 text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> อัปเดตสด</Badge></div>
          <div className="relative mt-4"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาลูกค้า คำถาม หรือ Admin" className="h-10 rounded-xl bg-slate-50 pl-9" /></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs">
            {([
              ["all", `ทั้งหมด ${conversations.length}`],
              ["unread", `ข้อความใหม่ ${conversations.filter((item) => item.unreadCount > 0).length}`],
              ["human", `รอพนักงาน ${conversations.filter((item) => item.humanTakeover).length}`],
            ] as const).map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-full px-3 py-1.5 font-bold ${filter === id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.map((item) => (
            <button key={item.id} onClick={() => { setSelectedId(item.id); setMobileThread(true); }} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition ${selected?.id === item.id ? "bg-cyan-50/80" : "hover:bg-slate-50"}`}>
              <div className="relative"><div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">{item.customerName.slice(0, 2)}</div><span className="absolute -bottom-1 -right-1 rounded-full border-2 border-white"><ChannelMark platform={item.platform} compact /></span></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-slate-900">{item.customerName}</p><span className="ml-auto shrink-0 text-[11px] text-slate-400">{formatDateTime(item.lastMessageAt)}</span></div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">{item.lastCustomerMessage || item.lastMessagePreview}</p>
                <div className="mt-2 flex items-center gap-2">{item.humanTakeover ? <Badge className="border-0 bg-amber-100 text-amber-800"><UsersRound /> {item.humanAgentName || "รอพนักงาน"}</Badge> : item.adminName ? <Badge className="border-0 bg-indigo-50 text-indigo-700"><BrainCircuit /> {item.adminName}</Badge> : <StatusBadge status={item.status} />}{item.unreadCount > 0 && <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-cyan-700 text-[10px] font-black text-white">{item.unreadCount}</span>}</div>
              </div>
            </button>
          ))}
          {visible.length === 0 && <div className="p-6 text-center text-sm text-slate-400">ไม่พบข้อความตามตัวกรอง</div>}
        </div>
      </section>

      <section className={`${mobileThread ? "flex" : "hidden"} min-w-0 flex-1 flex-col md:flex`}>
        {selected && <>
          <header className="flex min-h-[72px] items-center gap-3 border-b border-slate-200 px-3 md:px-5">
            <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileThread(false)} aria-label="กลับ"><ArrowLeft /></Button>
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 font-black text-slate-700">{selected.customerName.slice(0, 2)}</div>
            <div className="min-w-0"><h2 className="truncate text-sm font-black text-slate-950">{selected.customerName}</h2><p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><ChannelMark platform={selected.platform} compact /> {selected.channelName || "LINE OA"}</p></div>
            <div className="ml-auto text-right">{selected.humanTakeover ? <><p className="text-xs font-black text-amber-700">โหมดพนักงานจริง</p><p className="text-[10px] text-slate-400">{selected.humanAgentName || "รอผู้รับช่วง"}</p></> : <><p className="text-xs font-black text-emerald-700">AI Router ทำงาน</p><p className="text-[10px] text-slate-400">เลือก Admin ตามคำถาม</p></>}</div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f9fb] p-4 md:p-6">
            <div className="mx-auto max-w-2xl space-y-4">
              {loadingThread ? <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-cyan-700" /></div> : messages.map((message) => {
                const outbound = message.direction === "outbound";
                return (
                  <div key={message.id} className={outbound ? "ml-auto max-w-[88%]" : "flex max-w-[84%] gap-2.5"}>
                    {!outbound && <div className="mt-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-600 shadow-sm">{selected.customerName.slice(0, 1)}</div>}
                    <div className="min-w-0">
                      {outbound && <div className={`mb-1.5 flex items-center justify-end gap-1.5 text-[11px] font-bold ${message.senderType === "system" ? "text-amber-700" : message.senderType === "ai" ? "text-indigo-700" : "text-cyan-700"}`}>{message.senderType === "ai" ? <BrainCircuit className="size-3.5" /> : message.senderType === "system" ? <UsersRound className="size-3.5" /> : <UserRoundCog className="size-3.5" />}{message.senderName || (message.senderType === "ai" ? "Admin AI" : "เจ้าหน้าที่")}{message.skillVersion > 0 && <span>· Skill v{message.skillVersion}</span>}{message.confidence > 0 && <span>· {message.confidence}%</span>}</div>}
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${outbound ? message.senderType === "system" ? "rounded-br-md bg-amber-100 text-amber-950" : message.senderType === "ai" ? "rounded-br-md bg-indigo-950 text-white" : "rounded-br-md bg-cyan-800 text-white" : "rounded-bl-md bg-white text-slate-800"}`}>{message.content}</div>
                      <p className={`mt-1 text-[11px] text-slate-400 ${outbound ? "text-right" : ""}`}>{formatDateTime(message.createdAt)}{message.model ? ` · ${message.model}` : ""}{message.latencyMs ? ` · ${(message.latencyMs / 1000).toFixed(1)} วิ` : ""}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2"><Badge className="border-0 bg-cyan-50 text-cyan-800"><MessageSquareText /> พนักงานตอบเอง</Badge><span className="text-xs text-slate-400">เมื่อส่งข้อความ ระบบจะพัก AI Router สำหรับบทสนทนานี้</span></div>
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100">
              <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="พิมพ์คำตอบถึงลูกค้าจากพนักงานจริง…" className="min-h-20 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0" />
              <div className="mt-2 flex justify-end"><Button disabled={sending || !reply.trim()} onClick={sendReply} className="rounded-xl bg-cyan-700 hover:bg-cyan-800">{sending ? <LoaderCircle className="animate-spin" /> : <Send />} ส่งกลับ LINE</Button></div>
            </div>
          </div>
        </>}
      </section>

      {selected && <aside className="hidden w-[320px] shrink-0 border-l border-slate-200 xl:flex xl:flex-col">
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-500">ผลวิเคราะห์คำถามล่าสุด</p>
          <div className="mt-4 flex items-center gap-3">{selected.humanTakeover ? <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><UsersRound className="size-5" /></span> : selected.adminName ? <AdminAvatar name={selected.adminName} avatarId={selected.adminAvatarId} small /> : <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Route className="size-5" /></span>}<div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{selected.humanTakeover ? selected.humanAgentName || "รอพนักงานรับช่วง" : selected.adminName || "รอ AI Router วิเคราะห์"}</p><p className="truncate text-xs text-slate-500">{selected.humanTakeover ? "AI ไม่ตอบต่อจนกว่าจะคืนงาน" : selected.skillName || "จะเลือกใหม่เมื่อมีคำถาม"}</p></div></div>
        </div>
        <div className="space-y-4 p-5">
          {selected.humanTakeover ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-amber-900"><UsersRound className="size-4" /> ส่งต่อพนักงานจริง</div><p className="mt-2 text-xs leading-5 text-amber-800">{selected.routingReason || "ไม่มี Admin AI ที่ตรงหรือมีข้อมูลมั่นใจพอ"}</p></div> : <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-indigo-950"><CheckCircle2 className="size-4" /> Router เลือก {selected.adminName || "Admin"}</div><p className="mt-2 text-xs leading-5 text-indigo-800">{selected.routingReason || "จับคู่จากความหมายของคำถามและขอบเขต Skill"}</p>{selected.routingConfidence > 0 && <div className="mt-3 flex items-center justify-between text-xs font-bold text-indigo-900"><span>ความมั่นใจ</span><span>{selected.routingConfidence}%</span></div>}</div>}

          {!selected.humanTakeover ? <Button disabled={acting} onClick={() => updateConversation({ takeover: "claim" }, "รับช่วงจาก AI Router แล้ว")} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700"><UsersRound /> ให้พนักงานรับช่วง</Button> : <div className="grid gap-2">{!selected.humanAgentName && <Button disabled={acting} onClick={() => updateConversation({ takeover: "claim" }, "คุณรับช่วงบทสนทนานี้แล้ว")} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700"><UserRoundCog /> รับงานนี้</Button>}<Button disabled={acting} variant="outline" onClick={() => updateConversation({ takeover: "release" }, "คืนให้ AI Router แล้ว")} className="w-full rounded-xl"><BrainCircuit /> คืนให้ AI Router</Button></div>}

          <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-500">สถานะเคส</p><div className="mt-2 flex items-center justify-between"><StatusBadge status={selected.status} /><span className="text-xs text-slate-400">{selected.unreadCount ? `${selected.unreadCount} ข้อความใหม่` : "อ่านแล้ว"}</span></div></div>
          <div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="flex items-center gap-2 text-sm font-bold"><Clock3 className="size-4 text-cyan-300" /> แชตล่าสุด</div><p className="mt-2 text-xs text-slate-300">{formatDateTime(selected.lastMessageAt)}</p><p className="mt-3 break-all text-[11px] text-slate-500">LINE user: {selected.externalUserId}</p></div>
        </div>
      </aside>}
    </div>
  );
}
