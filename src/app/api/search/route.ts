import OpenAI from "openai";
import { retrievePassages, SearchError } from "@/lib/retrieval";

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LIVE_API !== "true"
  ) {
    return Response.json(
      { error: "Live search is disabled." },
      { status: 403 },
    );
  }

  let documentId: string;
  let question: string;

  try {
    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.documentId !== "string" ||
      typeof body.question !== "string"
    ) {
      return Response.json(
        { error: "Provide documentId and question as strings." },
        { status: 400 },
      );
    }

    documentId = body.documentId;
    question = body.question;
  } catch {
    return Response.json(
      { error: "Provide a valid JSON request body." },
      { status: 400 },
    );
  }

  try {
    const result = await retrievePassages(documentId, question);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SearchError) {
      return Response.json({ error: error.message }, { status: error.status });
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
      { error: "Search failed. Check database and API availability." },
      { status: 500 },
    );
  }
}
