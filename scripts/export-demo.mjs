import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const documentId = process.argv[2];

if (
  !documentId ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    documentId,
  )
) {
  throw new Error(
    "Usage: node scripts/export-demo.mjs YOUR_SAMPLE_DOCUMENT_ID",
  );
}

const questions = [
  {
    id: "membership",
    question: "What is included in the Flex membership, and what does it cost?",
    expectedStatus: "answered",
  },
  {
    id: "meeting-room",
    question:
      "How much does the Maple meeting room cost, and how many people can it seat?",
    expectedStatus: "answered",
  },
  {
    id: "cancellation",
    question:
      "When can I cancel a meeting-room reservation and receive a full refund?",
    expectedStatus: "answered",
  },
  {
    id: "guests",
    question:
      "How long can a guest visit for free, and what happens if they stay longer?",
    expectedStatus: "answered",
  },
  {
    id: "printing",
    question: "How much does black-and-white printing cost per side?",
    expectedStatus: "answered",
  },
  {
    id: "parking",
    question: "Does the workspace provide free parking?",
    expectedStatus: "insufficient_information",
  },
];

const pdfBytes = await readFile(
  new URL("../public/sample/recall-handbook.pdf", import.meta.url),
);

const answers = [];

for (const [index, item] of questions.entries()) {
  console.log(`[${index + 1}/${questions.length}] ${item.question}`);

  const response = await fetch("http://localhost:3000/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId,
      question: item.question,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Request failed: ${data.error || response.statusText}`);
  }

  if (
    data.documentId !== documentId ||
    data.filename !== "recall-handbook.pdf"
  ) {
    throw new Error("The response does not match the selected sample PDF.");
  }

  if (data.status !== item.expectedStatus) {
    throw new Error(
      `Unexpected status for "${item.id}": ${data.status}. Review the response before exporting.`,
    );
  }

  if (
    !Array.isArray(data.citations) ||
    !Array.isArray(data.retrievedPassages) ||
    typeof data.answer !== "string" ||
    !data.answer.trim()
  ) {
    throw new Error(`Invalid answer response for "${item.id}".`);
  }

  for (const citation of data.citations) {
    const retrieved = data.retrievedPassages.find(
      (passage) =>
        passage.citationId === citation.citationId &&
        passage.passageId === citation.passageId,
    );

    if (
      !retrieved ||
      citation.documentId !== documentId ||
      citation.content !== retrieved.content ||
      citation.pageNumber !== retrieved.pageNumber
    ) {
      throw new Error(`Citation mismatch for "${item.id}".`);
    }
  }

  if (data.status === "answered" && data.citations.length === 0) {
    throw new Error(`Missing citations for "${item.id}".`);
  }

  if (
    data.status === "insufficient_information" &&
    data.citations.length !== 0
  ) {
    throw new Error(`Unexpected citations for "${item.id}".`);
  }

  answers.push({
    id: item.id,
    question: item.question,
    status: data.status,
    answer: data.answer,
    citations: data.citations.map((citation) => ({
      citationId: citation.citationId,
      pageNumber: citation.pageNumber,
      content: citation.content,
    })),
    model: data.model,
    recordedServerDurationMs: data.serverDurationMs,
  });
}

const demo = {
  mode: "precomputed",
  title: "Harborlight Workspace Handbook",
  description: "Original fictional sample document created for Recall.",
  pdfUrl: "/sample/recall-handbook.pdf",
  pdfSha256: createHash("sha256").update(pdfBytes).digest("hex"),
  generatedAt: new Date().toISOString(),
  timingNote:
    "Recorded local generation times, not public demo response times or an independent benchmark.",
  answers,
};

const outputDirectory = new URL("../src/data/", import.meta.url);
const outputFile = new URL("../src/data/demo.json", import.meta.url);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, `${JSON.stringify(demo, null, 2)}\n`);

console.log(`Saved ${answers.length} demo answers to src/data/demo.json`);
console.log("Review each answer and its cited pages before committing.");
