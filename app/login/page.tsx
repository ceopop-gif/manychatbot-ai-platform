import AuthClient from "@/app/auth-client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <AuthClient mode="login" scope="merchant" />;
}
