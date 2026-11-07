import { extractPdf, PdfValidationError } from "@/lib/pdf";
import { chunkPages } from "@/lib/chunking";

export async function POST(request: Request) {
  // The public deployment will serve a precomputed sample demo.
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "PDF upload is available in local development only." },
      { status: 403 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "The upload could not be read. Please try again." },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Please select a PDF file." },
      { status: 400 },
    );
  }

  try {
    const document = await extractPdf(file);
    const passages = chunkPages(document.pages);

    return Response.json({
      ...document,
      passages,
    });
  } catch (error) {
    if (error instanceof PdfValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      {
        error:
          "The PDF could not be processed. Try a different, unencrypted text-based PDF.",
      },
      { status: 422 },
    );
  }
}
