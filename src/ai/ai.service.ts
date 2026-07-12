import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini/gemini.service';
import { parsePdfBuffer } from './utils/pdf-parser.util';
import { cleanExtractedText } from './utils/text-cleaner.util';
import { convertTextToMarkdown } from './utils/markdown-converter.util';
import { extractMetadata } from './utils/metadata-extractor.util';
import { UploadResponseDto } from './dto/upload-response.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger('AiService');

  constructor(private readonly geminiService: GeminiService) {}

  /**
   * Runs the full document ingestion pipeline described in the project
   * spec, end to end:
   *
   *   parse -> clean -> markdown -> metadata -> Gemini analysis
   *
   * Each step is a small, independently-testable function/service, wired
   * together here so the controller stays a thin HTTP layer.
   */
  async processPdf(file: Express.Multer.File): Promise<UploadResponseDto> {
    this.logger.log(`Processing "${file.originalname}" (${file.size} bytes)`);

    // Step 2 + 3: Parse PDF, extract raw text.
    const { rawText, pageCount } = await parsePdfBuffer(file.buffer);

    // Step 6: Clean the extracted content (done before markdown so the
    // markdown conversion always works on tidy text).
    const cleanedText = cleanExtractedText(rawText);

    // Step 4: Convert cleaned text into Markdown.
    const markdown = convertTextToMarkdown(cleanedText);

    // Step 5: Extract metadata.
    const metadata = extractMetadata(
      file.originalname,
      file.size,
      pageCount,
      cleanedText,
    );

    // Step 7: Send cleaned Markdown to Gemini 2.5 Flash for analysis.
    const { summary, topics, keyPoints } =
      await this.geminiService.analyzeDocument(markdown);

    this.logger.log(`Finished processing "${file.originalname}"`);

    return {
      success: true,
      metadata,
      markdown,
      summary,
      topics,
      keyPoints,
    };
  }
}
