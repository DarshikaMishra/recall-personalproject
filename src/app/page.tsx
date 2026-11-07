"use client";

import { useEffect, useState, type FormEvent } from "react";

type SavedDocument = {
  id: string;
  filename: string;
  pageCount: number;
};

type Source = {
  citationId: string;
  passageId: string;
  documentId: string;
  pageNumber: number;
  content: string;
  rank: number;
};

type AnswerResult = {
  documentId: string;
  filename: string;
  question: string;
  status: "answered" | "insufficient_information";
  answer: string;
  citations: Source[];
  retrievedPassages: Source[];
  model: string;
  serverDurationMs: number;
};

const panel = "rounded-2xl border border-slate-700 bg-slate-900 p-6";

const button =
  "rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50";

export default function Home() {
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerResult | null>(null);

  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [asking, setAsking] = useState(false);

  const [documentError, setDocumentError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const busy = loadingDocuments || processing || asking;

  const selectedDocument = documents.find(
    (document) => document.id === selectedId,
  );

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load documents.");
        }

        if (active) {
          setDocuments(data.documents);
          setSelectedId(data.documents[0]?.id ?? "");
        }
      } catch (error) {
        if (active) {
          setDocumentError(
            error instanceof Error
              ? error.message
              : "Could not load documents.",
          );
        }
      } finally {
        if (active) {
          setLoadingDocuments(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");
    setUploadSuccess("");

    if (!file) {
      setUploadError("Choose a PDF first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please choose a PDF file.");
      return;
    }

    if (file.size === 0 || file.size > 4_000_000) {
      setUploadError("Choose a nonempty PDF smaller than 4 MB.");
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/process", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Document processing failed.");
      }

      const savedDocument: SavedDocument = {
        id: data.documentId,
        filename: data.filename,
        pageCount: data.pageCount,
      };

      setDocuments((current) => [savedDocument, ...current]);
      setSelectedId(savedDocument.id);
      setAnswer(null);
      setQuestion("");
      setQuestionError("");
      setDocumentError("");

      setUploadSuccess(
        `Saved ${data.filename} with ${data.passageCount} searchable passages.`,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Document processing failed. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuestionError("");

    if (!selectedId || !question.trim()) {
      setQuestionError("Select a document and enter a question.");
      return;
    }

    setAnswer(null);
    setAsking(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedId,
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Answer generation failed.");
      }

      setAnswer(data);
    } catch (error) {
      setQuestionError(
        error instanceof Error
          ? error.message
          : "Answer generation failed. Please try again.",
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="mb-3 text-sm font-medium tracking-widest text-teal-300">
            RECALL
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Ask your document.
          </h1>

          <p className="mt-4 max-w-2xl text-slate-400">
            Find answers in your PDFs, with source excerpts and page references
            you can check.
          </p>

          <p className="mt-3 text-sm text-amber-200">
            Local development workspace. Processing PDFs and asking questions
            use your configured API account.
          </p>
        </header>

        <section className={panel} aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="text-xl font-semibold">
            1. Add a document
          </h2>

          <form onSubmit={handleUpload} className="mt-5 space-y-4">
            <label htmlFor="pdf" className="block text-sm font-medium">
              Choose a text-based PDF
            </label>

            <input
              id="pdf"
              name="file"
              type="file"
              accept=".pdf,application/pdf"
              disabled={busy}
              aria-describedby="upload-help"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setUploadError("");
                setUploadSuccess("");
              }}
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-white"
            />

            <p id="upload-help" className="text-sm text-slate-400">
              Under 4 MB · Up to 30 pages · No scanned PDFs. Reuse a saved
              document below to avoid processing it again.
            </p>

            <button type="submit" disabled={busy || !file} className={button}>
              {processing ? "Processing PDF…" : "Process and save PDF"}
            </button>

            {processing && (
              <p role="status" className="text-sm text-slate-300">
                Extracting text, generating embeddings, and saving passages…
              </p>
            )}

            {uploadSuccess && (
              <p role="status" className="text-sm text-teal-300">
                {uploadSuccess}
              </p>
            )}

            {uploadError && (
              <p role="alert" className="text-sm text-rose-300">
                {uploadError}
              </p>
            )}
          </form>
        </section>

        <section className={panel} aria-labelledby="question-heading">
          <h2 id="question-heading" className="text-xl font-semibold">
            2. Ask a question
          </h2>

          {loadingDocuments && (
            <p role="status" className="mt-4 text-sm text-slate-400">
              Loading saved documents…
            </p>
          )}

          {documentError && (
            <p role="alert" className="mt-4 text-sm text-rose-300">
              {documentError} Check your connection and refresh to retry.
            </p>
          )}

          {!loadingDocuments && !documentError && documents.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">
              No saved documents yet. Process a PDF to get started.
            </p>
          )}

          <form onSubmit={handleQuestion} className="mt-5 space-y-4">
            <label htmlFor="document" className="block text-sm font-medium">
              Saved document
            </label>

            <select
              id="document"
              value={selectedId}
              disabled={busy || documents.length === 0}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setAnswer(null);
                setQuestion("");
                setQuestionError("");
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 disabled:opacity-50"
            >
              <option value="">Select a document</option>

              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.filename} · {document.pageCount}{" "}
                  {document.pageCount === 1 ? "page" : "pages"}
                </option>
              ))}
            </select>

            {selectedDocument && (
              <p className="text-sm text-slate-400">
                Search is limited to {selectedDocument.filename}.
              </p>
            )}

            <label htmlFor="question" className="block text-sm font-medium">
              Your question
            </label>

            <textarea
              id="question"
              value={question}
              maxLength={1000}
              rows={3}
              disabled={busy || !selectedId}
              placeholder="What does this document say about…?"
              onChange={(event) => {
                setQuestion(event.target.value);
                setQuestionError("");
                setAnswer(null);
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={busy || !selectedId || !question.trim()}
              className={button}
            >
              {asking ? "Finding an answer…" : "Ask Recall"}
            </button>

            {asking && (
              <p role="status" className="text-sm text-slate-300">
                Retrieving passages and checking them for an answer…
              </p>
            )}

            {questionError && (
              <p role="alert" className="text-sm text-rose-300">
                {questionError}
              </p>
            )}
          </form>
        </section>

        {answer && (
          <section className={panel} aria-labelledby="answer-heading">
            <h2 id="answer-heading" className="text-xl font-semibold">
              {answer.status === "answered"
                ? "Answer"
                : "Not enough information"}
            </h2>

            <p role="status" className="mt-2 text-sm text-slate-400">
              Response ready.
            </p>

            <p className="mt-4 whitespace-pre-wrap leading-8">
              {answer.answer.split(/(\[S\d+\])/g).map((part, index) => {
                const source = answer.citations.find(
                  (citation) => `[${citation.citationId}]` === part,
                );

                return source ? (
                  <a
                    key={index}
                    href={`#source-${source.citationId}`}
                    className="font-medium text-teal-300 underline"
                  >
                    {part}
                  </a>
                ) : (
                  <span key={index}>{part}</span>
                );
              })}
            </p>

            {answer.citations.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">Supporting excerpts</h3>

                {answer.citations.map((source) => (
                  <article
                    key={source.citationId}
                    id={`source-${source.citationId}`}
                    className="scroll-mt-6 rounded-xl border border-slate-700 p-4"
                  >
                    <h4 className="font-medium text-teal-300">
                      [{source.citationId}] · Page {source.pageNumber}
                    </h4>

                    <blockquote className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                      {source.content}
                    </blockquote>
                  </article>
                ))}
              </div>
            )}

            <p className="mt-5 text-xs text-slate-400">
              Page numbers refer to physical PDF pages. Check the excerpts
              against the answer; model responses can contain mistakes.
            </p>

            <details className="mt-6 border-t border-slate-700 pt-4">
              <summary className="cursor-pointer text-sm text-slate-400">
                Inspect retrieval and timing
              </summary>

              <p className="mt-3 text-xs text-slate-400">
                {answer.model} · Server processing:{" "}
                {(answer.serverDurationMs / 1000).toFixed(2)} seconds. Includes
                retrieval and answer generation; excludes document processing
                and browser network time.
              </p>

              <p className="mt-3 text-xs text-slate-400">
                Retrieved passages are search matches. Only the supporting
                excerpts above are cited in the answer.
              </p>

              {answer.retrievedPassages.map((source) => (
                <details
                  key={source.passageId}
                  className="mt-3 rounded-lg border border-slate-700 p-3"
                >
                  <summary className="cursor-pointer text-sm">
                    Rank {source.rank} · [{source.citationId}] · Page{" "}
                    {source.pageNumber}
                  </summary>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                    {source.content}
                  </p>
                </details>
              ))}
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
