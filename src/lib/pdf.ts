import "server-only";
import { PDFParse } from "pdf-parse";

const MAX_BYTES = 4_000_000;
const MAX_PAGES = 30;
const MAX_CHARACTERS = 100_000;

export class PdfValidationError extends Error {}

export async function extractPdf(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new PdfValidationError("Please upload a PDF file.");
  }

  if (file.size === 0) {
    throw new PdfValidationError("The selected file is empty.");
  }

  if (file.size > MAX_BYTES) {
    throw new PdfValidationError("Please upload a PDF smaller than 4 MB.");
  }

  const data = new Uint8Array(await file.arrayBuffer());

  // Check the file contents as well as the filename.
  const header = new TextDecoder().decode(data.slice(0, 5));

  if (header !== "%PDF-") {
    throw new PdfValidationError("This file does not have a valid PDF header.");
  }

  const parser = new PDFParse({ data });

  try {
    const info = await parser.getInfo();

    if (info.total > MAX_PAGES) {
      throw new PdfValidationError(
        "Please upload a PDF with 30 pages or fewer.",
      );
    }

    const result = await parser.getText();

    // Preserve physical PDF page numbers, including pages with no text.
    const pages = result.pages.map((page) => ({
      pageNumber: page.num,
      text: page.text.replace(/\u0000/g, "").trim(),
    }));

    const characterCount = pages.reduce(
      (total, page) => total + page.text.length,
      0,
    );

    if (characterCount === 0) {
      throw new PdfValidationError(
        "No readable text was found. Scanned PDFs need OCR, which Recall does not support yet.",
      );
    }

    if (characterCount > MAX_CHARACTERS) {
      throw new PdfValidationError(
        "This PDF contains too much text. Please choose a shorter document.",
      );
    }

    return {
      filename: file.name,
      pageCount: info.total,
      characterCount,
      pages,
    };
  } finally {
    await parser.destroy();
  }
}
