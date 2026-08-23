"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { FONT_FORMAT, FONT_FILE_PURPOSE } from "@/types/enums";
import type { FontFilePurpose, FontFormat } from "@/types/enums";
import type { WizardFile } from "./types";

const CONTENT_TYPES: Record<FontFormat, string> = {
  OTF: "font/otf",
  TTF: "font/ttf",
  WOFF: "font/woff",
  WOFF2: "font/woff2",
};

const EXT_FORMAT: Record<string, FontFormat> = { otf: "OTF", ttf: "TTF", woff: "WOFF", woff2: "WOFF2" };

function guessFormat(filename: string): FontFormat {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_FORMAT[ext] ?? "OTF";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadRow = {
  key: string;
  filename: string;
  purpose: FontFilePurpose;
  progress: number;
  status: "uploading" | "validating" | "done" | "error";
  error?: string;
};

function putWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
    xhr.send(file);
  });
}

export function FilesPanel({
  fontId,
  files,
  onUploaded,
}: {
  fontId: string;
  files: WizardFile[];
  onUploaded: () => void | Promise<void>;
}) {
  const [purpose, setPurpose] = useState<FontFilePurpose>("DELIVERABLE");
  const [rows, setRows] = useState<UploadRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const format = guessFormat(file.name);
    const key = `${Date.now()}-${file.name}`;
    setRows((prev) => [...prev, { key, filename: file.name, purpose, progress: 0, status: "uploading" }]);

    try {
      const { uploadUrl, storageKey } = await apiFetch<{ uploadUrl: string; storageKey: string }>(
        `/api/seller/fonts/${fontId}/upload-url`,
        { method: "POST", body: JSON.stringify({ purpose, format, filename: file.name }) }
      );

      await putWithProgress(uploadUrl, file, CONTENT_TYPES[format], (pct) =>
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, progress: pct } : r)))
      );

      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: "validating", progress: 100 } : r)));

      await apiFetch(`/api/seller/fonts/${fontId}/files`, {
        method: "POST",
        body: JSON.stringify({ storageKey, purpose, format, originalFilename: file.name }),
      });

      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: "done" } : r)));
      toast.success(`${file.name} uploaded and validated.`);
      await onUploaded();
    } catch (err) {
      const message = err instanceof ClientApiError ? err.message : "Upload failed — please try again.";
      setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: "error", error: message } : r)));
      toast.error(message);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-medium">Upload font files</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload at least one <strong>deliverable</strong> file (what customers download after purchase) and one{" "}
          <strong>preview</strong> file (used for the live try-before-you-buy preview — this can be the same font).
          Files are validated automatically after upload; a font that fails validation can&apos;t be used.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label className="mb-1.5 block text-sm">Purpose</Label>
          <Select value={purpose} onValueChange={(v) => setPurpose(v as FontFilePurpose)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FILE_PURPOSE.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "DELIVERABLE" ? "Deliverable (customer download)" : "Preview (live preview)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="size-4" /> Choose file…
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={FONT_FORMAT.map((f) => `.${f.toLowerCase()}`).join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="rounded-lg border border-border px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{row.filename}</span>
                {row.status === "uploading" && <span className="text-muted-foreground">{row.progress}%</span>}
                {row.status === "validating" && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                {row.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                {row.status === "error" && <XCircle className="size-4 shrink-0 text-destructive" />}
              </div>
              {row.status === "uploading" && <Progress value={row.progress} className="mt-2 h-1" />}
              {row.status === "error" && <p className="mt-1 text-xs text-destructive">{row.error}</p>}
            </li>
          ))}
        </ul>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Uploaded files</p>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{f.originalFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.purpose === "DELIVERABLE" ? "Deliverable" : "Preview"} · {f.format} · {formatBytes(f.fileSizeBytes)}
                  </p>
                </div>
                {f.validated ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-label="Validated" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-destructive" aria-label="Not validated" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
