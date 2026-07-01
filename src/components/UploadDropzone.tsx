"use client";

import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useI18n } from "./LanguageProvider";

const MAX_MB = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadDropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const accept = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (file.size > MAX_MB * 1024 * 1024) {
        setLocalError(t("upload.tooLarge", { mb: MAX_MB }));
        return;
      }
      setLocalError(null);
      onFile(file);
    },
    [onFile, t],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      accept(e.dataTransfer.files?.[0]);
    },
    [accept, disabled],
  );

  return (
    <div>
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.005 }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
          dragging
            ? "border-blue-500 bg-blue-50/70"
            : "border-slate-300 bg-white/60 hover:border-blue-400 hover:bg-white"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/10 text-blue-700">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 16V4m0 0 4 4m-4-4L8 8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-800">{t("upload.dnd")}</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">{t("upload.hint")}</p>
        <span className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition group-hover:bg-blue-700">
          {t("upload.button")}
        </span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </motion.div>
      {localError && <p className="mt-3 text-sm font-medium text-red-600">{localError}</p>}
    </div>
  );
}

export { formatBytes };
