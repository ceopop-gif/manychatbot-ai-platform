import PlatformAdminClient, { type AdminView } from "@/app/platform-admin-client";
import { requireSystemAdmin } from "@/app/chatgpt-auth";

const paths: Record<AdminView, string> = {
  overview: "/admin",
  merchants: "/admin/merchants",
  access: "/admin/access",
  billing: "/admin/billing",
  health: "/admin/health",
  settings: "/admin/settings",
};

export default async function AdminRoute({ view }: { view: AdminView }) {
  const user = await requireSystemAdmin(paths[view]);
  return <PlatformAdminClient displayName={user.displayName} initialView={view} />;
}
