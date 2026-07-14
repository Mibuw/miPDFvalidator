import { NextRequest, NextResponse } from "next/server";
import { readStats } from "@/lib/stats";
import { logger, newRequestId } from "@/lib/logger";

// Reads the append-only validation log from disk — Node runtime required.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-user usage statistics: how many documents each authenticated user has
 * validated (with a breakdown by overall indication). Protected by the same
 * Basic auth as everything else (see middleware).
 */
function isAdmin(user: string): boolean {
  const authEnabled = (process.env.BASIC_AUTH_USERS || "").trim().length > 0;
  // When auth is disabled (local dev), stats are open. Otherwise the user must
  // be listed in ADMIN_USERS.
  if (!authEnabled) return true;
  const admins = (process.env.ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return admins.includes(user);
}

export async function GET(req: NextRequest) {
  const user = req.headers.get("x-auth-user") || "anonymous";
  const log = logger.child({ channel: "api", route: "/api/stats", reqId: newRequestId(), user });

  if (!isAdmin(user)) {
    log.warn("forbidden (not admin)");
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  const stats = await readStats();
  log.info("stats read", {
    totalDocuments: stats.totalDocuments,
    users: Object.keys(stats.users).length,
  });
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
