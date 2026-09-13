import { env } from "cloudflare:workers";
import type { FileStorage } from "./types";

export function getStorage(): FileStorage {
  if (!env.BUCKET) throw new Error("พื้นที่จัดเก็บไฟล์ยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง");

  return {
    put: async (key, value, contentType) => {
      await env.BUCKET!.put(key, value, { httpMetadata: { contentType } });
    },
    get: async (key) => env.BUCKET!.get(key),
    delete: async (key) => {
      await env.BUCKET!.delete(key);
    },
  };
}