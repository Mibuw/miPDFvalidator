import type { Indication } from "./types";

export type StatusCategory = "pass" | "indeterminate" | "fail";

/** Map a DSS indication onto one of three status categories. */
export function statusOf(indication: Indication | string | undefined): StatusCategory {
  const v = (indication ?? "").toUpperCase();
  if (v.includes("FAILED") || v === "NO_SIGNATURE_FOUND") return "fail";
  if (v.includes("PASSED")) return "pass";
  return "indeterminate";
}

/** Hex colours used by the PDF renderer (Tailwind classes handle the DOM). */
export const STATUS_HEX: Record<StatusCategory, { fg: string; bg: string }> = {
  pass: { fg: "#166534", bg: "#dcfce7" },
  indeterminate: { fg: "#92400e", bg: "#fef3c7" },
  fail: { fg: "#991b1b", bg: "#fee2e2" },
};

/** Format an ISO/DSS date string for display; returns the raw value on failure. */
export function formatDate(value: string | undefined, locale = "de"): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }).format(d) + " UTC";
  } catch {
    return d.toISOString();
  }
}
