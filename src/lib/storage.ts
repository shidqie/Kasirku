/**
 * Neon Object Storage helper — menggunakan AWS S3 SDK langsung
 * dengan env vars dari Neon (AWS_ENDPOINT_URL_S3, AWS_REGION, dsb.)
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = "uploads";

function getS3Client() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION || "auto";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint) {
    throw new Error(
      "AWS_ENDPOINT_URL_S3 belum diset. Tambahkan ke .env atau Vercel environment variables."
    );
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID atau AWS_SECRET_ACCESS_KEY belum diset."
    );
  }

  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

/**
 * Upload file ke Neon Object Storage bucket `uploads`.
 * Returns the object key.
 */
export async function uploadBuktiFile(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string
): Promise<string> {
  const s3 = getS3Client();

  // Konversi Blob ke Buffer jika perlu
  let buffer: Buffer | Uint8Array | string;
  if (body instanceof Blob) {
    buffer = Buffer.from(await body.arrayBuffer());
  } else {
    buffer = body;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return key;
}

/**
 * Generate presigned GET URL (default 1 jam) untuk object key.
 */
export async function getBuktiSignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const s3 = getS3Client();
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}
