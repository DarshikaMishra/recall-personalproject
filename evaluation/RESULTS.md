# Recall evaluation results

## Run and conditions

- Evaluated November 6, 2026, Pacific time.
- Tested commit: bcfbcb841b56172f3d7f760fdca3ea55362de0f8
- Raw results: runs/2026-11-07T04-43-31-029Z/run.json
- Corpus: one six-page fictional handbook containing 12 passages.
- Questions: 20 answerable and 4 additional unanswerable cases.
- Embeddings: text-embedding-3-small, 1,536 dimensions.
- Answer model: gpt-5.6-terra, reasoning disabled.
- Chunking: maximum 1,200 characters, 200-character overlap.
- Database region: AWS US West 2 (Oregon).
- Node.js: v25.2.1; Next.js: 16.4.5.
- Local development server, one warm-up, sequential requests.
- No runner retries.

## Results

| Measure                                             |        Result |
| --------------------------------------------------- | ------------: |
| Supporting passage retrieved in top five            |         20/20 |
| Answer correct and complete against expected answer |         20/20 |
| Cited excerpts support all answer claims            |         19/20 |
| Correct abstention on unanswerable questions        |           4/4 |
| Completed primary requests                          |         20/20 |
| Primary mean HTTP response time                     | 1.707 seconds |
| Primary median HTTP response time                   | 1.688 seconds |
| Primary maximum HTTP response time                  | 2.421 seconds |

Timing starts before the HTTP request and ends after parsing the complete
JSON response. It includes question embedding, retrieval, generation,
validation, and local HTTP/development-server overhead. It excludes PDF
processing. These are live workflow timings, not saved-demo timings.

Review was assistant-assisted comparison of responses, retrieved passages,
cited excerpts, and the handbook content. It was not independent human
annotation. The raw run's manual-review fields remain unchanged; this
report records the subsequent review.

## Citation failure

q01 correctly answered that unused Flex visits expire rather than roll over.
Supporting evidence appeared at rank 3 as S3 on page 1.

The answer instead cited S1 on page 4, a membership-cancellation excerpt.
The citation passed source-ID validation because S1 was genuinely retrieved,
but it did not support the answer.

All other primary answers were supported by their cited excerpts.
All retrieved passages belonged to the selected document.

## Limitations

This evaluation uses one small synthetic handbook already used during
development. The scored questions were fixed before the run, but the
document was not unseen. Results do not establish accuracy across arbitrary
PDFs, scanned documents, complex layouts, or larger collections.

Source-ID validation checks citation identity, not semantic support.
The public demo serves precomputed examples and makes no live AI requests.
