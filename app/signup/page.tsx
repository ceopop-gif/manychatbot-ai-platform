import { requireChatGPTUser } from "@/app/chatgpt-auth";
import SignupClient from "./signup-client";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await requireChatGPTUser("/signup");
  return <SignupClient defaultName={user.displayName} defaultEmail={user.email} />;
}
