import DashboardClient from "@/app/dashboard-client";
import { requireChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireChatGPTUser("/admin");
  return <DashboardClient />;
}
