import {
  MAX_EXTRACTED_CHARACTERS,
  MAX_PDF_PAGES,
} from "@/lib/admin-document-limits";

export type ExtractedPdfKnowledge = {
  content: string;
  pageCount: number;
  isTruncated: boolean;
};

export async function extractPdfKnowledge(file: File): Promise<ExtractedPdfKnowledge> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof window !== "undefined") {
    const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`ไฟล์ PDF ต้องมีไม่เกิน ${MAX_PDF_PAGES} หน้า`);
    }

    const sections: string[] = [];
    let characterCount = 0;
    let isTruncated = false;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .flatMap((item) => "str" in item ? [item.str] : [])
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!pageText) continue;

      const section = `## หน้า ${pageNumber}\n${pageText}`;
      const remaining = MAX_EXTRACTED_CHARACTERS - characterCount;
      if (remaining <= 0) {
        isTruncated = true;
        break;
      }
      if (section.length > remaining) {
        sections.push(section.slice(0, remaining));
        isTruncated = true;
        break;
      }
      sections.push(section);
      characterCount += section.length + 2;
    }

    const content = sections.join("\n\n").trim();
    if (!content) {
      throw new Error("PDF นี้ไม่มีข้อความที่อ่านได้ กรุณาใช้ PDF ที่ค้นหาหรือคัดลอกข้อความได้ หรือแปลงเป็นไฟล์ .md");
    }
    return { content, pageCount: pdf.numPages, isTruncated };
  } catch (error) {
    if (error instanceof Error && /password/i.test(`${error.name} ${error.message}`)) {
      throw new Error("PDF นี้มีรหัสผ่าน กรุณานำรหัสผ่านออกก่อนอัปโหลด");
    }
    if (error instanceof Error && (error.message.startsWith("PDF") || error.message.startsWith("ไฟล์ PDF"))) throw error;
    throw new Error("ไม่สามารถอ่านข้อความจาก PDF นี้ได้ กรุณาตรวจสอบไฟล์แล้วลองใหม่");
  } finally {
    await loadingTask.destroy();
  }
}
