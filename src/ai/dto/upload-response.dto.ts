/**
 * Metadata extracted directly from the uploaded PDF - no AI involved here,
 * just facts read off the file and the parsed content.
 */
export class DocumentMetadataDto {
  fileName: string;
  pageCount: number;
  wordCount: number;
  fileSizeBytes: number;
  fileSizeReadable: string;
}

/**
 * The full shape returned by POST /ai/upload. This is the contract the
 * frontend relies on to render each section of the UI.
 */
export class UploadResponseDto {
  success: boolean;
  metadata: DocumentMetadataDto;
  markdown: string;
  summary: string;
  topics: string[];
  keyPoints: string[];
}
