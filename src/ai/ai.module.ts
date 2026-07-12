import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiModule } from './gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
