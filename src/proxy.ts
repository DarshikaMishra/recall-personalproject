import { NextResponse } from "next/server";

export function proxy() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Live API routes are disabled in the public sample demo." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/documents/:path*",
    "/api/search",
    "/api/ask",
    "/api/health/embeddings",
  ],
};
