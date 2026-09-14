import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getStorage } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await context.params;
    const [message] = await getDb().select({ mediaKey: messages.mediaKey, mediaContentType: messages.mediaContentType, messageType: messages.messageType, cloudinaryUrl: messages.cloudinaryUrl }).from(messages).where(eq(messages.id, mediaId)).limit(1);
    if (!message || message.messageType !== "image" || !message.mediaKey) return new Response("Not found", { status: 404 });
    const media = await getStorage().get(message.mediaKey);
    if (!media) {
      if (!message.cloudinaryUrl) return new Response("Not found", { status: 404 });
      const response = await fetch(message.cloudinaryUrl);
      if (!response.ok || !response.body) return new Response("Not found", { status: 404 });
      return new Response(response.body, {
        headers: {
          "content-type": message.mediaContentType || "image/jpeg",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    return new Response(media.body, {
      headers: {
        "content-type": message.mediaContentType || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
        ...(media.size ? { "content-length": String(media.size) } : {}),
      },
    });
  } catch {
    return new Response("Media unavailable", { status: 503 });
  }
}
