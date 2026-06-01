import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Media storage abstraction (PRD §10). In dev we write to the local filesystem
 * under UPLOAD_DIR (default ./public/uploads), served at /uploads/<name>. Callers
 * only see the returned public URL, so a cloud backend (S3/R2) can swap in here
 * later without touching them.
 */

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./public/uploads";
const PUBLIC_PREFIX = "/uploads";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 64 * 1024 * 1024; // 64 MB

const IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const VIDEO_TYPES = new Map<string, string>([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

async function write(file: File, ext: string): Promise<string> {
  const name = `${randomUUID()}.${ext}`;
  const dir = path.resolve(UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), bytes);
  return `${PUBLIC_PREFIX}/${name}`;
}

/** Save one image and return its public URL, or null if invalid/oversized. */
export async function saveImage(file: File): Promise<string | null> {
  if (!file || file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  const ext = IMAGE_TYPES.get(file.type);
  return ext ? write(file, ext) : null;
}

export async function saveImages(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(saveImage));
  return urls.filter((u): u is string => u !== null);
}

/** Save one image OR video and return its public URL, or null if invalid/oversized. */
export async function saveMedia(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const img = IMAGE_TYPES.get(file.type);
  if (img) return file.size <= MAX_IMAGE_BYTES ? write(file, img) : null;
  const vid = VIDEO_TYPES.get(file.type);
  if (vid) return file.size <= MAX_VIDEO_BYTES ? write(file, vid) : null;
  return null;
}

/** Save many images/videos, dropping any invalid ones. Order preserved. */
export async function saveMediaFiles(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(saveMedia));
  return urls.filter((u): u is string => u !== null);
}
