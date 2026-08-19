import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

/**
 * Streams audio from the private Blob store. The store this account has is
 * private-only (access:"public" is rejected on put()), so there's no plain
 * public URL to hand the <audio> tag — this route does the authenticated
 * fetch server-side and pipes the bytes through instead.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const pathname = segments.join("/");

  const result = await get(pathname, { access: "private" });
  if (!result || !result.stream) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  return new NextResponse(result.stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": result.blob.contentType || "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
