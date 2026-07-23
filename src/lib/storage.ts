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
// 100 MB: a ~20-30s phone clip routinely exceeds 64 MB, which was silently
// bouncing message videos (punch-list item 6). Kept under next.config's
// serverActions bodySizeLimit so the whole submit still fits.
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_BYTES = 16 * 1024 * 1024; // 16 MB (verification docs)

// Verification documents: PDFs + images (license, registration, insurance).
const DOC_TYPES = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

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

/**
 * Message attachments (Round 3): photos and videos like everywhere else, PLUS
 * the documents trades actually send each other - a spec PDF, a quote, a
 * takeoff spreadsheet. Extensions come from this whitelist, never from the
 * uploaded filename, so a file can't choose what it is served as.
 */
const ATTACHMENT_TYPES = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["text/csv", "csv"],
  ["text/plain", "txt"],
]);
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

/** Save one chat attachment (image, video, or document), or null if unusable. */
export async function saveAttachment(file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  // Images and videos keep their own (smaller) limits from saveMedia.
  if (IMAGE_TYPES.has(file.type) || VIDEO_TYPES.has(file.type)) {
    return saveMedia(file);
  }
  const ext = ATTACHMENT_TYPES.get(file.type);
  if (!ext) return null;
  return file.size <= MAX_ATTACHMENT_BYTES ? write(file, ext) : null;
}

/** Save many chat attachments, dropping any unusable ones. Order preserved. */
export async function saveAttachments(files: File[]): Promise<(string | null)[]> {
  return Promise.all(files.map(saveAttachment));
}

/** Save one verification document (PDF or image), or null if invalid/oversized. */
export async function saveDocument(file: File): Promise<string | null> {
  if (!file || file.size === 0 || file.size > MAX_DOC_BYTES) return null;
  const ext = DOC_TYPES.get(file.type);
  return ext ? write(file, ext) : null;
}

export async function saveDocuments(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(saveDocument));
  return urls.filter((u): u is string => u !== null);
}
