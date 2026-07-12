import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

const PDF_MIME_TYPE = 'application/pdf';
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB fallback default

/**
 * Runs before the controller handler executes. Rejects the request early
 * (with a clear message) if the uploaded file is missing, empty, too large,
 * or not actually a PDF - so the service layer can safely assume it always
 * receives a valid PDF buffer.
 */
@Injectable()
export class PdfFileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException(
        'No file was uploaded. Please attach a PDF file under the "file" field.',
      );
    }

    if (!file.buffer || file.size === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    if (file.mimetype !== PDF_MIME_TYPE) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Only PDF files are accepted.`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File is too large. Maximum allowed size is ${
          MAX_FILE_SIZE_BYTES / (1024 * 1024)
        } MB.`,
      );
    }

    return file;
  }
}
