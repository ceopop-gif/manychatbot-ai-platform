import AuthClient from "@/app/auth-client";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <AuthClient mode="login" scope="admin" />;
}
