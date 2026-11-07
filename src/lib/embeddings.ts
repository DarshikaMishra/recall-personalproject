import "server-only";
import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export async function embedTexts(texts: string[]) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LIVE_API !== "true"
  ) {
    throw new Error("Live API requests are disabled.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const configuredModel = process.env.OPENAI_EMBEDDING_MODEL || EMBEDDING_MODEL;

  if (configuredModel !== EMBEDDING_MODEL) {
    throw new Error("The embedding model must match Recall's configuration.");
  }

  if (
    texts.length === 0 ||
    texts.length > 64 ||
    texts.some((text) => !text.trim() || text.length > 1200)
  ) {
    throw new Error(
      "Provide 1–64 nonempty passages, each at most 1,200 characters.",
    );
  }

  const client = new OpenAI({
    apiKey,
    timeout: 20_000,
    maxRetries: 0,
  });

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    input: texts,
    encoding_format: "float",
  });

  // Match returned vectors to the original input order.
  const ordered = [...response.data].sort((a, b) => a.index - b.index);

  if (
    ordered.length !== texts.length ||
    ordered.some(
      (item, index) =>
        item.index !== index ||
        item.embedding.length !== EMBEDDING_DIMENSIONS ||
        item.embedding.some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error("The embedding response had an unexpected format.");
  }

  return {
    embeddings: ordered.map((item) => item.embedding),
    model: response.model,
    totalTokens: response.usage.total_tokens,
  };
}
