import { getDb } from "@/lib/db";

export async function GET() {
  // This diagnostic endpoint is available only during local development.
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  try {
    const sql = getDb();

    const rows = await sql`
      SELECT extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `;

    if (rows.length === 0) {
      return Response.json(
        {
          ok: false,
          message: "Database connected, but pgvector is not enabled.",
        },
        { status: 503 },
      );
    }

    return Response.json({
      ok: true,
      database: "connected",
      pgvector: rows[0].extversion,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message:
          "Database check failed. Check DATABASE_URL and Neon availability.",
      },
      { status: 503 },
    );
  }
}
