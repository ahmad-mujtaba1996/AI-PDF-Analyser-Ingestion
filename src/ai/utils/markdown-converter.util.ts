/**
 * Step 4 of the pipeline: converts cleaned plain text into structured
 * Markdown using lightweight heuristics.
 *
 * This is intentionally simple (no ML/layout analysis) so it's fast, has
 * zero extra dependencies, and is easy for students to read and extend:
 *
 * - Short, standalone, title-like lines become headings (## ...)
 * - Lines starting with bullet characters (-, •, *) become Markdown lists
 * - Lines starting with a number + "." become numbered list items
 * - Everything else is grouped into paragraphs separated by blank lines
 */
export function convertTextToMarkdown(cleanedText: string): string {
  const lines = cleanedText.split('\n');
  const markdownLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      markdownLines.push('');
      continue;
    }

    if (isLikelyHeading(line)) {
      markdownLines.push(`## ${line}`);
      continue;
    }

    if (/^[-•*]\s+/.test(line)) {
      markdownLines.push(`- ${line.replace(/^[-•*]\s+/, '')}`);
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      markdownLines.push(line.replace(/^(\d+)[.)]\s+/, '$1. '));
      continue;
    }

    markdownLines.push(line);
  }

  // Collapse resulting multiple blank lines into a single blank line for
  // clean Markdown spacing.
  return markdownLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * A line is treated as a heading candidate when it's short, has no
 * terminal punctuation, and is either fully capitalized or Title Cased -
 * common signals for section titles extracted from PDFs.
 */
function isLikelyHeading(line: string): boolean {
  const wordCount = line.split(/\s+/).length;

  if (wordCount === 0 || wordCount > 8) return false;
  if (/[.,;:]$/.test(line)) return false;

  const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
  const isTitleCase =
    /^[A-Z]/.test(line) &&
    line
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .every((w) => /^[A-Z]/.test(w));

  return isAllCaps || isTitleCase;
}
