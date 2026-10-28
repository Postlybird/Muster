/**
 * File uploads. Files go straight from the browser into private storage, in
 * a folder named after the worker's (or, for job photos, the business's) id;
 * forms then send the stored path to the server, which checks it before
 * saving.
 */

export type WorkerBucket = "worker-photos" | "identity" | "worker-docs";
export type UploadBucket = WorkerBucket | "job-photos";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Police certificates are kept with ID images (workers can't read them back,
 * and they're deleted after checking). Other ticket copies are kept.
 */
export function credentialBucket(kind: string): "identity" | "worker-docs" {
  return kind === "police_check" ? "identity" : "worker-docs";
}

export const UPLOAD_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  document: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
  ],
} as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export function extensionFor(contentType: string): string | null {
  return EXTENSIONS[contentType] ?? null;
}

/** A new file's path: `{folder}/{prefix}-{random}.{ext}`. */
export function uploadPath(
  workerId: string,
  prefix: string,
  contentType: string,
  random: string,
): string {
  return `${workerId}/${prefix}-${random}.${extensionFor(contentType) ?? "bin"}`;
}

const PATH_PATTERN =
  /^([0-9a-f-]{36})\/([a-z][a-z0-9-]*)-[0-9a-f-]{36}\.(jpg|png|webp|heic|heif|pdf)$/;

/**
 * True if a path from a form is a fresh upload into this worker's own folder
 * with the expected prefix. (The database also refuses other folders.)
 */
export function isOwnUpload(
  path: string,
  workerId: string,
  prefix: string,
): boolean {
  const match = PATH_PATTERN.exec(path);
  return !!match && match[1] === workerId && match[2] === prefix;
}

/**
 * The path to save from a form: unchanged, a valid new upload, or null when
 * nothing was given. Returns undefined for anything else (reject the form).
 */
export function acceptedUpload(
  submitted: FormDataEntryValue | null,
  current: string | null,
  workerId: string,
  prefix: string,
): string | null | undefined {
  const path = typeof submitted === "string" ? submitted.trim() : "";
  if (path === "") return null;
  if (path === current) return current;
  return isOwnUpload(path, workerId, prefix) ? path : undefined;
}
