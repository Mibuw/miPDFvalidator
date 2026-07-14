import { appendFile, readFile } from "fs/promises";

/**
 * Lightweight, dependency-free per-user usage tracking.
 *
 * Each completed validation appends one JSON line to `STATS_FILE` (default
 * `/data/validations.jsonl`, a Docker volume so it survives restarts). Appends
 * of a single short line are atomic on Linux, so concurrent writers don't
 * interleave. `readStats()` aggregates the file into per-user counts for the
 * `/api/stats` endpoint. Failures here must never break a validation, so all
 * writes are best-effort.
 */

const STATS_FILE = process.env.STATS_FILE || "/data/validations.jsonl";

export interface ValidationRecord {
  ts: string;
  user: string;
  route: string;
  indication: string;
  valid: number;
  total: number;
}

/** Best-effort append of one validation record. Never throws. */
export async function recordValidation(rec: Omit<ValidationRecord, "ts">): Promise<void> {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n";
    await appendFile(STATS_FILE, line, "utf8");
  } catch {
    /* tracking is best-effort — ignore write errors */
  }
}

export interface UserStats {
  documents: number;
  byIndication: Record<string, number>;
  firstAt: string | null;
  lastAt: string | null;
}

export interface StatsSummary {
  totalDocuments: number;
  users: Record<string, UserStats>;
  generatedAt: string;
}

/** Read and aggregate the validation log into per-user counts. */
export async function readStats(): Promise<StatsSummary> {
  const users: Record<string, UserStats> = {};
  let totalDocuments = 0;

  let content = "";
  try {
    content = await readFile(STATS_FILE, "utf8");
  } catch {
    // No file yet → empty stats.
    return { totalDocuments: 0, users: {}, generatedAt: new Date().toISOString() };
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: ValidationRecord;
    try {
      rec = JSON.parse(trimmed) as ValidationRecord;
    } catch {
      continue;
    }
    const user = rec.user || "anonymous";
    const u = (users[user] ??= { documents: 0, byIndication: {}, firstAt: null, lastAt: null });
    u.documents += 1;
    totalDocuments += 1;
    const ind = rec.indication || "UNKNOWN";
    u.byIndication[ind] = (u.byIndication[ind] || 0) + 1;
    if (rec.ts) {
      if (!u.firstAt || rec.ts < u.firstAt) u.firstAt = rec.ts;
      if (!u.lastAt || rec.ts > u.lastAt) u.lastAt = rec.ts;
    }
  }

  return { totalDocuments, users, generatedAt: new Date().toISOString() };
}
