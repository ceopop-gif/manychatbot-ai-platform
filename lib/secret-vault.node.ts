const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getKeyMaterial() {
  const value = process.env.ADMINOA_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error("ยังไม่ได้ตั้งค่ากุญแจเข้ารหัส ADMINOA_ENCRYPTION_KEY");
  const bytes = fromBase64Url(value);
  if (bytes.byteLength !== 32) {
    throw new Error("ADMINOA_ENCRYPTION_KEY ต้องเป็นกุญแจแบบ Base64URL ขนาด 32 ไบต์");
  }
  return bytes;
}

async function getCryptoKey() {
  return crypto.subtle.importKey("raw", getKeyMaterial(), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  if (!value) return "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getCryptoKey(),
    textEncoder.encode(value)
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  if (!value) return "";
  const [version, ivText, encryptedText] = value.split(".");
  if (version !== "v1" || !ivText || !encryptedText) throw new Error("รูปแบบข้อมูลลับไม่ถูกต้อง");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivText) },
    await getCryptoKey(),
    fromBase64Url(encryptedText)
  );
  return textDecoder.decode(decrypted);
}

export function maskedSecret(value: string) {
  return value ? "••••••••••••" : "";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}