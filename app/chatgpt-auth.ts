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

export const chatGPTSignInPath = loginPath;
export const chatGPTSignUpPath = registerPath;
