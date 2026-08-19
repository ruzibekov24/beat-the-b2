import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Storage abstraction for uploaded audio files.
 *
 * MVP implementation writes to the local filesystem under /public/uploads,
 * which works for a single-instance deployment or local dev. Swap this
 * function's body for an S3 / R2 / GCS client when deploying to a
 * multi-instance or serverless environment — the call sites
 * (admin listening route) don't need to change.
 */
export async function uploadAudioFile(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".mp3";
  const filename = `${crypto.randomUUID()}${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "audio");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);

  return `/uploads/audio/${filename}`;
}
