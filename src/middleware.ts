import { NextResponse, type NextRequest } from "next/server";

/**
 * This app exposes **no** Server Actions — every mutation goes through the
 * `/api/*` route handlers (see `src/app/page.tsx`, which uses `fetch`).
 *
 * A public instance gets probed by bots that POST a bogus `Next-Action`
 * header. Next.js would otherwise try to resolve the (non-existent) action and
 * log a noisy "Failed to find Server Action" stack trace on every hit. Since we
 * never handle actions, short-circuit any such request quietly with 400.
 *
 * If Server Actions are ever added to this project, remove this guard.
 */
export function middleware(req: NextRequest) {
  if (req.headers.has("next-action")) {
    return new NextResponse(null, { status: 400 });
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next's static assets and the favicon.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
