"use client";

import { useState } from "react";
import { CheckCircle2, Clock3, Copy, CreditCard, ExternalLink, KeyRound, Link2, LoaderCircle, MessageCircle, Plus, Settings2, ShieldCheck, WalletCards, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PaymentData, PaymentOrderRecord } from "@/lib/adminoa-types";
import { EmptyState, SectionTitle } from "./shared";

function money(satang: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(satang / 100);
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  pending: { label: "รอชำระ", className: "bg-amber-50 text-amber-700", icon: Clock3 },
  paid: { label: "ชำระแล้ว", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "ยกเลิก", className: "bg-slate-100 text-slate-600", icon: XCircle },
  failed: { label: "ไม่สำเร็จ", className: "bg-rose-50 text-rose-700", icon: XCircle },
  expired: { label: "หมดอายุ", className: "bg-slate-100 text-slate-600", icon: Clock3 },
  refunded: { label: "คืนเงิน", className: "bg-indigo-50 text-indigo-700", icon: CreditCard },
};

export function PaymentsView({ workspaceId, data, onReload }: { workspaceId: string; data: PaymentData | null; onReload: () => Promise<void> }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [checkoutBaseUrl, setCheckoutBaseUrl] = useState("https://chatpospay.com");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mode, setMode] = useState<"test" | "live">("test");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState("30");

  function openSettings() {
    setMerchantId(data?.profile?.merchantId ?? "");
    setCheckoutBaseUrl(data?.profile?.checkoutBaseUrl ?? "https://chatpospay.com");
    setWebhookSecret("");
    setMode(data?.profile?.mode ?? "test");
    setSettingsOpen(true);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch("/api/payment-settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, merchantId, checkoutBaseUrl, webhookSecret, mode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึก ChatPOS ไม่สำเร็จ");
      await onReload();
      setWebhookSecret("");
      setSettingsOpen(false);
      toast.success("เชื่อม ChatPOS แล้ว", { description: mode === "live" ? "พร้อมสร้างลิงก์รับเงินจริง" : "อยู่ในโหมดทดสอบ" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "บันทึก ChatPOS ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function createPayment() {
    setSaving(true);
    try {
      const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, customerName, customerPhone, description, amount: Number(amount), expiresInMinutes: Number(expiresInMinutes) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "สร้างลิงก์ชำระเงินไม่สำเร็จ");
      await onReload();
      setCreateOpen(false);
      setCustomerName("");
      setCustomerPhone("");
      setDescription("");
      setAmount("");
      const copied = await copyLink(result.order.checkoutUrl, false);
      toast.success("สร้างลิงก์ ChatPOS แล้ว", { description: copied ? "คัดลอกลิงก์ไว้ในคลิปบอร์ดแล้ว" : "กดปุ่มคัดลอกจากรายการได้" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้างลิงก์ชำระเงินไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(value: string, notify = true) {
    try {
      await navigator.clipboard.writeText(value);
      if (notify) toast.success("คัดลอกลิงก์แล้ว");
      return true;
    } catch {
      toast.error("อุปกรณ์ไม่อนุญาตให้คัดลอกอัตโนมัติ");
      return false;
    }
  }

  async function cancelOrder(order: PaymentOrderRecord) {
    if (!window.confirm(`ยืนยันยกเลิกรายการ ${order.reference}?`)) return;
    const response = await fetch("/api/payments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: order.id, action: "cancel" }) });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error || "ยกเลิกรายการไม่สำเร็จ");
    await onReload();
    toast.success("ยกเลิกรายการแล้ว");
  }

  function shareLine(order: PaymentOrderRecord) {
    const text = `${order.description}\nยอดชำระ ${money(order.amountSatang)}\n${order.checkoutUrl}`;
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const profileReady = data?.profile?.status === "active";
  return (
    <div className="mx-auto w-full max-w-7xl">
      <SectionTitle eyebrow="ChatPOS payment" title="รับชำระเงินจากบทสนทนา" detail="สร้างลิงก์ ChatPOS ส่งให้ลูกค้าทาง LINE OA และติดตามสถานะจาก Webhook แยกตามระบบลูกค้า" action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={openSettings} className="h-11 rounded-xl"><Settings2 /> ตั้งค่า ChatPOS</Button><Button disabled={!profileReady} onClick={() => setCreateOpen(true)} className="h-11 rounded-xl bg-[#06C755] px-5 hover:bg-[#05b84e]"><Plus /> สร้างลิงก์ชำระ</Button></div>} />

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[22px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">ยอดชำระสำเร็จ</span><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><WalletCards className="size-5" /></span></div><strong className="mt-3 block text-3xl font-black">{money(data?.summary.paidAmountSatang ?? 0)}</strong><p className="mt-1 text-xs text-slate-400">จาก {data?.summary.paidCount ?? 0} รายการล่าสุด</p></article>
        <article className="rounded-[22px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">กำลังรอชำระ</span><span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="size-5" /></span></div><strong className="mt-3 block text-3xl font-black">{data?.summary.pendingCount ?? 0}</strong><p className="mt-1 text-xs text-slate-400">ตรวจสถานะกลับอัตโนมัติ</p></article>
        <article className="rounded-[22px] border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">สถานะ ChatPOS</span><span className={`flex size-10 items-center justify-center rounded-xl ${profileReady ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><ShieldCheck className="size-5" /></span></div><strong className={`mt-3 block text-xl font-black ${profileReady ? "text-emerald-700" : "text-slate-700"}`}>{profileReady ? "พร้อมใช้งาน" : "รอตั้งค่า"}</strong><p className="mt-1 text-xs text-slate-400">{data?.profile?.mode === "live" ? "โหมดรับเงินจริง" : "โหมดทดสอบ"}</p></article>
      </div>

      {!profileReady && <div className="mt-5 flex flex-col items-start gap-4 rounded-[22px] border border-[#bde5cc] bg-[#effff5] p-5 sm:flex-row sm:items-center"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#06C755] text-white"><KeyRound className="size-5" /></span><div><h2 className="font-black text-[#116036]">เชื่อมบัญชี ChatPOS ก่อนรับเงิน</h2><p className="mt-1 text-sm leading-6 text-slate-600">เพิ่ม Merchant ID, Checkout URL และ Webhook Secret ของร้าน ระบบจะเก็บข้อมูลลับแบบเข้ารหัส</p></div><Button onClick={openSettings} className="sm:ml-auto bg-[#102218] hover:bg-[#183725]">เริ่มตั้งค่า</Button></div>}

      <article className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-black">รายการชำระเงิน</h2><p className="mt-1 text-xs text-slate-500">แสดง 100 รายการล่าสุดของระบบที่เลือก</p></div><Badge variant="outline">{data?.orders.length ?? 0} รายการ</Badge></div>
        {!data?.orders.length ? <div className="p-5"><EmptyState icon={CreditCard} title="ยังไม่มีรายการชำระเงิน" detail={profileReady ? "กดสร้างลิงก์ชำระ เพื่อส่งให้ลูกค้าทาง LINE OA" : "ตั้งค่า ChatPOS ก่อน แล้วจึงเริ่มสร้างลิงก์รับเงิน"} /></div> : <div className="divide-y divide-slate-100">{data.orders.map((order) => { const meta = statusMeta[order.status] ?? statusMeta.pending; const StatusIcon = meta.icon; return <div key={order.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">{order.customerName || "ลูกค้า"}</p><Badge className={`border-0 ${meta.className}`}><StatusIcon className="size-3.5" /> {meta.label}</Badge><span className="font-mono text-xs font-bold text-slate-400">{order.reference}</span></div><p className="mt-1 truncate text-sm text-slate-600">{order.description}</p><p className="mt-1 text-xs text-slate-400">สร้าง {dateTime(order.createdAt)} · หมดอายุ {dateTime(order.expiresAt)}</p></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><strong className="mr-2 text-xl font-black">{money(order.amountSatang)}</strong>{order.status === "pending" && <><Button size="sm" variant="outline" onClick={() => copyLink(order.checkoutUrl)} className="rounded-xl"><Copy /> คัดลอก</Button><Button size="sm" onClick={() => shareLine(order)} className="rounded-xl bg-[#06C755] hover:bg-[#05b84e]"><MessageCircle /> ส่ง LINE</Button><Button size="icon-sm" variant="ghost" onClick={() => window.open(order.checkoutUrl, "_blank", "noopener,noreferrer")} aria-label="เปิดหน้าชำระ"><ExternalLink /></Button><Button size="icon-sm" variant="ghost" onClick={() => cancelOrder(order)} className="text-rose-600" aria-label="ยกเลิก"><XCircle /></Button></>}</div></div>; })}</div>}
      </article>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl sm:max-w-xl"><DialogHeader><DialogTitle>ตั้งค่า ChatPOS</DialogTitle><DialogDescription>ข้อมูลนี้แยกตามระบบลูกค้า และ Secret จะไม่ถูกส่งกลับมาแสดงอีก</DialogDescription></DialogHeader><div className="grid gap-4"><label><span className="mb-1.5 block text-sm font-bold">Merchant ID *</span><Input value={merchantId} onChange={(event) => setMerchantId(event.target.value)} className="h-11 rounded-xl font-mono" /></label><label><span className="mb-1.5 block text-sm font-bold">Checkout URL *</span><Input value={checkoutBaseUrl} onChange={(event) => setCheckoutBaseUrl(event.target.value)} className="h-11 rounded-xl font-mono text-sm" /></label><label><span className="mb-1.5 block text-sm font-bold">Webhook Secret {data?.profile?.hasWebhookSecret ? "(เว้นว่างเพื่อใช้ค่าเดิม)" : "*"}</span><Input type="password" value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} className="h-11 rounded-xl font-mono" /></label><label><span className="mb-1.5 block text-sm font-bold">โหมด</span><Select value={mode} onValueChange={(value) => setMode(value as "test" | "live")}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="test">ทดสอบ</SelectItem><SelectItem value="live">รับเงินจริง</SelectItem></SelectContent></Select></label><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">WEBHOOK URL</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{data?.webhookUrl || "/api/payments/chatpos/webhook"}</code><Button size="icon-sm" variant="outline" onClick={() => copyLink(data?.webhookUrl || "")}><Copy /></Button></div></div></div><DialogFooter><Button variant="outline" onClick={() => setSettingsOpen(false)}>ปิด</Button><Button disabled={saving} onClick={saveSettings} className="bg-[#06C755] hover:bg-[#05b84e]">{saving ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} บันทึกการเชื่อมต่อ</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl sm:max-w-xl"><DialogHeader><DialogTitle>สร้างลิงก์ชำระผ่าน ChatPOS</DialogTitle><DialogDescription>ใส่ยอดและรายละเอียด แล้วคัดลอกหรือแชร์ลิงก์ให้ลูกค้าทาง LINE</DialogDescription></DialogHeader><div className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold">ชื่อลูกค้า</span><Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="h-11 rounded-xl" /></label><label><span className="mb-1.5 block text-sm font-bold">เบอร์โทร</span><Input inputMode="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="h-11 rounded-xl" /></label></div><label><span className="mb-1.5 block text-sm font-bold">รายละเอียด *</span><Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="เช่น ค่าสินค้า Order #1024" className="h-11 rounded-xl" /></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold">ยอดชำระ (บาท) *</span><Input type="number" min="1" max="50000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-11 rounded-xl text-lg font-black" /></label><label><span className="mb-1.5 block text-sm font-bold">ลิงก์มีอายุ</span><Select value={expiresInMinutes} onValueChange={setExpiresInMinutes}><SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 นาที</SelectItem><SelectItem value="30">30 นาที</SelectItem><SelectItem value="60">1 ชั่วโมง</SelectItem><SelectItem value="1440">24 ชั่วโมง</SelectItem></SelectContent></Select></label></div></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>ยกเลิก</Button><Button disabled={saving || !Number(amount)} onClick={createPayment} className="bg-[#06C755] hover:bg-[#05b84e]">{saving ? <LoaderCircle className="animate-spin" /> : <Link2 />} สร้างและคัดลอกลิงก์</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
