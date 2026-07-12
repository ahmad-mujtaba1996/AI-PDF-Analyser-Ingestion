import { BadRequestException, Logger } from '@nestjs/common';
// pdf-parse has no ES module default export typings that play well with
// esModuleInterop, so we require() it directly - this is the officially
// documented way to use the library.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

const logger = new Logger('PdfParserUtil');

export interface ParsedPdf {
  /** Raw text exactly as extracted by pdf-parse, no cleanup applied yet. */
  rawText: string;
  /** Number of pages reported by the PDF itself. */
  pageCount: number;
}

/**
 * Step 2 + Step 3 of the pipeline: parse the uploaded PDF buffer and pull
 * out its raw text and page count.
 *
 * Any failure here (corrupted file, encrypted PDF, non-PDF binary that
 * slipped past the mimetype check) is converted into a 400 Bad Request so
 * the frontend can show a friendly, actionable error message.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdf> {
  try {
    const result = await pdfParse(buffer);

    if (!result.text || result.text.trim().length === 0) {
      throw new BadRequestException(
        'This PDF has no extractable text. It may be a scanned image without OCR text.',
      );
    }

    return {
      rawText: result.text,
      pageCount: result.numpages ?? 0,
    };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    logger.error('Failed to parse PDF', error instanceof Error ? error.stack : error);
    throw new BadRequestException(
      'Could not parse this PDF. The file may be corrupted, password-protected, or not a valid PDF.',
    );
  }
}
