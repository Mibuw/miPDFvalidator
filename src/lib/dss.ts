import type { DssRawReports } from "./types";
import { logger, errFields, type Logger } from "./logger";

/**
 * Thin client for the DSS SOAP/REST "webapp-demo" validation service.
 *
 * We only use the validation part of the API:
 *   POST ${DSS_API_URL}/services/rest/validation/validateSignature
 *
 * The endpoint accepts a `DataToValidateDTO` and returns a `WSReportsDTO`
 * containing SimpleReport / DetailedReport / DiagnosticData (+ ETSI VR).
 *
 * Docs: https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/services/
 */

export interface RemoteDocument {
  /** base64-encoded content */
  bytes: string;
  name: string;
}

export interface ValidateOptions {
  signedDocument: RemoteDocument;
  /** For detached signatures the original document(s) can be supplied. */
  originalDocuments?: RemoteDocument[];
  /** Optional custom validation policy (base64 XML). */
  policy?: RemoteDocument | null;
  /**
   * Which token details DSS should embed in the DiagnosticData. Values map to
   * DSS's `TokenExtractionStrategy` enum. `EXTRACT_ALL` includes certificates,
   * timestamps and revocation data (OCSP/CRL) — what our report needs.
   */
  tokenExtractionStrategy?:
    | "NONE"
    | "EXTRACT_ALL"
    | "EXTRACT_TIMESTAMPS_ONLY"
    | "EXTRACT_CERTIFICATES_ONLY"
    | "EXTRACT_REVOCATION_DATA_ONLY";
  /** Request-scoped logger; falls back to the module logger when omitted. */
  log?: Logger;
}

export class DssError extends Error {
  status?: number;
  detail?: string;
  constructor(message: string, opts: { status?: number; detail?: string } = {}) {
    super(message);
    this.name = "DssError";
    this.status = opts.status;
    this.detail = opts.detail;
  }
}

function baseUrl(): string {
  const url = process.env.DSS_API_URL?.trim();
  if (!url) {
    throw new DssError(
      "DSS_API_URL is not configured. Set it in .env.local to your DSS webapp base URL (e.g. http://localhost:8080).",
    );
  }
  return url.replace(/\/+$/, "");
}

function timeoutMs(): number {
  const n = Number(process.env.DSS_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

/**
 * Call DSS validateSignature. Returns the raw reports DTO (defensively typed).
 */
export async function validateSignature(opts: ValidateOptions): Promise<DssRawReports> {
  const log = opts.log ?? logger;
  const endpoint = `${baseUrl()}/services/rest/validation/validateSignature`;

  const payload = {
    signedDocument: {
      bytes: opts.signedDocument.bytes,
      name: opts.signedDocument.name,
    },
    originalDocuments:
      opts.originalDocuments?.map((d) => ({ bytes: d.bytes, name: d.name })) ?? null,
    policy: opts.policy ?? null,
    evidenceRecords: null,
    tokenExtractionStrategy: opts.tokenExtractionStrategy ?? "NONE",
    signatureId: null,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  const startedAt = Date.now();
  log.info("DSS validateSignature request", {
    endpoint,
    document: opts.signedDocument.name,
    strategy: opts.tokenExtractionStrategy ?? "NONE",
    detached: (opts.originalDocuments?.length ?? 0) > 0,
  });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(timer);
    const ms = Date.now() - startedAt;
    if (err instanceof Error && err.name === "AbortError") {
      log.error("DSS request timed out", { endpoint, ms, timeoutMs: timeoutMs() });
      throw new DssError(`DSS request timed out after ${timeoutMs()}ms.`, { status: 504 });
    }
    log.error("DSS backend unreachable", { endpoint, ms, ...errFields(err) });
    throw new DssError(
      `Could not reach the DSS backend at ${endpoint}. Is the DSS Docker container running and DSS_API_URL correct?`,
      { detail: err instanceof Error ? err.message : String(err) },
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  const ms = Date.now() - startedAt;

  if (!res.ok) {
    log.error("DSS validation returned error status", {
      endpoint,
      status: res.status,
      ms,
      bodyBytes: text.length,
    });
    throw new DssError(`DSS validation failed (HTTP ${res.status}).`, {
      status: res.status,
      detail: text.slice(0, 2000),
    });
  }

  try {
    const parsed = JSON.parse(text) as DssRawReports;
    log.info("DSS validateSignature ok", { status: res.status, ms, bodyBytes: text.length });
    return parsed;
  } catch {
    log.error("DSS returned non-JSON response", { endpoint, status: res.status, ms, bodyBytes: text.length });
    throw new DssError("DSS returned a response that is not valid JSON.", {
      status: 502,
      detail: text.slice(0, 2000),
    });
  }
}
