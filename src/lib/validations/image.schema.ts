import { z } from "zod";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/;

export function isSafeImageDataUrl(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return true;
  if (trimmed === "/logo.png") return true;

  const match = DATA_IMAGE_REGEX.exec(trimmed);
  if (!match) return false;

  const base64Body = match[2];
  const estimatedBytes = Math.floor((base64Body.length * 3) / 4);
  return estimatedBytes <= MAX_IMAGE_BYTES;
}

export const safeImageSchema = z
  .string()
  .refine(isSafeImageDataUrl, {
    message:
      "Format gambar tidak valid atau melebihi 2 MB. Hanya mendukung PNG, JPG, atau WEBP.",
  })
  .nullable()
  .optional();
