import { DocumentMetadataDto } from '../dto/upload-response.dto';

/**
 * Step 5 of the pipeline: builds the metadata block shown in the frontend's
 * "Document Metadata" cards. Pure, dependency-free, and easy to unit test.
 */
export function extractMetadata(
  fileName: string,
  fileSizeBytes: number,
  pageCount: number,
  cleanedText: string,
): DocumentMetadataDto {
  return {
    fileName,
    pageCount,
    wordCount: countWords(cleanedText),
    fileSizeBytes,
    fileSizeReadable: formatFileSize(fileSizeBytes),
  };
}

function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}
