import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

const BUCKET_NAME = "uploads";

function getFilesClient() {
  return new Files({
    adapter: neon({ bucket: BUCKET_NAME }),
  });
}

/**
 * Upload a file buffer/bytes to Neon Object Storage (`uploads` bucket).
 */
export async function uploadBuktiFile(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string
): Promise<string> {
  const files = getFilesClient();
  await files.upload(key, body, { contentType });
  return key;
}

/**
 * Generate a presigned GET URL (default 1 hour) for a stored object key.
 */
export async function getBuktiSignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const files = getFilesClient();
  return files.url(key, { expiresIn });
}
