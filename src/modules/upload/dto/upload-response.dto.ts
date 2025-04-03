export class UploadResponseDto {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
}

export class CsvImportResultDto {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}
