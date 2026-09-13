import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { adminDocuments, adminProfiles } from "@/db/schema";
import {
  MAX_ADMIN_DOCUMENTS,
  MAX_EXTRACTED_CHARACTERS,
  MAX_MARKDOWN_FILE_BYTES,
  MAX_PDF_FILE_BYTES,
  MAX_PDF_PAGES,
  MAX_TOTAL_FILE_BYTES,
  MAX_TOTAL_KNOWLEDGE_CHARACTERS,
  adminDocumentType,
  maxFileBytes,
  type AdminDocumentType,
} from "@/lib/admin-document-limits";
import { recompileAdminSkills } from "@/lib/recompile-admin-skills";
import { getStorage } from "@/lib/storage";

type ParsedUpload = {
  adminId: string;
  fileName: string;
  fileType: AdminDocumentType;
  mimeType: string;
  bytes: ArrayBuffer;
  content: string;
  pageCount: number;
  isTruncated: boolean;
};

class UploadValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ไม่สามารถบันทึกไฟล์ความรู้ได้";
}

function cleanFileName(value: string) {
  return value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) ?? "";
}

function safeDocument(document: typeof adminDocuments.$inferSelect) {
  return {
    id: document.id,
    workspaceId: document.workspaceId,
    adminId: document.adminId,
    fileName: document.fileName,
    fileType: document.fileType,
    mimeType: document.mimeType,
    content: document.content,
    sizeBytes: document.sizeBytes,
    pageCount: document.pageCount,
    isTruncated: document.isTruncated,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function contentDisposition(fileName: string, documentId: string, fileType: AdminDocumentType) {
  const extension = fileType === "pdf" ? "pdf" : "md";
  const fallbackName = `employee-knowledge-${documentId.slice(0, 8)}.${extension}`;
  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function asArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function parseUpload(request: Request): Promise<ParsedUpload> {
  const requestType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (requestType.includes("application/json")) {
    const payload = (await request.json()) as { adminId?: string; fileName?: string; content?: string };
    const fileName = cleanFileName(payload.fileName ?? "");
    const fileType = adminDocumentType(fileName);
    if (fileType !== "markdown") throw new UploadValidationError("การส่งข้อมูลแบบเดิมรองรับเฉพาะไฟล์ .md");
    let content = payload.content?.replace(/\0/g, "").trim() ?? "";
    const isTruncated = content.length > MAX_EXTRACTED_CHARACTERS;
    if (isTruncated) content = content.slice(0, MAX_EXTRACTED_CHARACTERS);
    const encoded = new TextEncoder().encode(content);
    return {
      adminId: payload.adminId?.trim() ?? "",
      fileName,
      fileType,
      mimeType: "text/markdown",
      bytes: asArrayBuffer(encoded),
      content,
      pageCount: 0,
      isTruncated,
    };
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new UploadValidationError("กรุณาเลือกไฟล์ .md หรือ .pdf");
  const fileName = cleanFileName(file.name);
  const fileType = adminDocumentType(fileName);
  if (!fileType) throw new UploadValidationError("รองรับเฉพาะไฟล์ .md และ .pdf");
  if (file.size > maxFileBytes(fileType)) {
    throw new UploadValidationError(fileType === "pdf" ? "ไฟล์ PDF ต้องมีขนาดไม่เกิน 5 MB" : "ไฟล์ Markdown ต้องมีขนาดไม่เกิน 200 KB", 413);
  }

  const bytes = await file.arrayBuffer();
  let content = "";
  let pageCount = 0;
  let isTruncated = form.get("isTruncated") === "true";
  if (fileType === "pdf") {
    const signature = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
    if (!signature.includes("%PDF-")) throw new UploadValidationError("ไฟล์ที่เลือกไม่ใช่ PDF ที่ถูกต้อง");
    content = String(form.get("extractedText") ?? "").replace(/\0/g, "").trim();
    pageCount = Math.max(0, Math.min(MAX_PDF_PAGES, Math.round(Number(form.get("pageCount")) || 0)));
    if (!pageCount) throw new UploadValidationError("ไม่สามารถอ่านจำนวนหน้าของ PDF ได้");
    if (!content) throw new UploadValidationError("PDF นี้ไม่มีข้อความที่ AI อ่านได้ กรุณาใช้ PDF ที่ค้นหาหรือคัดลอกข้อความได้");
  } else {
    content = new TextDecoder("utf-8").decode(bytes).replace(/\0/g, "").trim();
  }

  if (content.length > MAX_EXTRACTED_CHARACTERS) {
    content = content.slice(0, MAX_EXTRACTED_CHARACTERS);
    isTruncated = true;
  }
  return {
    adminId: String(form.get("adminId") ?? "").trim(),
    fileName,
    fileType,
    mimeType: fileType === "pdf" ? "application/pdf" : "text/markdown",
    bytes,
    content,
    pageCount,
    isTruncated,
  };
}

async function ownedAdmin(ownerUserId: string, adminId: string) {
  const [admin] = await getDb().select().from(adminProfiles).where(and(eq(adminProfiles.id, adminId), eq(adminProfiles.ownerUserId, ownerUserId))).limit(1);
  return admin;
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const url = new URL(request.url);
    const documentId = url.searchParams.get("id")?.trim() ?? "";
    if (documentId) {
      const [document] = await getDb().select().from(adminDocuments).where(and(eq(adminDocuments.id, documentId), eq(adminDocuments.ownerUserId, user.id))).limit(1);
      if (!document) return Response.json({ error: "ไม่พบไฟล์ความรู้" }, { status: 404 });
      const fileType = document.fileType === "pdf" ? "pdf" : "markdown";
      const headers = {
        "content-type": document.mimeType || (fileType === "pdf" ? "application/pdf" : "text/markdown; charset=utf-8"),
        "content-disposition": contentDisposition(document.fileName, document.id, fileType),
        "cache-control": "private, no-store",
      };
      if (document.storageKey) {
        const object = await getStorage().get(document.storageKey);
        if (object) return new Response(object.body, { headers });
      }
      if (fileType === "markdown") return new Response(document.content, { headers });
      return Response.json({ error: "ไม่พบไฟล์ PDF ต้นฉบับ" }, { status: 404 });
    }

    const adminId = url.searchParams.get("adminId")?.trim() ?? "";
    if (!adminId || !(await ownedAdmin(user.id, adminId))) return Response.json({ error: "ไม่พบพนักงาน AI" }, { status: 404 });
    const documents = await getDb().select().from(adminDocuments).where(and(eq(adminDocuments.adminId, adminId), eq(adminDocuments.ownerUserId, user.id))).orderBy(desc(adminDocuments.updatedAt));
    return Response.json({
      documents: documents.map(safeDocument),
      limits: {
        maxDocuments: MAX_ADMIN_DOCUMENTS,
        maxMarkdownBytes: MAX_MARKDOWN_FILE_BYTES,
        maxPdfBytes: MAX_PDF_FILE_BYTES,
        maxTotalBytes: MAX_TOTAL_FILE_BYTES,
        maxExtractedCharacters: MAX_EXTRACTED_CHARACTERS,
        maxTotalKnowledgeCharacters: MAX_TOTAL_KNOWLEDGE_CHARACTERS,
      },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let storedKey = "";
  let recordInserted = false;
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const upload = await parseUpload(request);
    const admin = await ownedAdmin(user.id, upload.adminId);
    if (!admin) return Response.json({ error: "ไม่พบพนักงาน AI" }, { status: 404 });
    if (!upload.fileName || !upload.content) return Response.json({ error: "ไฟล์ไม่มีข้อมูลความรู้ที่ AI อ่านได้" }, { status: 400 });
    if (upload.bytes.byteLength > maxFileBytes(upload.fileType)) {
      return Response.json({ error: upload.fileType === "pdf" ? "ไฟล์ PDF ต้องมีขนาดไม่เกิน 5 MB" : "ไฟล์ Markdown ต้องมีขนาดไม่เกิน 200 KB" }, { status: 413 });
    }

    const db = getDb();
    const current = await db.select().from(adminDocuments).where(and(eq(adminDocuments.adminId, upload.adminId), eq(adminDocuments.ownerUserId, user.id)));
    if (current.length >= MAX_ADMIN_DOCUMENTS) return Response.json({ error: "พนักงานหนึ่งคนเพิ่มไฟล์ความรู้ได้สูงสุด 5 ไฟล์" }, { status: 409 });
    if (current.reduce((sum, document) => sum + document.sizeBytes, 0) + upload.bytes.byteLength > MAX_TOTAL_FILE_BYTES) {
      return Response.json({ error: "ไฟล์ความรู้รวมของพนักงานต้องมีขนาดไม่เกิน 20 MB" }, { status: 413 });
    }
    if (current.reduce((sum, document) => sum + document.content.length, 0) + upload.content.length > MAX_TOTAL_KNOWLEDGE_CHARACTERS) {
      return Response.json({ error: "ข้อความความรู้รวมของพนักงานยาวเกินกำหนด กรุณาลบหรือย่อไฟล์เดิมก่อน" }, { status: 413 });
    }
    const duplicate = current.find((document) => document.fileName.toLowerCase() === upload.fileName.toLowerCase());
    if (duplicate) return Response.json({ error: "มีไฟล์ชื่อนี้แล้ว กรุณาลบไฟล์เดิมหรือเปลี่ยนชื่อไฟล์" }, { status: 409 });

    const id = crypto.randomUUID();
    storedKey = `admin-documents/${user.id}/${id}`;
    await getStorage().put(storedKey, upload.bytes, upload.mimeType);
    const [document] = await db.insert(adminDocuments).values({
      id,
      ownerUserId: user.id,
      workspaceId: admin.workspaceId,
      adminId: upload.adminId,
      fileName: upload.fileName,
      fileType: upload.fileType,
      mimeType: upload.mimeType,
      storageKey: storedKey,
      content: upload.content,
      sizeBytes: upload.bytes.byteLength,
      pageCount: upload.pageCount,
      isTruncated: upload.isTruncated,
    }).returning();
    recordInserted = true;
    let recompiledSkillCount = 0;
    try {
      recompiledSkillCount = await recompileAdminSkills(user.id, upload.adminId);
    } catch {
      // Runtime routing compiles from the latest document rows, so the uploaded knowledge is still usable.
    }
    return Response.json({ document: safeDocument(document), recompiledSkillCount }, { status: 201 });
  } catch (error) {
    if (storedKey && !recordInserted) {
      try {
        await getStorage().delete(storedKey);
      } catch {
        // A later cleanup can remove an orphaned object if storage is temporarily unavailable.
      }
    }
    return Response.json({ error: errorMessage(error) }, { status: error instanceof UploadValidationError ? error.status : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    const payload = (await request.json()) as { id?: string };
    const id = payload.id?.trim() ?? "";
    const db = getDb();
    const [document] = await db.select().from(adminDocuments).where(and(eq(adminDocuments.id, id), eq(adminDocuments.ownerUserId, user.id))).limit(1);
    if (!document) return Response.json({ error: "ไม่พบไฟล์ความรู้" }, { status: 404 });
    await db.delete(adminDocuments).where(and(eq(adminDocuments.id, id), eq(adminDocuments.ownerUserId, user.id)));
    if (document.storageKey) {
      try {
        await getStorage().delete(document.storageKey);
      } catch {
        // The knowledge record is already deleted; do not block the user on object cleanup.
      }
    }
    const recompiledSkillCount = await recompileAdminSkills(user.id, document.adminId);
    return Response.json({ deleted: true, recompiledSkillCount });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
