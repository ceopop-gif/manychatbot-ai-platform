import { destroyCurrentSession, isSameOriginRequest } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  await destroyCurrentSession();
  return Response.json({ ok: true });
}
