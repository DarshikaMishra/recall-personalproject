# Recall evaluation protocol

## Scope

Evaluate the live local PDF retrieval and answer workflow using the
six-page fictional Harborlight handbook.

The handbook was also used during development and for public demo
examples. These questions are newly fixed, but the source document is
not an unseen document. Results describe this small synthetic corpus,
not general PDF accuracy.

## Fixed cases

- q01–q20: 20 answerable questions.
- u01–u04: 4 additional unanswerable questions.
- Public demo questions are excluded from the scored cases.
- Commit the question set before running the evaluation.
- Do not tune the implementation against these cases and then describe
  a rerun as an independent benchmark.
- Retain the original results if later changes are evaluated.

## Retrieval

For each answerable question, check whether at least one of the top
five passages contains sufficient evidence to answer the question and
has the correct page number.

A normalized evidence-phrase match is an automated screening check.
Manually verify that the passage supports the complete expected answer.

Report supporting-passage retrieval as X/20.
Unanswerable questions are not counted as retrieval failures.

## Answers and citations

Review these separately from retrieval:

1. Answer correctness and completeness.
2. Whether cited excerpts support all factual claims.
3. Whether citation page numbers match the PDF.
4. Whether unanswerable questions return insufficient information
   without citations.

A valid source ID alone does not establish factual support.

## Timing

Use one fixed, unscored demo question as a warm-up.

Run the 24 scored requests sequentially, once each, without automatic
retries. Record warm-up behavior separately.

For the primary 20-question latency measurement:

- Start immediately before sending each HTTP request.
- Stop after the complete response body has been parsed.
- Include question embedding, retrieval, generation, validation,
  local HTTP overhead, and local development-server overhead.
- Exclude PDF extraction, document embeddings, and database ingestion.
- Do not use saved public demo responses.

Report the mean, median, and maximum completed-response time.
Report failed requests separately. If any of the primary 20 fail,
do not claim an average across 20 completed answers.

Report the four unanswerable requests separately.

## Conditions to record

- Evaluation timestamp and application Git commit.
- Sample PDF SHA-256.
- Node.js and Next.js versions.
- Embedding and answer models.
- Embedding dimensions and chunk settings.
- Number of stored passages.
- Local development mode and sequential requests.
- Database region: AWS US West 2 (Oregon).
- Warm-up procedure and any errors.

## Reporting

Targets are not results:

- Supporting passage in the top five for at least 18/20 answerable questions.
- Mean completed-response time below five seconds across the primary
  20 questions, only if all 20 complete successfully.

Report observed results even when targets are missed.
