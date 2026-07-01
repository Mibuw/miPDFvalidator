"use client";

import { statusOf, type StatusCategory } from "@/lib/status";
import { useI18n } from "./LanguageProvider";

const STYLES: Record<StatusCategory, string> = {
  pass: "bg-green-100 text-green-800 ring-green-600/20",
  indeterminate: "bg-amber-100 text-amber-800 ring-amber-600/20",
  fail: "bg-red-100 text-red-800 ring-red-600/20",
};

const DOT: Record<StatusCategory, string> = {
  pass: "bg-green-500",
  indeterminate: "bg-amber-500",
  fail: "bg-red-500",
};

export function IndicationBadge({ indication, size = "sm" }: { indication?: string; size?: "sm" | "lg" }) {
  const { ti } = useI18n();
  const cat = statusOf(indication);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${STYLES[cat]} ${
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[cat]}`} />
      {ti(indication)}
    </span>
  );
}
