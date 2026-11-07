export type PdfPage = {
  pageNumber: number;
  text: string;
};

export type Passage = {
  pageNumber: number;
  chunkIndex: number;
  content: string;
};

type ChunkOptions = {
  maxCharacters?: number;
  overlapCharacters?: number;
};

export function chunkPages(
  pages: PdfPage[],
  { maxCharacters = 1200, overlapCharacters = 200 }: ChunkOptions = {},
): Passage[] {
  if (
    !Number.isInteger(maxCharacters) ||
    !Number.isInteger(overlapCharacters) ||
    maxCharacters <= 0 ||
    overlapCharacters < 0 ||
    overlapCharacters >= maxCharacters
  ) {
    throw new Error(
      "Chunk size must be a positive integer, with overlap smaller than chunk size.",
    );
  }

  const passages: Passage[] = [];

  for (const page of pages) {
    const text = page.text;
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + maxCharacters, text.length);

      // Prefer a whitespace boundary in the latter half of the window.
      // Keep enough text to guarantee progress after applying overlap.
      if (end < text.length) {
        const minimumEnd =
          start +
          Math.max(Math.floor(maxCharacters / 2), overlapCharacters + 1);

        for (let candidate = end; candidate > minimumEnd; candidate--) {
          if (/\s/.test(text[candidate])) {
            end = candidate;
            break;
          }
        }
      }

      const content = text.slice(start, end).trim();

      if (content.length > 0) {
        passages.push({
          pageNumber: page.pageNumber,
          chunkIndex: passages.length,
          content,
        });
      }

      if (end === text.length) {
        break;
      }

      start = end - overlapCharacters;
    }
  }

  return passages;
}
