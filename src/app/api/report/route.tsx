import { NextRequest, NextResponse } from "next/server";
import { renderReportToBuffer } from "@/lib/report-pdf";
import type { NormalizedReport } from "@/lib/types";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";
import { logger, newRequestId, errFields } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportRequest {
  report: NormalizedReport;
  locale?: Locale;
}

function safeFilename(name: string | undefined): string {
  const base = (name ?? "document").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `verification-report_${base || "document"}.pdf`;
}

export async function POST(req: NextRequest) {
  // channel "web": this route backs the browser UI (not the public REST API).
  // Public demo endpoint (no auth) — used by the web UI to render the PDF.
  const user = req.headers.get("x-auth-user") || "demo";
  const log = logger.child({ channel: "web", route: "/api/report", reqId: newRequestId(), user });
  const startedAt = Date.now();

  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    log.warn("invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.report || !Array.isArray(body.report.tokens)) {
    log.warn("malformed report payload");
    return NextResponse.json({ error: "Missing or malformed report payload." }, { status: 400 });
  }

  const locale: Locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : DEFAULT_LOCALE;

  try {
    const buffer = await renderReportToBuffer(body.report, locale);
    log.info("report rendered", {
      document: body.report.documentName,
      lang: locale,
      bytes: buffer.length,
      ms: Date.now() - startedAt,
    });
    // Wrap in a fresh Uint8Array so the Web `Response` body type accepts it.
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(body.report.documentName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    log.error("report render failed", { ms: Date.now() - startedAt, ...errFields(err) });
    return NextResponse.json(
      { error: "Failed to render PDF report.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
