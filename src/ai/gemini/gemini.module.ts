import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';

/**
 * Isolates all Gemini/LLM concerns behind a single injectable service.
 * If this project ever swaps providers (e.g. OpenAI, Claude), only this
 * module needs to change - AiService talks to GeminiService's interface,
 * not to the @google/genai SDK directly.
 */
@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
