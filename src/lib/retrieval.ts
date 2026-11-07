import "server-only";
import { getDb } from "@/lib/db";
import {
  embedTexts,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "@/lib/embeddings";

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function retrievePassages(documentId: string, question: string) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LIVE_API !== "true"
  ) {
    throw new SearchError("Live search is disabled.", 403);
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(documentId)) {
    throw new SearchError("Provide a valid document ID.", 400);
  }

  const trimmedQuestion = question.trim();

  if (!trimmedQuestion || trimmedQuestion.length > 1000) {
    throw new SearchError(
      "Enter a question between 1 and 1,000 characters.",
      400,
    );
  }

  const sql = getDb();

  // Validate the document before making a paid embedding request.
  const documents = await sql`
    SELECT id, filename, embedding_model, embedding_dimensions
    FROM documents
    WHERE id = ${documentId}::uuid
      AND status = 'ready'
  `;

  const document = documents[0];

  if (!document) {
    throw new SearchError("A ready document was not found.", 404);
  }

  if (
    document.embedding_model !== EMBEDDING_MODEL ||
    document.embedding_dimensions !== EMBEDDING_DIMENSIONS
  ) {
    throw new SearchError(
      "This document uses incompatible embeddings. Process it again.",
      409,
    );
  }

  const result = await embedTexts([trimmedQuestion]);
  const questionVector = JSON.stringify(result.embeddings[0]);

  const rows = await sql`
    SELECT
      id,
      document_id,
      page_number,
      chunk_index,
      content,
      embedding <=> ${questionVector}::vector AS distance
    FROM passages
    WHERE document_id = ${documentId}::uuid
    ORDER BY distance ASC, chunk_index ASC
    LIMIT 5
  `;

  return {
    documentId,
    filename: document.filename as string,
    question: trimmedQuestion,
    embeddingTokens: result.totalTokens,
    passages: rows.map((row, index) => ({
      rank: index + 1,
      passageId: row.id as string,
      documentId: row.document_id as string,
      pageNumber: row.page_number as number,
      chunkIndex: row.chunk_index as number,
      content: row.content as string,
      distance: Number(row.distance),
    })),
  };
}
