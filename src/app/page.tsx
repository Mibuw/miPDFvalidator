"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { UploadDropzone, formatBytes } from "@/components/UploadDropzone";
import { ValidationResultView } from "@/components/ValidationResultView";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/LanguageProvider";
import type { ValidationResponse } from "@/lib/types";

type Phase = "idle" | "selected" | "loading" | "done" | "error";

export default function Home() {
  const { t, locale } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setFile(null);
    setResult(null);
    setError(null);
  }, []);

  const onFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setPhase("selected");
  }, []);

  const verify = useCallback(async () => {
    if (!file) return;
    setPhase("loading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/validate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error ?? "Validation failed.", detail: data.detail });
        setPhase("error");
        return;
      }
      setResult(data as ValidationResponse);
      setPhase("done");
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : String(err) });
      setPhase("error");
    }
  }, [file]);

  const downloadPdf = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: result.report, locale }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verification-report_${(result.report.documentName ?? "document").replace(/\.[^.]+$/, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : String(err) });
    } finally {
      setDownloading(false);
    }
  }, [result, locale]);

  const downloadRaw = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.raw, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dss-report_${(result.report.documentName ?? "document").replace(/\.[^.]+$/, "")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-8 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t("app.title")}</h1>
            <p className="text-sm text-slate-500">{t("app.subtitle")}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {(phase === "idle" || phase === "selected" || phase === "loading" || phase === "error") && (
            <motion.section
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-800">{t("upload.headline")}</h2>
                <UploadDropzone onFile={onFile} disabled={phase === "loading"} />
              </div>

              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                        <path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {t("upload.selected")} · {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={reset}
                      disabled={phase === "loading"}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {t("upload.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={verify}
                      disabled={phase === "loading"}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {phase === "loading" && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      )}
                      {phase === "loading" ? t("upload.verifying") : t("upload.verify")}
                    </button>
                  </div>
                </motion.div>
              )}

              {phase === "error" && error && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-red-800">{t("error.title")}</p>
                  <p className="mt-1 text-sm text-red-700">{error.message}</p>
                  {error.detail && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-100/60 p-2 text-xs text-red-800 scroll-slim">
                      {error.detail}
                    </pre>
                  )}
                </motion.div>
              )}
            </motion.section>
          )}

          {phase === "done" && result && (
            <motion.section
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-800">{t("result.title")}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {downloading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
                      </svg>
                    )}
                    {t("result.downloadPdf")}
                  </button>
                  <button
                    type="button"
                    onClick={downloadRaw}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {t("result.downloadRaw")}
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    {t("result.newCheck")}
                  </button>
                </div>
              </div>

              <ValidationResultView report={result.report} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-12 flex flex-col items-center gap-1 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        <span>{t("report.footer")}</span>
        <a href="/docs" className="font-medium text-blue-600 hover:underline">
          REST-API · /docs
        </a>
      </footer>
    </main>
  );
}
