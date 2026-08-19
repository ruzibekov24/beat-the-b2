import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { put } from "@vercel/blob";

/**
 * Storage abstraction for uploaded audio files.
 *
 * Vercel's serverless functions have no persistent disk — anything written
 * to /public/uploads at runtime disappears on the next cold start. When a
 * Blob store is connected (Vercel dashboard → Storage → Blob → Connect to
 * Project), uploads go there instead and get a permanent public URL. Local
 * dev with no store connected falls back to the filesystem, which is fine
 * since `next dev` runs as one long-lived process.
 *
 * Vercel's newer "Connect Project" flow uses OIDC federation (BLOB_STORE_ID
 * + a short-lived token Vercel injects into the function runtime itself,
 * not a static dashboard env var) rather than the older static
 * BLOB_READ_WRITE_TOKEN — @vercel/blob's `put()` auto-detects whichever is
 * present, so we just need to know a store is connected at all.
 */
export async function uploadAudioFile(file: File): Promise<string> {
  const ext = path.extname(file.name) || ".mp3";
  const filename = `${crypto.randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    const blob = await put(`audio/${filename}`, file, { access: "public" });
    return blob.url;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "audio");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);

  return `/uploads/audio/${filename}`;
}
