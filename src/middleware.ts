import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware runs on every request (except static assets, see `config.matcher`)
 * and does two things:
 *
 *  1. Blocks bogus `Next-Action` probes from bots — this app exposes no Server
 *     Actions (all mutations go through the `/api/*` route handlers), so such a
 *     request would otherwise produce a noisy "Failed to find Server Action" log.
 *
 *  2. Enforces HTTP **Basic authentication** on the protected paths only —
 *     the public REST API `/api/v1/*` and the admin `/api/stats`. The web UI
 *     (the page and the endpoints it uses, `/api/validate` + `/api/report`) is
 *     left open so it works as a public demo. Programmatic clients send
 *     `Authorization: Basic base64(user:pass)`. The authenticated username is
 *     forwarded to route handlers via the `x-auth-user` header (for per-user
 *     usage tracking); any client-supplied value is stripped to prevent
 *     spoofing.
 *
 * `BASIC_AUTH_USERS` is a comma-separated list of `user:password` pairs. If it is
 * empty (e.g. local development), authentication is disabled.
 */

/** Paths that require authentication. Everything else (UI, demo) is public. */
function requiresAuth(pathname: string): boolean {
  return pathname.startsWith("/api/v1/") || pathname.startsWith("/api/stats");
}

function parseUsers(): Map<string, string> {
  const users = new Map<string, string>();
  for (const pair of (process.env.BASIC_AUTH_USERS || "").split(",")) {
    const entry = pair.trim();
    if (!entry) continue;
    const sep = entry.indexOf(":");
    if (sep <= 0) continue;
    users.set(entry.slice(0, sep), entry.slice(sep + 1));
  }
  return users;
}

/** Length-independent, early-exit-free string comparison. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Returns the authenticated username, or null if credentials are missing/invalid. */
function authenticate(req: NextRequest, users: Map<string, string>): string | null {
  const header = req.headers.get("authorization") || "";
  if (!/^basic\s+/i.test(header)) return null;
  let decoded: string;
  try {
    decoded = atob(header.replace(/^basic\s+/i, "").trim());
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  const expected = users.get(user);
  if (expected === undefined) {
    safeEqual(pass, pass); // reduce user-enumeration timing signal
    return null;
  }
  return safeEqual(pass, expected) ? user : null;
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="miPDFvalidator", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest) {
  // (1) Drop bogus Server-Action probes quietly.
  if (req.headers.has("next-action")) {
    return new NextResponse(null, { status: 400 });
  }

  // Always strip any client-supplied identity header (anti-spoofing).
  const headers = new Headers(req.headers);
  headers.delete("x-auth-user");

  // (2) Basic auth on protected paths only (when configured).
  const users = parseUsers();
  if (users.size > 0 && requiresAuth(req.nextUrl.pathname)) {
    const user = authenticate(req, users);
    if (!user) return unauthorized();
    headers.set("x-auth-user", user);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's static assets and the favicon.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
