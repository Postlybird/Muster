"use client";

import { Camera, CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { shrinkImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_TYPES,
  uploadPath,
  type UploadBucket,
} from "@/lib/uploads";
import { cn } from "@/lib/utils";

type Status =
  | { state: "empty" }
  | { state: "working" }
  | { state: "done"; previewUrl: string | null; fileName: string | null }
  | { state: "failed"; message: string };

export type ExistingFile = {
  path: string;
  /** A short-lived link, when the worker is allowed to see the file again. */
  previewUrl?: string | null;
};

/**
 * Picks a photo or PDF, shrinks photos in the browser, and uploads straight
 * to private storage. The stored path goes in a hidden input called `name`.
 */
export function FileUpload({
  id,
  name,
  label,
  hint,
  error,
  bucket,
  folder,
  prefix,
  accept = "image",
  capture,
  maxDimension = 1600,
  existing,
  onBusyChange,
}: {
  id: string;
  name: string;
  label: string;
  hint?: React.ReactNode;
  error?: string[];
  bucket: UploadBucket;
  /** The worker's id: files go in their own folder. */
  folder: string;
  prefix: string;
  accept?: "image" | "document";
  /** Opens the camera directly on phones ("user" for selfies). */
  capture?: "user" | "environment";
  maxDimension?: number;
  existing?: ExistingFile | null;
  onBusyChange?: (busy: boolean) => void;
}) {
  const hintId = useId();
  const errorId = useId();
  const [path, setPath] = useState(existing?.path ?? "");
  const [status, setStatus] = useState<Status>(
    existing
      ? {
          state: "done",
          previewUrl: existing.previewUrl ?? null,
          fileName: null,
        }
      : { state: "empty" },
  );

  // Object URLs for local previews are released when replaced or unmounted.
  const localPreview =
    status.state === "done" && status.previewUrl?.startsWith("blob:")
      ? status.previewUrl
      : null;
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;

    const allowed: readonly string[] = UPLOAD_TYPES[accept];
    if (picked.type && !allowed.includes(picked.type)) {
      setStatus({
        state: "failed",
        message:
          accept === "image"
            ? "Choose a photo (JPEG, PNG or HEIC)."
            : "Choose a photo or a PDF.",
      });
      return;
    }

    setStatus({ state: "working" });
    onBusyChange?.(true);
    try {
      const file = await shrinkImage(picked, maxDimension);
      if (file.size > MAX_UPLOAD_BYTES) {
        setStatus({
          state: "failed",
          message: "That file is bigger than 10 MB. Try a smaller photo.",
        });
        return;
      }
      const contentType = file.type || picked.type || "image/jpeg";
      const newPath = uploadPath(
        folder,
        prefix,
        contentType,
        crypto.randomUUID(),
      );
      const { error: uploadError } = await createClient()
        .storage.from(bucket)
        .upload(newPath, file, { contentType, upsert: false });
      if (uploadError) {
        setStatus({
          state: "failed",
          message:
            "The upload didn't work. Check your connection and try again.",
        });
        return;
      }
      setPath(newPath);
      setStatus({
        state: "done",
        previewUrl: contentType.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        fileName: picked.name,
      });
    } catch {
      setStatus({
        state: "failed",
        message: "The upload didn't work. Check your connection and try again.",
      });
    } finally {
      onBusyChange?.(false);
    }
  }

  const message =
    status.state === "failed" ? status.message : (error?.[0] ?? null);
  const describedBy =
    [message ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const isImage = accept === "image";
  const Icon = capture ? Camera : Upload;
  const actionText =
    status.state === "done"
      ? isImage
        ? "Change photo"
        : "Change file"
      : capture
        ? "Take a photo"
        : isImage
          ? "Choose a photo"
          : "Choose a photo or PDF";

  return (
    <div className="space-y-2">
      <p className="text-sm leading-none font-medium" id={`${id}-label`}>
        {label}
      </p>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-4 rounded-lg border p-3",
          status.state === "empty" && "border-dashed",
          message && "border-destructive",
        )}
      >
        {status.state === "done" ? (
          status.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local or signed private URL
            <img
              src={status.previewUrl}
              alt=""
              className="size-16 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted">
              <FileText className="size-7 text-muted-foreground" aria-hidden />
            </span>
          )
        ) : null}

        <div className="min-w-0 flex-1 space-y-1" aria-live="polite">
          {status.state === "working" ? (
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Uploading…
            </p>
          ) : status.state === "done" ? (
            <p className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-success" aria-hidden />
              <span className="truncate">
                {status.fileName ? `Uploaded ${status.fileName}` : "Uploaded"}
              </span>
            </p>
          ) : null}
          <input
            id={id}
            type="file"
            className="peer sr-only"
            accept={UPLOAD_TYPES[accept].join(",")}
            capture={capture}
            aria-labelledby={`${id}-label`}
            aria-describedby={describedBy}
            aria-invalid={message ? true : undefined}
            disabled={status.state === "working"}
            onChange={onChange}
          />
          <label
            htmlFor={id}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-sm font-medium text-primary underline-offset-4 peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 hover:underline",
              status.state === "empty" &&
                "w-full justify-center py-3 text-base",
              status.state === "working" && "pointer-events-none opacity-50",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {actionText}
          </label>
        </div>
      </div>
      {message ? (
        <p id={errorId} className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <input type="hidden" name={name} value={path} />
    </div>
  );
}
