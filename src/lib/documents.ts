import "server-only";
import { chunkPages } from "@/lib/chunking";
import { getDb } from "@/lib/db";
import {
  embedTexts,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/lib/embeddings";
import { extractPdf, PdfValidationError } from "@/lib/pdf";

export async function processDocument(file: File) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_LIVE_API !== "true"
  ) {
    throw new Error("Live document processing is disabled.");
  }

  const document = await extractPdf(file);
  const passages = chunkPages(document.pages);

  if (passages.length === 0 || passages.length > 200) {
    throw new PdfValidationError(
      "The PDF must produce between 1 and 200 search passages. Try a shorter document.",
    );
  }

  const sql = getDb();

  // Check connectivity before spending money on embeddings.
  await sql`SELECT 1`;

  const storedPassages: {
    page_number: number;
    chunk_index: number;
    content: string;
    embedding: string;
  }[] = [];

  let totalTokens = 0;

  // Process bounded batches rather than sending every passage at once.
  for (let start = 0; start < passages.length; start += 32) {
    const batch = passages.slice(start, start + 32);
    const result = await embedTexts(batch.map((passage) => passage.content));

    totalTokens += result.totalTokens;

    batch.forEach((passage, index) => {
      storedPassages.push({
        page_number: passage.pageNumber,
        chunk_index: passage.chunkIndex,
        content: passage.content,
        embedding: JSON.stringify(result.embeddings[index]),
      });
    });
  }

  // One SQL statement: either the document and every passage are saved,
  // or the entire database operation rolls back.
  const rows = await sql`
    WITH new_document AS (
      INSERT INTO documents (
        filename,
        file_size_bytes,
        page_count,
        status,
        embedding_model,
        embedding_dimensions
      )
      VALUES (
        ${document.filename},
        ${file.size},
        ${document.pageCount},
        'ready',
        ${EMBEDDING_MODEL},
        ${EMBEDDING_DIMENSIONS}
      )
      RETURNING id
    ),
    new_passages AS (
      INSERT INTO passages (
        document_id,
        page_number,
        chunk_index,
        content,
        embedding
      )
      SELECT
        d.id,
        p.page_number,
        p.chunk_index,
        p.content,
        p.embedding::vector
      FROM new_document AS d
      CROSS JOIN jsonb_to_recordset(
        ${JSON.stringify(storedPassages)}::jsonb
      ) AS p(
        page_number INTEGER,
        chunk_index INTEGER,
        content TEXT,
        embedding TEXT
      )
      RETURNING id
    )
    SELECT
      d.id,
      (SELECT COUNT(*)::INTEGER FROM new_passages) AS passage_count
    FROM new_document AS d
  `;

  return {
    documentId: rows[0].id as string,
    filename: document.filename,
    pageCount: document.pageCount,
    passageCount: rows[0].passage_count as number,
    embeddingModel: EMBEDDING_MODEL,
    embeddingTokens: totalTokens,
    status: "ready",
  };
}
