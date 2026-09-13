import DashboardClient, { type View } from "@/app/dashboard-client";
import { requireMerchant } from "@/app/chatgpt-auth";

const paths: Record<View, string> = {
  overview: "/store",
  inbox: "/store/inbox",
  admins: "/store/admins",
  skills: "/store/skills",
  providers: "/store/ai",
  channels: "/store/line",
  payments: "/store/payments",
  reports: "/store/reports",
  systems: "/store/systems",
};

export default async function StoreRoute({ view }: { view: View }) {
  const user = await requireMerchant(paths[view]);
  return <DashboardClient displayName={user.displayName} initialView={view} />;
}
