/**
 * Minimal dependency-free structured logger.
 *
 * Emits one JSON object per line to stdout/stderr — ideal for Docker
 * (`docker compose logs`) and log collectors (Loki, ELK, …). The level is
 * controlled by the `LOG_LEVEL` env var (`debug` | `info` | `warn` | `error`,
 * default `info`).
 *
 * Never log document contents (base64 bytes) — only metadata such as file
 * names, sizes, timings and result indications.
 */

export type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVELS[env as Level] ?? LEVELS.info;
}

type Fields = Record<string, unknown>;

function emit(level: Level, msg: string, fields?: Fields): void {
  if (LEVELS[level] < threshold()) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  // Route warn/error to stderr so infrastructure can split streams if wanted.
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  /** Derive a logger that always includes the given fields (e.g. a request id). */
  child(bound: Fields): Logger;
}

function make(bound: Fields): Logger {
  return {
    debug: (m, f) => emit("debug", m, { ...bound, ...f }),
    info: (m, f) => emit("info", m, { ...bound, ...f }),
    warn: (m, f) => emit("warn", m, { ...bound, ...f }),
    error: (m, f) => emit("error", m, { ...bound, ...f }),
    child: (b) => make({ ...bound, ...b }),
  };
}

export const logger: Logger = make({});

/** Short, collision-resistant id to correlate all log lines of one request. */
export function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

/** Normalize an unknown thrown value into a compact loggable shape. */
export function errFields(err: unknown): Fields {
  if (err instanceof Error) {
    return { errName: err.name, errMessage: err.message };
  }
  return { errMessage: String(err) };
}
