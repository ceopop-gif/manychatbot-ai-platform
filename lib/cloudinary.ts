import { createHash } from "node:crypto";

export type CloudinaryAsset = {
  publicId: string;
  secureUrl: string;
  resourceType: "image" | "raw";
};

type UploadOptions = {
  ownerUserId: string;
  workspaceId: string;
  category: "admin-documents" | "conversation-media";
  assetId: string;
  fileName: string;
  bytes: ArrayBuffer;
  contentType: string;
};

let configured = false;
let available: boolean | undefined;
let config: { cloudName: string; apiKey: string; apiSecret: string } | null = null;

function getConfig() {
  if (available === false) return null;
  if (!configured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
    if (cloudinaryUrl) {
      let parsed: URL;
      try {
        parsed = new URL(cloudinaryUrl);
      } catch {
        throw new Error("CLOUDINARY_URL is invalid");
      }
      if (parsed.protocol !== "cloudinary:" || !parsed.hostname || !parsed.username || !parsed.password) {
        throw new Error("CLOUDINARY_URL is invalid");
      }
      config = {
        cloudName: parsed.hostname,
        apiKey: decodeURIComponent(parsed.username),
        apiSecret: decodeURIComponent(parsed.password),
      };
    } else if (cloudName && apiKey && apiSecret) {
      config = { cloudName, apiKey, apiSecret };
    } else {
      available = false;
      return null;
    }
    configured = true;
  }
  return config;
}

function safeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120) || "unknown";
}

function safeFileName(value: string) {
  return value
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 100) || "file";
}

export async function uploadToCloudinary(options: UploadOptions): Promise<CloudinaryAsset> {
  const cloudinaryConfig = getConfig();
  if (!cloudinaryConfig) throw new Error("Cloudinary is required for file uploads");
  const resourceType = options.contentType.startsWith("image/") ? "image" : "raw";
  const folder = `manychatbot/${safeSegment(options.ownerUserId)}/${safeSegment(options.workspaceId)}/${options.category}`;
  const publicId = `${safeSegment(options.assetId)}-${safeFileName(options.fileName)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, public_id: publicId, timestamp, type: "upload" };
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(options.bytes)], { type: options.contentType }), safeFileName(options.fileName));
  form.append("api_key", cloudinaryConfig.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("type", "upload");
  form.append("signature", sign(params, cloudinaryConfig.apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/${resourceType}/upload`, { method: "POST", body: form });
  const result = await response.json().catch(() => ({})) as { public_id?: string; secure_url?: string; error?: { message?: string } };
  if (!response.ok || !result.public_id || !result.secure_url) {
    throw new Error(`Cloudinary upload failed (HTTP ${response.status}) ${result.error?.message || "unknown error"}`.trim());
  }
  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    resourceType,
  };
}

export async function deleteFromCloudinary(publicId: string, resourceType: "image" | "raw" = "image") {
  if (!publicId) return;
  const cloudinaryConfig = getConfig();
  if (!cloudinaryConfig) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp, type: "upload" };
  const form = new FormData();
  form.append("api_key", cloudinaryConfig.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("type", "upload");
  form.append("invalidate", "true");
  form.append("signature", sign(params, cloudinaryConfig.apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/${resourceType}/destroy`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary delete failed (HTTP ${response.status})`);
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const canonical = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${canonical}${apiSecret}`).digest("hex");
}
