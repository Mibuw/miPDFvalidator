import { createHash, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Simple API-key authentication for the REST endpoints.
 *
 * Keys are read from the `API_KEYS` env var (comma-separated, so multiple keys
 * can be valid at once for rotation). A client authenticates by sending either:
 *   - `X-API-Key: <key>`               or
 *   - `Authorization: Bearer <key>`
 *
 * Enforcement is active only when `API_KEYS` is set — if it is empty (e.g. local
 * dev), the endpoints stay open. Production must set it.
 */

function configuredKeys(): string[] {
  return (process.env.API_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function authEnabled(): boolean {
  return configuredKeys().length > 0;
}

function extractKey(req: NextRequest): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();
  const auth = req.headers.get("authorization");
  if (auth && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  return null;
}

/** Constant-time comparison via fixed-length digests (avoids length leaks/throws). */
function safeEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

/** True if the request carries a valid key, or if auth is disabled (no keys configured). */
export function isAuthorized(req: NextRequest): boolean {
  const keys = configuredKeys();
  if (keys.length === 0) return true;
  const provided = extractKey(req);
  if (!provided) return false;
  return keys.some((k) => safeEqual(k, provided));
}

/** Standard 401 response for missing/invalid credentials. */
export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized. Provide a valid API key via the 'X-API-Key' header or 'Authorization: Bearer <key>'." },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="miPDFvalidator API"' } },
  );
}
