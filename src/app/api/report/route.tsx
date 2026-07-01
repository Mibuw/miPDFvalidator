import { NextRequest, NextResponse } from "next/server";
import { renderReportToBuffer } from "@/lib/report-pdf";
import type { NormalizedReport } from "@/lib/types";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";

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
  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.report || !Array.isArray(body.report.tokens)) {
    return NextResponse.json({ error: "Missing or malformed report payload." }, { status: 400 });
  }

  const locale: Locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : DEFAULT_LOCALE;

  try {
    const buffer = await renderReportToBuffer(body.report, locale);
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
    return NextResponse.json(
      { error: "Failed to render PDF report.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
