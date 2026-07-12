import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { PdfFileValidationPipe } from '../common/pipes/pdf-file-validation.pipe';
import { UploadResponseDto } from './dto/upload-response.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/upload
   *
   * multipart/form-data with a single field named "file" containing a PDF.
   *
   * This is the ONLY API in the project. The frontend at "/" calls this
   * endpoint directly with fetch() + FormData - no Postman/Thunder Client
   * needed.
   */
  @Post('upload')
  @UseInterceptors(
    // No `dest`/`storage` option is passed, so multer defaults to its
    // built-in memory storage - the file arrives as an in-memory Buffer
    // and nothing is ever written to disk, matching the "store everything
    // in memory" requirement for this project.
    FileInterceptor('file'),
  )
  async uploadPdf(
    @UploadedFile(PdfFileValidationPipe) file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.aiService.processPdf(file);
  }
}
