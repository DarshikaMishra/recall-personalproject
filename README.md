# Recall

[Live Demo](https://recall-personalproject.vercel.app) · [GitHub](https://github.com/DarshikaMishra/recall-personalproject)

The public demo uses precomputed sample answers. The full live workflow is available locally.

A PDF question-answering app that retrieves relevant passages and generates
answers with source excerpts and page citations.

Built with Next.js, TypeScript, PostgreSQL, pgvector, and the OpenAI API.

## Public demo

The public demo presents six precomputed examples from an original fictional
coworking handbook. Visitors can select questions, inspect supporting excerpts,
and open the cited PDF pages.

Selecting a demo question makes no live AI request. The demo requires no API
key, database connection, or visitor account.

The repository also contains the complete live workflow, available locally
at `/workspace`.

## Live workflow

1. Validate a text-based PDF and extract text by physical page.
2. Split each page into overlapping passages.
3. Generate embeddings using `text-embedding-3-small`.
4. Store passages and 1,536-dimensional vectors in PostgreSQL with pgvector.
5. Embed a question and retrieve up to five passages from the selected PDF.
6. Generate a structured answer using the retrieved passages.
7. Validate citation IDs and attach stored excerpts and page numbers.
8. Return insufficient information when the passages do not support an answer.

Document text is treated as untrusted content. Server instructions tell the
model not to follow instructions embedded in PDFs.

## Features

- PDF file-size, header, page-count, and text-content checks.
- Maximum 4,000,000-byte uploads and 30 pages.
- Maximum 100,000 extracted characters and 200 passages.
- Page-aware chunks of up to 1,200 characters with 200-character overlap.
- Atomic storage of a document and its embedded passages.
- Document-scoped cosine-distance retrieval.
- Answers with clickable source markers and original excerpts.
- Saved-document selection to avoid repeated processing.
- Loading, success, empty, and error states.
- A reproducible sample PDF generator and demo export script.

## Evaluation

A fixed local evaluation used one six-page synthetic handbook containing
12 passages, with 20 answerable questions and four additional unanswerable
questions.

| Measure                                      | Observed result |
| -------------------------------------------- | --------------: |
| Supporting passage retrieved in the top five |           20/20 |
| Correct answers against the handbook         |           20/20 |
| Answers fully supported by cited excerpts    |           19/20 |
| Correct insufficient-information responses   |             4/4 |
| Mean completed HTTP response time            |   1.707 seconds |
| Maximum completed HTTP response time         |   2.421 seconds |

Timing includes question embedding, retrieval, answer generation, validation,
and local HTTP/development-server overhead. It excludes document processing.

The questions were fixed before the run, but the source document had already
been used during development. Review was assistant-assisted, not independent
human annotation. These results do not establish accuracy across arbitrary PDFs.

One correct answer cited an unrelated retrieved passage. Source-ID validation
therefore does not guarantee that a citation supports a claim.

See [the evaluation protocol](evaluation/PROTOCOL.md) and
[the results and failure analysis](evaluation/RESULTS.md).

## Run the sample demo locally

Use Node.js 24.x and npm.

```bash
git clone https://github.com/DarshikaMishra/recall-personalproject.git
cd recall-personalproject
npm ci
npm run dev
```

Open http://localhost:3000. The saved demo works without credentials.

The recorded evaluation used Node.js v25.2.1; its environment is documented
in the raw results.

## Configure the live local workspace

Create a PostgreSQL database with pgvector support, such as a Neon database.

Run the SQL in:

```text
db/migrations/001_create_documents_and_passages.sql
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the database URL, an OpenAI API key, and:

```dotenv
ENABLE_LIVE_API="true"
```

Restart `npm run dev`, then open http://localhost:3000/workspace.

Processing documents and asking live questions incur API usage charges.
Keys and database credentials stay on the server and must not be committed.

## Sample document and saved answers

Generate the original fictional sample PDF:

```bash
node scripts/create-sample.mjs
```

Process it through the live workspace, then export saved demo answers:

```bash
node scripts/export-demo.mjs YOUR_SAMPLE_DOCUMENT_ID
```

Review generated answers against the PDF before publishing them.
Changing the PDF requires reviewing and regenerating its saved examples.

## Validation

```bash
npx eslint .
npx tsc --noEmit
npm run build
```

Run the fixed evaluation with a local development server running:

```bash
node scripts/evaluate.mjs YOUR_SAMPLE_DOCUMENT_ID STORED_PASSAGE_COUNT
```

The runner requires a clean Git working tree and records responses, timing,
models, source hashes, and the tested commit. Evaluation makes paid API
requests. Preserve previous runs rather than replacing unfavorable results.

## Deployment

Deploy the repository to Vercel using its Next.js preset and Node.js 24.x.

The public saved demo needs no environment variables. Do not add API keys
or database credentials to the demo deployment.

Production requests to live processing, search, answer, and document-list
endpoints are blocked. `/workspace` is available only in development.

## Limitations

- Scanned PDFs and OCR are outside scope.
- Complex layouts, tables, and reading order may extract imperfectly.
- Page references use physical PDF pages, not printed page labels.
- Similarity ranking does not establish whether a question is answerable.
- Model answers and citations can be incorrect.
- Prompt instructions reduce document-instruction risks but do not guarantee
  immunity to prompt injection.
- Reprocessing a file currently creates another document.
- The live workspace is for local development, not a public multi-user service.
- The public demo supports predefined questions and saved responses.
