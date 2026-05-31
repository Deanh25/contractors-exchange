import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Image storage abstraction (PRD §10). In dev we write to the local filesystem
 * under UPLOAD_DIR (default ./public/uploads), which Next serves statically at
 * /uploads/<name>. The rest of the app only sees the returned public URL string,
 * so a cloud storage backend (S3/R2) can swap in here later without touching callers.
 */

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./public/uploads";
const PUBLIC_PREFIX = "/uploads"; // how the saved file is addressed in the browser

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per image
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

/** Save one uploaded image and return its public URL, or null if it isn't a valid image. */
export async function saveImage(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) return null;
  const ext = ALLOWED.get(file.type);
  if (!ext) return null;

  const name = `${randomUUID()}.${ext}`;
  const dir = path.resolve(UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), bytes);

  return `${PUBLIC_PREFIX}/${name}`;
}

/** Save many images, dropping any that are empty/invalid. Order is preserved. */
export async function saveImages(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(saveImage));
  return urls.filter((u): u is string => u !== null);
}
