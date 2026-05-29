export interface Env {
  APP_ENV?: string;
  APP_ORIGIN?: string;
  JWT_SECRET?: string;
  UPLOADTHING_TOKEN?: string;
  DB?: D1Database;
  UPLOADTHING_UPLOAD_FILES?: UploadThingUploadFiles;
  UPLOADTHING_DELETE_FILES?: UploadThingDeleteFiles;
}

export interface UploadThingUploadedFile {
  key: string;
  url?: string;
  appUrl?: string;
  ufsUrl?: string;
  name?: string;
  size?: number;
}

export interface UploadThingUploadResult {
  data: UploadThingUploadedFile | null;
  error: { message?: string; code?: string } | null;
}

export type UploadThingUploadFiles = (
  files: File[],
  metadata?: Record<string, unknown>
) => Promise<UploadThingUploadResult[]>;

export type UploadThingDeleteFiles = (keys: string[]) => Promise<void>;
