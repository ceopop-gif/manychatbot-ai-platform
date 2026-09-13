import AdminRoute from "./admin-route";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return <AdminRoute view="overview" />;
}
