import { getDb } from "@/lib/db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "Saved documents are available locally only." },
      { status: 403 },
    );
  }

  try {
    const sql = getDb();

    const rows = await sql`
      SELECT id, filename, page_count
      FROM documents
      WHERE status = 'ready'
      ORDER BY created_at DESC
    `;

    return Response.json({
      documents: rows.map((row) => ({
        id: row.id,
        filename: row.filename,
        pageCount: row.page_count,
      })),
    });
  } catch {
    return Response.json(
      { error: "Could not load saved documents." },
      { status: 500 },
    );
  }
}
