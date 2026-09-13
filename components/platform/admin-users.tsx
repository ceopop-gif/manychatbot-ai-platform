"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type AdminRole = "owner" | "manager" | "support";
type PermissionId = "overview.view" | "merchants.view" | "users.manage" | "billing.view" | "health.view" | "settings.manage";
type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  adminRole: AdminRole;
  permissions: PermissionId[];
  createdAt: string;
};
type FormState = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  adminRole: AdminRole;
  permissions: PermissionId[];
};

const permissionOptions: Array<{ id: PermissionId; label: string }> = [
  { id: "overview.view", label: "ดูภาพรวมแพลตฟอร์ม" },
  { id: "merchants.view", label: "ดูแลร้านค้า" },
  { id: "users.manage", label: "จัดการผู้ใช้แอดมิน" },
  { id: "billing.view", label: "ดูแพ็กเกจและรายได้" },
  { id: "health.view", label: "ดูสุขภาพระบบ" },
  { id: "settings.manage", label: "จัดการตั้งค่าแพลตฟอร์ม" },
];

const roleOptions: Array<{ id: AdminRole; label: string; detail: string }> = [
  { id: "owner", label: "Owner", detail: "สิทธิ์เต็มทั้งระบบ" },
  { id: "manager", label: "Manager", detail: "ดูภาพรวม ร้านค้า รายได้ และสุขภาพระบบ" },
  { id: "support", label: "Support", detail: "ช่วยดูแลร้านค้าและตรวจสอบระบบ" },
];

const allPermissions = permissionOptions.map((permission) => permission.id);
const defaultForm: FormState = {
  username: "",
  displayName: "",
  email: "",
  password: "",
  adminRole: "support",
  permissions: ["overview.view", "merchants.view", "health.view"],
};

function roleTone(role: AdminRole) {
  return role === "owner" ? "bg-violet-100 text-violet-700" : role === "manager" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700";
}

function roleLabel(role: AdminRole) {
  return roleOptions.find((item) => item.id === role)?.label ?? role;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch("/api/platform/admin-users", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "โหลดผู้ใช้แอดมินไม่สำเร็จ");
      setUsers(payload.users ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "โหลดผู้ใช้แอดมินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(initialLoad);
  }, []);

  const selectedRole = useMemo(() => roleOptions.find((role) => role.id === form.adminRole), [form.adminRole]);

  function updateRole(adminRole: AdminRole) {
    setForm((current) => ({ ...current, adminRole, permissions: adminRole === "owner" ? allPermissions : adminRole === "manager" ? ["overview.view", "merchants.view", "billing.view", "health.view"] : ["overview.view", "merchants.view", "health.view"] }));
  }

  function togglePermission(permission: PermissionId) {
    if (form.adminRole === "owner") return;
    setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] }));
  }

  async function createAdmin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/platform/admin-users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "สร้างผู้ใช้แอดมินไม่สำเร็จ");
      toast.success("สร้างผู้ใช้แอดมินเรียบร้อยแล้ว");
      setOpen(false);
      setForm(defaultForm);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "สร้างผู้ใช้แอดมินไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-indigo-600" /><h3 className="text-xl font-black text-slate-950">ผู้ใช้ฝั่งแอดมิน</h3></div>
        <p className="mt-1 text-sm leading-6 text-slate-500">สร้างบัญชีให้ทีมงานเข้ามาช่วยดูแลแพลตฟอร์ม พร้อมกำหนดบทบาทและสิทธิ์รายเมนู</p>
      </div>
      <Button type="button" className="cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="size-4" />สร้างผู้ใช้แอดมิน</Button>
    </div>
    {loading ? <div className="flex items-center justify-center py-12 text-sm font-semibold text-slate-500"><LoaderCircle className="mr-2 size-5 animate-spin" />กำลังโหลดบัญชีแอดมิน</div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{users.map((user) => <div key={user.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-black text-slate-950">{user.displayName}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${roleTone(user.adminRole)}`}>{roleLabel(user.adminRole)}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{user.status === "active" ? "ใช้งานอยู่" : "ระงับ"}</span></div><p className="mt-1 text-sm text-slate-500">@{user.username}{user.email ? ` · ${user.email}` : ""}</p><p className="mt-2 text-xs text-slate-400">สร้างเมื่อ {formatDate(user.createdAt)}</p></div></div><div className="mt-3 flex flex-wrap gap-1.5">{user.permissions.map((permission) => <span key={permission} className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">{permissionOptions.find((item) => item.id === permission)?.label ?? permission}</span>)}</div></div>)}</div>}
    {!loading && users.length === 0 && <p className="py-10 text-center text-sm text-slate-500">ยังไม่มีผู้ใช้แอดมินเพิ่มเติม</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl"><DialogHeader><DialogTitle className="text-2xl font-black text-slate-950">สร้างผู้ใช้แอดมิน</DialogTitle><DialogDescription>บัญชีนี้จะใช้เข้าสู่ระบบแอดมินเท่านั้น ไม่สามารถเข้าถึงข้อมูลร้านค้าแทนเจ้าของร้านได้</DialogDescription></DialogHeader><form onSubmit={createAdmin} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-bold text-slate-700">Username<Input required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="เช่น support01" /></label><label className="space-y-2 text-sm font-bold text-slate-700">ชื่อที่แสดง<Input required maxLength={100} value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="เช่น ทีม Support" /></label><label className="space-y-2 text-sm font-bold text-slate-700">อีเมล (ถ้ามี)<Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="support@example.com" /></label><label className="space-y-2 text-sm font-bold text-slate-700">รหัสผ่าน<Input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="อย่างน้อย 8 ตัว" /><span className="block text-xs font-normal text-slate-500">ต้องมี A-Z, a-z และตัวเลข</span></label></div><div><p className="text-sm font-black text-slate-800">บทบาท</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{roleOptions.map((role) => <button key={role.id} type="button" onClick={() => updateRole(role.id)} className={`cursor-pointer rounded-xl border p-3 text-left transition ${form.adminRole === role.id ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300"}`}><span className="block text-sm font-black text-slate-900">{role.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{role.detail}</span></button>)}</div><p className="mt-2 text-xs text-slate-500">เลือกอยู่: <span className="font-black text-indigo-700">{selectedRole?.label}</span> · {selectedRole?.detail}</p></div><div><p className="text-sm font-black text-slate-800">สิทธิ์ที่อนุญาต</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{permissionOptions.map((permission) => <label key={permission.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${form.permissions.includes(permission.id) ? "border-indigo-200 bg-indigo-50/70" : "border-slate-200"}`}><input type="checkbox" checked={form.permissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} disabled={form.adminRole === "owner"} className="size-4 accent-indigo-600" /><span className="font-semibold text-slate-700">{permission.label}</span></label>)}</div>{form.adminRole === "owner" && <p className="mt-2 text-xs font-semibold text-violet-700">Owner จะได้รับสิทธิ์ทั้งหมดโดยอัตโนมัติ</p>}</div><DialogFooter><Button type="button" variant="outline" className="cursor-pointer rounded-xl" onClick={() => setOpen(false)}>ยกเลิก</Button><Button type="submit" disabled={saving} className="cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-700">{saving && <LoaderCircle className="size-4 animate-spin" />}สร้างบัญชี</Button></DialogFooter></form></DialogContent></Dialog>
  </section>;
}
