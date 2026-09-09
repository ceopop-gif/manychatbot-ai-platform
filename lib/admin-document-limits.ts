export const MAX_ADMIN_DOCUMENTS = 5;
export const MAX_MARKDOWN_FILE_BYTES = 200 * 1024;
export const MAX_PDF_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 60_000;
export const MAX_TOTAL_KNOWLEDGE_CHARACTERS = 150_000;
export const MAX_PDF_PAGES = 300;

export type AdminDocumentType = "markdown" | "pdf";

export function adminDocumentType(fileName: string): AdminDocumentType | null {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".md")) return "markdown";
  if (normalized.endsWith(".pdf")) return "pdf";
  return null;
}

export function maxFileBytes(fileType: AdminDocumentType) {
  return fileType === "pdf" ? MAX_PDF_FILE_BYTES : MAX_MARKDOWN_FILE_BYTES;
}
