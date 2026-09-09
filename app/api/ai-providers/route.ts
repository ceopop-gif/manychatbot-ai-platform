import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { aiProviders, workspaces } from "@/db/schema";
import { generateAiReply } from "@/lib/ai-runtime";
import { encryptSecret } from "@/lib/secret-vault";

const providerKinds = new Set(["openai", "anthropic", "gemini", "custom"]);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อ AI Provider ได้";
}

function safeProvider<T extends typeof aiProviders.$inferSelect>(provider: T) {
  const { apiKeyEncrypted, ...safe } = provider;
  return { ...safe, hasApiKey: Boolean(apiKeyEncrypted) };
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim() ?? "";
    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });
    const providers = await db.select().from(aiProviders).where(and(eq(aiProviders.ownerUserId, user.id), eq(aiProviders.workspaceId, workspaceId))).orderBy(desc(aiProviders.isDefault), desc(aiProviders.createdAt));
    return Response.json({ providers: providers.map(safeProvider) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      workspaceId?: string;
      provider?: string;
      name?: string;
      model?: string;
      baseUrl?: string;
      apiKey?: string;
      isDefault?: boolean;
      temperature?: number;
      maxOutputTokens?: number;
    };
    const workspaceId = payload.workspaceId?.trim() ?? "";
    const providerKind = payload.provider?.trim().toLowerCase() ?? "";
    const name = payload.name?.trim() ?? "";
    const model = payload.model?.trim() ?? "";
    const apiKey = payload.apiKey?.trim() ?? "";
    if (!workspaceId || !providerKinds.has(providerKind) || !name || !model || !apiKey) {
      return Response.json({ error: "กรุณากรอกชื่อ Provider, Model และ API Token ให้ครบ" }, { status: 400 });
    }
    const db = getDb();
    const [workspace] = await db.select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerUserId, user.id))).limit(1);
    if (!workspace) return Response.json({ error: "ไม่พบระบบที่เลือก" }, { status: 404 });
    const existing = await db.select({ id: aiProviders.id }).from(aiProviders).where(and(eq(aiProviders.ownerUserId, user.id), eq(aiProviders.workspaceId, workspaceId))).limit(1);
    const isDefault = payload.isDefault ?? existing.length === 0;
    if (isDefault) {
      await db.update(aiProviders).set({ isDefault: false, updatedAt: new Date().toISOString() }).where(and(eq(aiProviders.ownerUserId, user.id), eq(aiProviders.workspaceId, workspaceId)));
    }
    const [provider] = await db.insert(aiProviders).values({
      id: crypto.randomUUID(),
      ownerUserId: user.id,
      workspaceId,
      provider: providerKind,
      name,
      model,
      baseUrl: payload.baseUrl?.trim() ?? "",
      apiKeyEncrypted: await encryptSecret(apiKey),
      isDefault,
      temperature: clampNumber(payload.temperature, 0, 100, 30),
      maxOutputTokens: clampNumber(payload.maxOutputTokens, 100, 4000, 700),
    }).returning();
    return Response.json({ provider: safeProvider(provider) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as {
      id?: string;
      action?: "test" | "default" | "update";
      name?: string;
      model?: string;
      baseUrl?: string;
      apiKey?: string;
      status?: string;
      temperature?: number;
      maxOutputTokens?: number;
    };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [current] = await db.select().from(aiProviders).where(and(eq(aiProviders.id, id), eq(aiProviders.ownerUserId, user.id))).limit(1);
    if (!current) return Response.json({ error: "ไม่พบ AI Provider" }, { status: 404 });

    if (payload.action === "default") {
      await db.update(aiProviders).set({ isDefault: false, updatedAt: new Date().toISOString() }).where(and(eq(aiProviders.ownerUserId, user.id), eq(aiProviders.workspaceId, current.workspaceId)));
      const [provider] = await db.update(aiProviders).set({ isDefault: true, updatedAt: new Date().toISOString() }).where(eq(aiProviders.id, id)).returning();
      return Response.json({ provider: safeProvider(provider) });
    }

    let apiKeyEncrypted = current.apiKeyEncrypted;
    if (payload.apiKey?.trim()) apiKeyEncrypted = await encryptSecret(payload.apiKey.trim());
    const next = {
      ...current,
      name: payload.name?.trim() || current.name,
      model: payload.model?.trim() || current.model,
      baseUrl: payload.baseUrl?.trim() ?? current.baseUrl,
      apiKeyEncrypted,
      temperature: clampNumber(payload.temperature, 0, 100, current.temperature),
      maxOutputTokens: clampNumber(payload.maxOutputTokens, 100, 4000, current.maxOutputTokens),
    };

    if (payload.action === "test") {
      try {
        const result = await generateAiReply(next, "ตอบสั้น กระชับ เป็นภาษาไทย และตอบเพียงคำว่า “พร้อมใช้งาน”", [{ role: "user", content: "ทดสอบการเชื่อมต่อ" }]);
        const [provider] = await db.update(aiProviders).set({
          name: next.name,
          model: next.model,
          baseUrl: next.baseUrl,
          apiKeyEncrypted,
          temperature: next.temperature,
          maxOutputTokens: next.maxOutputTokens,
          status: "active",
          lastTestedAt: new Date().toISOString(),
          lastError: "",
          updatedAt: new Date().toISOString(),
        }).where(eq(aiProviders.id, id)).returning();
        return Response.json({ provider: safeProvider(provider), test: { ok: true, text: result.text, latencyMs: result.latencyMs } });
      } catch (error) {
        const message = errorMessage(error);
        await db.update(aiProviders).set({ status: "error", lastTestedAt: new Date().toISOString(), lastError: message, updatedAt: new Date().toISOString() }).where(eq(aiProviders.id, id));
        return Response.json({ error: message, test: { ok: false } }, { status: 422 });
      }
    }

    const [provider] = await db.update(aiProviders).set({
      name: next.name,
      model: next.model,
      baseUrl: next.baseUrl,
      apiKeyEncrypted,
      temperature: next.temperature,
      maxOutputTokens: next.maxOutputTokens,
      status: payload.status === "inactive" ? "inactive" : current.status,
      updatedAt: new Date().toISOString(),
    }).where(eq(aiProviders.id, id)).returning();
    return Response.json({ provider: safeProvider(provider) });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
