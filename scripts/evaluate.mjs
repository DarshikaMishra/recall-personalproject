import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

const documentId = process.argv[2];
const passageCount = Number(process.argv[3]);

if (
  !documentId ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    documentId,
  ) ||
  !Number.isInteger(passageCount) ||
  passageCount < 1
) {
  throw new Error(
    "Usage: node scripts/evaluate.mjs DOCUMENT_ID STORED_PASSAGE_COUNT",
  );
}

const projectRoot = new URL("../", import.meta.url);

function git(...args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
}

if (git("status", "--porcelain")) {
  throw new Error(
    "Commit your changes before evaluating so the recorded Git commit identifies the tested code.",
  );
}

const questionsBytes = await readFile(
  new URL("../evaluation/questions.json", import.meta.url),
);
const questions = JSON.parse(questionsBytes.toString());

const answerable = questions.filter((item) => item.page !== null);
const unanswerable = questions.filter((item) => item.page === null);

if (
  questions.length !== 24 ||
  answerable.length !== 20 ||
  unanswerable.length !== 4 ||
  new Set(questions.map((item) => item.id)).size !== 24
) {
  throw new Error("Expected 20 answerable and 4 unanswerable unique cases.");
}

const pdfBytes = await readFile(
  new URL("../public/sample/recall-handbook.pdf", import.meta.url),
);
const demo = JSON.parse(
  await readFile(new URL("../src/data/demo.json", import.meta.url), "utf8"),
);
const nextPackage = JSON.parse(
  await readFile(
    new URL("../node_modules/next/package.json", import.meta.url),
    "utf8",
  ),
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const pdfHash = sha256(pdfBytes);

if (pdfHash !== demo.pdfSha256) {
  throw new Error(
    "The sample PDF differs from the exported demo PDF. Review this before evaluating.",
  );
}

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const startedAt = new Date().toISOString();
const runName = startedAt.replace(/[:.]/g, "-");
const outputDirectory = new URL(
  `../evaluation/runs/${runName}/`,
  import.meta.url,
);
const outputFile = new URL("run.json", outputDirectory);
const temporaryFile = new URL("run.tmp.json", outputDirectory);

const run = {
  metadata: {
    startedAt,
    finishedAt: null,
    gitCommit: git("rev-parse", "HEAD"),
    questionsSha256: sha256(questionsBytes),
    pdfSha256: pdfHash,
    documentId,
    storedPassageCount: passageCount,
    nodeVersion: process.version,
    nextVersion: nextPackage.version,
    embeddingModel: "text-embedding-3-small",
    embeddingDimensions: 1536,
    maxChunkCharacters: 1200,
    overlapCharacters: 200,
    databaseRegion: "AWS US West 2 (Oregon)",
    mode: "local Next.js development server",
    requests: "sequential; one attempt each; no runner retries",
    timing:
      "HTTP request start through complete JSON response parsing; excludes document processing",
    limitations:
      "New fixed questions on a synthetic document already used during development. Not a general PDF accuracy benchmark.",
  },
  warmup: null,
  cases: [],
  summary: null,
};

await mkdir(outputDirectory, { recursive: true });

async function saveProgress() {
  await writeFile(temporaryFile, `${JSON.stringify(run, null, 2)}\n`);
  await rename(temporaryFile, outputFile);
}

async function ask(question) {
  const start = performance.now();

  try {
    const response = await fetch("http://localhost:3000/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, question }),
      signal: AbortSignal.timeout(65_000),
    });

    const data = await response.json();
    const httpDurationMs = performance.now() - start;

    if (!response.ok) {
      return {
        completed: false,
        httpStatus: response.status,
        httpDurationMs,
        error: data.error || "Request failed.",
        response: data,
      };
    }

    if (
      data.documentId !== documentId ||
      data.filename !== "recall-handbook.pdf" ||
      !["answered", "insufficient_information"].includes(data.status) ||
      typeof data.answer !== "string" ||
      !data.answer.trim() ||
      !Array.isArray(data.citations) ||
      !Array.isArray(data.retrievedPassages)
    ) {
      return {
        completed: false,
        httpStatus: response.status,
        httpDurationMs,
        error: "Unexpected response format or document.",
        response: data,
      };
    }

    return {
      completed: true,
      httpStatus: response.status,
      httpDurationMs,
      response: data,
    };
  } catch (error) {
    return {
      completed: false,
      httpStatus: null,
      httpDurationMs: performance.now() - start,
      error: error instanceof Error ? error.message : "Request failed.",
      response: null,
    };
  }
}

