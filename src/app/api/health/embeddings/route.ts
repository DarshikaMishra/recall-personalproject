import OpenAI from "openai";
import { embedTexts } from "@/lib/embeddings";

export async function POST() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LIVE_API !== "true"
  ) {
    return Response.json(
      { error: "Live API requests are disabled." },
      { status: 403 },
    );
  }

  try {
    const result = await embedTexts([
      "Recall finds relevant PDF passages and preserves their page numbers.",
    ]);

    return Response.json({
      ok: true,
      model: result.model,
      dimensions: result.embeddings[0].length,
      totalTokens: result.totalTokens,
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      return Response.json(
        {
          ok: false,
          error: "The embedding provider rejected the request.",
          providerStatus: error.status,
          providerCode: error.code,
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        ok: false,
        error: "Embedding check failed. Check your local API configuration.",
      },
      { status: 500 },
    );
  }
}
