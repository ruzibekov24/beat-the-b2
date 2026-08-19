import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

/**
 * Storage abstraction for uploaded audio files.
 *
 * Vercel's serverless functions have no persistent disk — anything written
 * to /public/uploads at runtime disappears on the next cold start. When a
 * Blob store is connected (Vercel dashboard → Storage → Create Database →
 * Blob → Connect to Project, which auto-populates BLOB_READ_WRITE_TOKEN),
 * uploads go there instead and get a permanent public URL. Local dev with
 * no token falls back to the filesystem, which is fine since `next dev`
 * runs as one long-lived process.
 */
export async function uploadAudioFile(file: File): Promise<string> {
  const ext = path.extname(file.name) || ".mp3";
  const filename = `${crypto.randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`audio/${filename}`, file, { access: "public" });
    return blob.url;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "audio");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);

  return `/uploads/audio/${filename}`;
}