console.log("Running one unscored warm-up request…");

run.warmup = {
  question:
    "How much does the Maple meeting room cost, and how many people can it seat?",
  ...(await ask(
    "How much does the Maple meeting room cost, and how many people can it seat?",
  )),
};

await saveProgress();

if (!run.warmup.completed) {
  throw new Error(
    `Warm-up failed. Results saved to ${outputFile.pathname}. Check the error before proceeding.`,
  );
}

for (const [index, item] of questions.entries()) {
  console.log(`[${index + 1}/24] ${item.id}: ${item.question}`);

  const result = await ask(item.question);
  let evidencePhraseScreen = null;
  let citationIdentityCheck = null;
  let insufficientInformationScreen = null;

  if (result.completed) {
    const data = result.response;

    if (item.page !== null) {
      evidencePhraseScreen = data.retrievedPassages.some(
        (passage) =>
          passage.pageNumber === item.page &&
          normalize(passage.content).includes(normalize(item.evidence)),
      );
    } else {
      insufficientInformationScreen =
        data.status === "insufficient_information" &&
        data.citations.length === 0;
    }

    citationIdentityCheck = data.citations.every((citation) =>
      data.retrievedPassages.some(
        (passage) =>
          passage.passageId === citation.passageId &&
          passage.citationId === citation.citationId &&
          passage.documentId === documentId &&
          citation.documentId === documentId &&
          passage.pageNumber === citation.pageNumber &&
          passage.content === citation.content,
      ),
    );
  }

  run.cases.push({
    ...item,
    ...result,
    automatedChecks: {
      evidencePhraseScreen,
      citationIdentityCheck,
      insufficientInformationScreen,
    },
    manualReview: {
      supportingPassageInTop5: null,
      answerCorrectAndComplete: null,
      citationsSupportAllClaims: null,
      citationPagesCorrect: null,
      correctAbstention: null,
      notes: "",
    },
  });

  // Save after every case so an interruption preserves prior results.
  await saveProgress();
}

function timingStats(values) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  return {
    completedCount: values.length,
    meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
    medianMs: median,
    maxMs: sorted[sorted.length - 1],
  };
}

const primary = run.cases.filter((item) => item.page !== null);
const extra = run.cases.filter((item) => item.page === null);

run.summary = {
  primaryCompleted: primary.filter((item) => item.completed).length,
  primaryFailed: primary.filter((item) => !item.completed).length,
  primaryHttpTiming: timingStats(
    primary.filter((item) => item.completed).map((item) => item.httpDurationMs),
  ),
  evidencePhraseScreenMatches: primary.filter(
    (item) => item.automatedChecks.evidencePhraseScreen === true,
  ).length,
  unanswerableCompleted: extra.filter((item) => item.completed).length,
  unanswerableHttpTiming: timingStats(
    extra.filter((item) => item.completed).map((item) => item.httpDurationMs),
  ),
  insufficientInformationScreenMatches: extra.filter(
    (item) => item.automatedChecks.insufficientInformationScreen === true,
  ).length,
  actualAnswerModels: [
    ...new Set(
      run.cases
        .filter((item) => item.completed)
        .map((item) => item.response.model),
    ),
  ],
  reviewStatus:
    "Manual review pending; phrase matches are not final retrieval scores.",
};

run.metadata.finishedAt = new Date().toISOString();
await saveProgress();

console.log(JSON.stringify(run.summary, null, 2));
console.log(`Saved complete results: ${outputFile.pathname}`);
