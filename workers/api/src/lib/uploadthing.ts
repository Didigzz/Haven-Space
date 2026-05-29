import { UTApi } from 'uploadthing/server';

import type { Env, UploadThingUploadResult } from '../env';
import { HttpError } from './http';

export async function uploadFilesToUploadThing(
  env: Env,
  files: File[],
  metadata: Record<string, unknown>
): Promise<UploadThingUploadResult[]> {
  if (env.UPLOADTHING_UPLOAD_FILES) {
    return await env.UPLOADTHING_UPLOAD_FILES(files, metadata);
  }

  if (!env.UPLOADTHING_TOKEN) {
    throw new HttpError(500, 'UploadThing token is not configured');
  }

  const utapi = new UTApi({
    fetch,
    token: env.UPLOADTHING_TOKEN,
  });
  const result = await utapi.uploadFiles(files, {
    contentDisposition: 'inline',
  });

  return (Array.isArray(result) ? result : [result]) as UploadThingUploadResult[];
}

export function uploadThingFileKeyFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const fileSegmentIndex = parts.indexOf('f');

    if (fileSegmentIndex === -1 || !parts[fileSegmentIndex + 1]) {
      return null;
    }

    return decodeURIComponent(parts[fileSegmentIndex + 1]);
  } catch {
    return null;
  }
}

export async function deleteUploadThingFileByUrl(env: Env, fileUrl: string): Promise<void> {
  const key = uploadThingFileKeyFromUrl(fileUrl);

  if (!key) {
    return;
  }

  if (env.UPLOADTHING_DELETE_FILES) {
    await env.UPLOADTHING_DELETE_FILES([key]);
    return;
  }

  if (!env.UPLOADTHING_TOKEN) {
    return;
  }

  const utapi = new UTApi({
    fetch,
    token: env.UPLOADTHING_TOKEN,
  });
  await utapi.deleteFiles(key);
}
