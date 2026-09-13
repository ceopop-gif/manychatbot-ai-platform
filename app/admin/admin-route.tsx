import PlatformAdminClient, { type AdminView } from "@/app/platform-admin-client";
import { requirePlatformPermission } from "@/app/chatgpt-auth";
import type { PlatformPermission } from "@/lib/auth";

const paths: Record<AdminView, string> = {
  overview: "/admin",
  merchants: "/admin/merchants",
  access: "/admin/access",
  billing: "/admin/billing",
  health: "/admin/health",
  settings: "/admin/settings",
};

const permissions: Record<AdminView, PlatformPermission> = {
  overview: "overview.view",
  merchants: "merchants.view",
  access: "users.manage",
  billing: "billing.view",
  health: "health.view",
  settings: "settings.manage",
};

export default async function AdminRoute({ view }: { view: AdminView }) {
  const user = await requirePlatformPermission(permissions[view], paths[view]);
  return <PlatformAdminClient displayName={user.displayName} initialView={view} />;
}
