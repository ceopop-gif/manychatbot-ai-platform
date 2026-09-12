import type { LucideIcon } from "lucide-react";
import { Bot, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const channelMeta = {
  line: { label: "LINE OA", color: "#06C755", letter: "L" },
  telegram: { label: "Telegram", color: "#249BD7", letter: "T" },
  facebook: { label: "Messenger", color: "#1877F2", letter: "f" },
} as const;

export function ChannelMark({ platform, compact = false }: { platform: string; compact?: boolean }) {
  const meta = channelMeta[platform as keyof typeof channelMeta] ?? { label: platform, color: "#64748b", letter: "?" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[10px] font-black text-white ${compact ? "size-6 text-xs" : "size-10 text-sm"}`}
      style={{ background: meta.color }}
      aria-label={meta.label}
    >
      {meta.letter}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-[30px]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active" || status === "open"
      ? "bg-emerald-50 text-emerald-700"
      : status === "error" || status === "escalated"
        ? "bg-rose-50 text-rose-700"
        : status === "closed" || status === "inactive"
          ? "bg-slate-100 text-slate-500"
          : "bg-amber-50 text-amber-700";
  const label: Record<string, string> = {
    active: "พร้อมใช้งาน",
    pending: "รอตั้งค่า",
    error: "เชื่อมต่อผิดพลาด",
    inactive: "ปิดใช้งาน",
    open: "กำลังดูแล",
    escalated: "ส่งต่อเจ้าหน้าที่",
    closed: "ปิดเคส",
  };
  return <Badge className={`border-0 ${tone}`}>{label[status] ?? status}</Badge>;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  detail,
}: {
  icon?: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 font-bold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

export function AdminAvatar({ name, avatarId, color = "emerald", small = false }: { name: string; avatarId?: string; color?: string; small?: boolean }) {
  const palette: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-800",
    indigo: "from-indigo-500 to-indigo-800",
    amber: "from-amber-400 to-orange-600",
    rose: "from-rose-500 to-pink-800",
  };
  const avatarIndex = avatarId && /^avatar-(0[1-9]|10)$/.test(avatarId) ? Number(avatarId.slice(-2)) - 1 : -1;
  if (avatarIndex >= 0) {
    const column = avatarIndex % 5;
    const row = Math.floor(avatarIndex / 5);
    return (
      <span
        className={`inline-flex shrink-0 rounded-2xl bg-cover bg-no-repeat shadow-sm ring-1 ring-slate-200 ${small ? "size-9" : "size-12"}`}
        style={{
          backgroundImage: "url('/admin-ai-avatars-v1.png')",
          backgroundSize: "500% 200%",
          backgroundPosition: `${column * 25}% ${row * 100}%`,
        }}
        role="img"
        aria-label={`ตัวการ์ตูนของ ${name}`}
      />
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-black text-white shadow-sm ${palette[color] ?? palette.emerald} ${small ? "size-9 text-xs" : "size-12 text-sm"}`}>
      {name.trim().slice(0, 2) || <Bot className="size-5" />}
    </span>
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "ยังไม่มีข้อมูล";
  try {
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
