const SMS_UP_BASE_URL = "https://pub.smsup-plus.com";

export class SmsUpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsUpError";
  }
}

type SmsUpResponse = {
  otpId?: string;
  referenceCode?: string;
  result?: boolean;
  isErrorCount?: boolean;
  isExprCode?: boolean;
  error?: { message?: string; description?: string };
  success?: { message?: string; description?: string };
  status?: { message?: string; description?: string } | string;
};

export function normalizeThaiMobile(value: string) {
  const compact = value.replace(/[^0-9]/g, "");
  if (/^0[689][0-9]{8}$/.test(compact)) return `66${compact.slice(1)}`;
  if (/^66[689][0-9]{8}$/.test(compact)) return compact;
  throw new SmsUpError("กรุณากรอกเบอร์มือถือไทย 10 หลัก เช่น 0812345678");
}

function getConfig() {
  const username = process.env.SMSUP_USERNAME?.trim();
  const password = process.env.SMSUP_PASSWORD?.trim();
  const otcId = process.env.SMSUP_OTC_ID?.trim();
  if (!username || !password || !otcId) {
    throw new SmsUpError("ระบบยังไม่ได้ตั้งค่า SMS Up กรุณาติดต่อผู้ดูแลระบบ");
  }
  return {
    username,
    password,
    otcId,
    baseUrl: process.env.SMSUP_BASE_URL?.trim() || SMS_UP_BASE_URL,
  };
}

async function requestSmsUp(path: string, body: Record<string, unknown>) {
  const config = getConfig();
  const authorization = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${authorization}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new SmsUpError("ไม่สามารถเชื่อมต่อบริการ SMS Up ได้ กรุณาลองใหม่อีกครั้ง");
  }

  const payload = await response.json().catch(() => null) as SmsUpResponse | null;
  const providerMessage = payload?.error?.message || payload?.error?.description;
  if (!response.ok || providerMessage) {
    throw new SmsUpError(providerMessage || "บริการ SMS Up ไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง");
  }
  return payload ?? {};
}

export async function requestOtp(mobile: string) {
  const config = getConfig();
  const payload = await requestSmsUp("/otp/requestOTP", { otcId: config.otcId, mobile });
  if (!payload.otpId) throw new SmsUpError("บริการ SMS Up ไม่ได้ส่งรหัสอ้างอิงกลับมา");
  return { otpId: payload.otpId, referenceCode: payload.referenceCode || "" };
}

export async function resendOtp(otpId: string) {
  const payload = await requestSmsUp("/otp/resendOTP", { otpId });
  if (!payload.otpId) throw new SmsUpError("บริการ SMS Up ไม่ได้ส่งรหัสอ้างอิงกลับมา");
  return { otpId: payload.otpId, referenceCode: payload.referenceCode || "" };
}

export async function verifyOtp(otpId: string, otpCode: string) {
  return requestSmsUp("/otp/verifyOTP", { otpId, otpCode });
}
