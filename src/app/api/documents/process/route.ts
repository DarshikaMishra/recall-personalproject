import OpenAI from "openai";

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LIVE_API !== "true"
  ) {
    return Response.json(
      { error: "Live document processing is disabled." },
      { status: 403 },
    );
  }

  const { processDocument } = await import("@/lib/documents");
  const { PdfValidationError } = await import("@/lib/pdf");
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "The upload could not be read." },
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
    const document = await processDocument(file);

    return Response.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof PdfValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof OpenAI.APIError) {
      return Response.json(
        {
          error: "The embedding provider rejected the request.",
          providerStatus: error.status,
          providerCode: error.code,
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        error:
          "Document processing failed. Check that the PDF is readable and your database and API configuration are available.",
      },
      { status: 500 },
    );
  }
}
