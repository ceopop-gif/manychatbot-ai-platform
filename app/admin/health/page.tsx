import AdminRoute from "@/app/admin/admin-route";

export const dynamic = "force-dynamic";

export default function AdminHealthPage() {
  return <AdminRoute view="health" />;
}
