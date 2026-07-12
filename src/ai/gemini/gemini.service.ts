import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface GeminiAnalysisResult {
  summary: string;
  topics: string[];
  keyPoints: string[];
}

// Gemini can comfortably handle long context, but we still cap the input
// to keep requests fast and cost-predictable for a teaching demo.
const MAX_INPUT_CHARACTERS = 60_000;

@Injectable()
export class GeminiService implements OnModuleInit {
  private readonly logger = new Logger('GeminiService');
  private client: GoogleGenAI;
  private model: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey || apiKey === 'YOUR_API_KEY') {
      this.logger.warn(
        'GEMINI_API_KEY is not set. Requests to /ai/upload will fail until it is configured in .env',
      );
    }

    this.client = new GoogleGenAI({ apiKey: apiKey ?? '' });
    this.model = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );
  }

  /**
   * Step 7 of the pipeline: sends the cleaned Markdown to Gemini 2.5 Flash
   * and asks for a summary, topic list, and key points - returned as
   * strict JSON so the frontend can render each piece independently.
   */
  async analyzeDocument(markdown: string): Promise<GeminiAnalysisResult> {
    const truncated = markdown.slice(0, MAX_INPUT_CHARACTERS);

    const prompt = this.buildPrompt(truncated);

    let responseText: string;

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      responseText = response.text ?? '';
    } catch (error) {
      this.logger.error(
        'Gemini API request failed',
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException(
        'The AI analysis step failed. Please verify your GEMINI_API_KEY and try again.',
      );
    }

    return this.parseAnalysisResponse(responseText);
  }

  private buildPrompt(documentMarkdown: string): string {
    return [
      'You are an expert document analyst preparing content for a RAG (Retrieval-Augmented Generation) knowledge base.',
      'Read the following document (given in Markdown) and analyze it.',
      '',
      'Respond with ONLY a raw JSON object - no markdown code fences, no preamble, no explanation - matching exactly this shape:',
      '{',
      '  "summary": "a concise 3-5 sentence summary of the document",',
      '  "topics": ["short topic 1", "short topic 2", "..."],',
      '  "keyPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"]',
      '}',
      '',
      'Rules:',
      '- "topics" should contain 3 to 8 short topic labels (2-4 words each).',
      '- "keyPoints" should contain exactly 5 concise, standalone key points.',
      '- Do not wrap the JSON in backticks or add any text outside the JSON object.',
      '',
      '--- DOCUMENT START ---',
      documentMarkdown,
      '--- DOCUMENT END ---',
    ].join('\n');
  }

  private parseAnalysisResponse(rawResponse: string): GeminiAnalysisResult {
    const cleaned = rawResponse
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);

      return {
        summary:
          typeof parsed.summary === 'string'
            ? parsed.summary
            : 'No summary was generated.',
        topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [],
        keyPoints: Array.isArray(parsed.keyPoints)
          ? parsed.keyPoints.map(String)
          : [],
      };
    } catch (error) {
      this.logger.error(
        'Failed to parse Gemini JSON response',
        cleaned,
      );
      throw new InternalServerErrorException(
        'The AI returned a response that could not be understood. Please try again.',
      );
    }
  }
}
