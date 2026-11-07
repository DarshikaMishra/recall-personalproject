"use client";

import { useState, type FormEvent } from "react";

type DocumentPreview = {
  filename: string;
  pageCount: number;
  characterCount: number;
  pages: {
    pageNumber: number;
    text: string;
  }[];
  passages: {
    pageNumber: number;
    chunkIndex: number;
    content: string;
  }[];
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPreview(null);

    if (!file) {
      setError("Choose a PDF first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }

    if (file.size === 0 || file.size > 4_000_000) {
      setError("Choose a nonempty PDF smaller than 4 MB.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "The upload failed.");
      }

      setPreview(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="mb-3 text-sm font-medium text-teal-300">RECALL</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Start with your document.
          </h1>
          <p className="mt-4 text-slate-400">
            Upload a text-based PDF to preview its text by page. Search and
            answers are coming next.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6"
        >
          <label htmlFor="pdf" className="block font-medium">
            Select a PDF
          </label>

          <input
            id="pdf"
            name="file"
            type="file"
            accept=".pdf,application/pdf"
            disabled={loading}
            aria-describedby="upload-help"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setError("");
            }}
            className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-white"
          />

          <p id="upload-help" className="text-sm text-slate-400">
            Under 4 MB · Up to 30 pages · Text-based PDFs only
          </p>

          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Extracting text…" : "Preview document"}
          </button>

          {loading && (
            <p role="status" className="text-sm text-slate-300">
              Reading your PDF and preserving its page numbers…
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
        </form>

        {preview && (
          <section className="space-y-4">
            <div role="status">
              <h2 className="break-words text-xl font-semibold">
                {preview.filename}
              </h2>
              <p className="mt-1 text-sm text-teal-300">
                Extraction complete: {preview.pageCount} pages ·{" "}
                {preview.characterCount.toLocaleString()} characters
              </p>
            </div>
            <details className="rounded-xl border border-slate-700 p-5">
              <summary className="cursor-pointer font-medium text-teal-300">
                Inspect {preview.passages.length} search passages
              </summary>

              <p className="mt-3 text-sm text-slate-400">
                Passages stay within one PDF page. Adjacent passages may overlap
                to preserve context.
              </p>

              <div className="mt-4 space-y-4">
                {preview.passages.map((passage) => (
                  <article
                    key={passage.chunkIndex}
                    className="rounded-lg bg-slate-900 p-4"
                  >
                    <h3 className="text-sm font-medium text-teal-300">
                      Passage {passage.chunkIndex + 1} · Page{" "}
                      {passage.pageNumber}
                      {" · "}
                      {passage.content.length} characters
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                      {passage.content}
                    </p>
                  </article>
                ))}
              </div>
            </details>
            {preview.pages.map((page) => (
              <article
                key={page.pageNumber}
                className="rounded-xl border border-slate-700 p-5"
              >
                <h3 className="mb-3 font-medium text-teal-300">
                  Page {page.pageNumber}
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {page.text || "No readable text on this page."}
                </p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
