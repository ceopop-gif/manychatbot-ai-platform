import { redirect } from "next/navigation";
import {
  getAppUser,
  loginPath,
  registerPath,
  type AuthUser,
} from "@/lib/auth";

export type ChatGPTUser = AuthUser;

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  return getAppUser();
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getAppUser();
  if (user) return user;
  redirect(loginPath(returnTo));
}

export async function requireSystemAdmin(returnTo = "/admin"): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  if (user.role !== "admin") redirect("/store");
  return user;
}

export async function requireMerchant(returnTo = "/store"): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  if (user.role === "admin") redirect("/admin");
  return user;
}

export async function getMerchantUser(): Promise<ChatGPTUser | null> {
  const user = await getAppUser();
  return user?.role === "merchant" ? user : null;
}

export const chatGPTSignInPath = loginPath;
export const chatGPTSignUpPath = registerPath;
