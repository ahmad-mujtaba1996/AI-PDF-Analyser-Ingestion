/**
 * Step 6 of the pipeline: takes raw text straight out of pdf-parse (which
 * is usually messy - inconsistent line breaks, stray form-feed characters,
 * double spacing from justified PDF layouts) and normalizes it into clean,
 * AI-ready plain text.
 *
 * This runs BEFORE markdown conversion, so the markdown step always starts
 * from tidy input.
 */
export function cleanExtractedText(rawText: string): string {
  let text = rawText;

  // Normalize all line-break styles (Windows/Mac/Unix) to a single \n.
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // PDF extraction often inserts form-feed characters between pages.
  text = text.replace(/\f/g, '\n');

  // Remove control characters that sometimes leak in from PDF encoding,
  // but keep normal punctuation and newlines intact.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Collapse runs of spaces/tabs (but not newlines) into a single space.
  text = text.replace(/[ \t]{2,}/g, ' ');

  // Trim trailing whitespace on every line.
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // Collapse 3+ consecutive blank lines down to a single blank line.
  text = text.replace(/\n{3,}/g, '\n\n');

  // Re-join words that were hyphenated across a line break by the PDF
  // layout engine, e.g. "docu-\nment" -> "document".
  text = text.replace(/([a-zA-Z])-\n([a-zA-Z])/g, '$1$2');

  return text.trim();
}
