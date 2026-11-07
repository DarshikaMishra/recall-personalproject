"use client";

import { useState } from "react";
import demo from "@/data/demo.json";

export default function Home() {
  const [selectedId, setSelectedId] = useState(demo.answers[0].id);

  const selected =
    demo.answers.find((answer) => answer.id === selectedId) ?? demo.answers[0];

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Main navigation"
          className="flex items-center justify-between gap-4"
        >
          <span className="text-lg font-semibold tracking-widest text-teal-300">
            RECALL
          </span>

          <a
            href="https://github.com/DarshikaMishra/recall-personalproject"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-300 underline underline-offset-4 hover:text-white"
          >
            View source on GitHub
          </a>
        </nav>

        <header className="mb-10 mt-14 max-w-3xl">
          <p className="mb-4 text-sm font-medium text-teal-300">
            PDF questions, with evidence.
          </p>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Find the answer.
            <br />
            See where it came from.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-400">
            Explore a sample handbook through questions, answers, and excerpts
            linked to their original PDF pages.
          </p>

          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-sm font-medium text-teal-300">
              Precomputed sample demo
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              These answers were generated in advance using Recall&apos;s
              retrieval and LLM workflow. Selecting a question displays a saved
              result; it does not make a live AI request.
            </p>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Sample document</h2>

            <p className="mt-2 text-sm text-slate-300">{demo.title}</p>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Six pages of original fictional policies covering memberships,
              meeting rooms, guests, printing, and more.
            </p>

            <a
              href={demo.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-medium text-teal-300 underline underline-offset-4"
            >
              Open the sample PDF
            </a>

            <h3 className="mb-3 mt-8 text-sm font-medium text-slate-300">
              Choose a question
            </h3>

            <div className="space-y-2">
              {demo.answers.map((example) => (
                <button
                  key={example.id}
                  type="button"
                  aria-pressed={selected.id === example.id}
                  onClick={() => setSelectedId(example.id)}
                  className={`w-full rounded-xl border p-4 text-left text-sm leading-6 transition-colors ${
                    selected.id === example.id
                      ? "border-teal-300 bg-teal-300/10 text-teal-100"
                      : "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800"
                  }`}
                >
                  {example.question}
                </button>
              ))}
            </div>
          </aside>

          <section
            aria-labelledby="answer-heading"
            className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-8"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Saved example
            </p>

            <h2
              id="answer-heading"
              className="mt-3 text-2xl font-semibold leading-9"
            >
              {selected.question}
            </h2>

            <div
              aria-live="polite"
              aria-atomic="true"
              className="mt-6 rounded-xl bg-slate-950 p-5"
            >
              <p className="mb-3 text-sm font-medium text-teal-300">
                {selected.status === "answered"
                  ? "Answer"
                  : "Not enough information"}
              </p>

              <p className="whitespace-pre-wrap leading-8 text-slate-200">
                {selected.answer.split(/(\[S\d+\])/g).map((part, index) => {
                  const source = selected.citations.find(
                    (citation) => `[${citation.citationId}]` === part,
                  );

                  return source ? (
                    <a
                      key={index}
                      href={`#${selected.id}-${source.citationId}`}
                      className="font-medium text-teal-300 underline underline-offset-4"
                    >
                      {part}
                    </a>
                  ) : (
                    <span key={index}>{part}</span>
                  );
                })}
              </p>
            </div>

            {selected.citations.length > 0 ? (
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold">Supporting excerpts</h3>

                {selected.citations.map((source) => (
                  <article
                    key={source.citationId}
                    id={`${selected.id}-${source.citationId}`}
                    className="scroll-mt-6 rounded-xl border border-slate-700 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-sm font-medium text-teal-300">
                        [{source.citationId}] · Page {source.pageNumber}
                      </h4>

                      <a
                        href={`${demo.pdfUrl}#page=${source.pageNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-300 underline underline-offset-4"
                      >
                        Open PDF page
                      </a>
                    </div>

                    <blockquote className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                      {source.content}
                    </blockquote>
                  </article>
                ))}

                <p className="text-xs leading-6 text-slate-400">
                  Excerpts come from retrieved passages. Page numbers refer to
                  physical PDF pages.
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-slate-400">
                No supporting excerpt is cited because the document does not
                establish the requested fact.
              </p>
            )}

            <details className="mt-8 border-t border-slate-700 pt-5">
              <summary className="cursor-pointer text-sm text-slate-400">
                How this example was produced
              </summary>

              <p className="mt-3 text-sm leading-7 text-slate-400">
                Recall extracted PDF text by page, split it into overlapping
                passages, stored embeddings in PostgreSQL with pgvector,
                retrieved up to five matching passages, and used an LLM to
                generate an answer. The server checked source IDs and attached
                the stored excerpts and page numbers.
              </p>

              <p className="mt-3 text-xs leading-6 text-slate-400">
                Model: {selected.model}. This saved example is a demonstration,
                not an independent accuracy benchmark. Source-ID checks do not
                guarantee answer correctness.
              </p>
            </details>
          </section>
        </div>

        <footer className="mt-10 border-t border-slate-800 py-6 text-sm text-slate-400">
          Built by Darshika Mishra · Next.js · TypeScript · PostgreSQL ·
          pgvector
        </footer>
      </div>
    </main>
  );
}
