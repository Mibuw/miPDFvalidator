import { NextRequest, NextResponse } from "next/server";
import { DssError } from "@/lib/dss";
import { verifyDocument } from "@/lib/verify";
import { renderReportToBuffer } from "@/lib/report-pdf";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n";
import { logger, newRequestId, errFields } from "@/lib/logger";
import { isAuthorized, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maxBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 20;
  return mb * 1024 * 1024;
}

function resolveLocale(req: NextRequest): Locale {
  const q = req.nextUrl.searchParams.get("lang");
  return LOCALES.includes(q as Locale) ? (q as Locale) : DEFAULT_LOCALE;
}

function resolveFormat(req: NextRequest): "pdf" | "json" {
  const q = (req.nextUrl.searchParams.get("format") || "").toLowerCase();
  if (q === "json") return "json";
  if (q === "pdf") return "pdf";
  // Content negotiation: honour Accept: application/json, otherwise default PDF.
  const accept = req.headers.get("accept") || "";
  if (accept.includes("application/json") && !accept.includes("application/pdf")) return "json";
  return "pdf";
}

function safeFilename(name: string | undefined): string {
  const base = (name ?? "document").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `verification-report_${base || "document"}.pdf`;
}

interface ParsedInput {
  bytes: string;
  name: string;
  originalDocuments?: { bytes: string; name: string }[];
}

async function parseInput(req: NextRequest): Promise<ParsedInput> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") ?? form.get("document");
    if (!(file instanceof File)) {
      throw new BadRequest("No file provided. Send a multipart field named 'file'.");
    }
    if (file.size === 0) throw new BadRequest("The uploaded file is empty.");
    if (file.size > maxBytes()) throw new PayloadTooLarge();

    const originalDocuments: { bytes: string; name: string }[] = [];
    const original = form.get("originalDocument");
    if (original instanceof File && original.size > 0) {
      originalDocuments.push({
        bytes: Buffer.from(await original.arrayBuffer()).toString("base64"),
        name: original.name,
      });
    }
    return {
      bytes: Buffer.from(await file.arrayBuffer()).toString("base64"),
      name: file.name || "document",
      originalDocuments,
    };
  }

  // Raw binary body (e.g. Content-Type: application/pdf). Filename via query/header.
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    throw new BadRequest(
      "Empty request body. Send the document as raw bytes, or use multipart/form-data with a 'file' field.",
    );
  }
  if (buf.byteLength > maxBytes()) throw new PayloadTooLarge();

  const name =
    req.nextUrl.searchParams.get("filename") ||
    req.headers.get("x-filename") ||
    "document";
  return { bytes: buf.toString("base64"), name };
}

class BadRequest extends Error {}
class PayloadTooLarge extends Error {}

/**
 * Public REST endpoint: verify a signed document and return a PDF report.
 *
 *   POST /api/v1/verify?lang=de&format=pdf
 *   - multipart/form-data: field `file` (required), `originalDocument` (optional)
 *   - or raw body (application/pdf, …) with `?filename=` / `X-Filename`
 *
 * Response: application/pdf (default) or application/json (`format=json`).
 */
export async function POST(req: NextRequest) {
  // channel "api": public REST endpoint for external clients.
  const log = logger.child({ channel: "api", route: "/api/v1/verify", reqId: newRequestId() });
  const startedAt = Date.now();

  if (!isAuthorized(req)) {
    log.warn("unauthorized");
    return unauthorized();
  }

  const locale = resolveLocale(req);
  const format = resolveFormat(req);

  let input: ParsedInput;
  try {
    input = await parseInput(req);
  } catch (err) {
    if (err instanceof PayloadTooLarge) {
      log.warn("payload too large", { maxBytes: maxBytes() });
      return NextResponse.json(
        { error: `File too large. Maximum is ${process.env.MAX_UPLOAD_MB || 20} MB.` },
        { status: 413 },
      );
    }
    if (err instanceof BadRequest) {
      log.warn("bad request", { ...errFields(err) });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    log.warn("could not read body", { ...errFields(err) });
    return NextResponse.json(
      { error: "Could not read request body.", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  log.info("verify request", { document: input.name, format, lang: locale, detached: (input.originalDocuments?.length ?? 0) > 0 });

  let result;
  try {
    result = await verifyDocument(input, log);
  } catch (err) {
    if (err instanceof DssError) {
      const status = err.status && err.status >= 400 ? err.status : 502;
      log.warn("verify failed (DSS)", { status, ms: Date.now() - startedAt, ...errFields(err) });
      return NextResponse.json({ error: err.message, detail: err.detail }, { status });
    }
    log.error("verify failed (unexpected)", { ms: Date.now() - startedAt, ...errFields(err) });
    return NextResponse.json(
      { error: "Verification failed.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  log.info("verify ok", {
    document: input.name,
    indication: result.report.overallIndication,
    validSignatures: result.report.validSignaturesCount,
    totalSignatures: result.report.signaturesCount,
    format,
    ms: Date.now() - startedAt,
  });

  if (format === "json") {
    return NextResponse.json(result);
  }

  try {
    const buffer = await renderReportToBuffer(result.report, locale);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(input.name)}"`,
        "Cache-Control": "no-store",
        // Expose the headline result so API clients can branch without parsing the PDF.
        "X-Verification-Indication": result.report.overallIndication,
        "X-Valid-Signatures": String(result.report.validSignaturesCount),
        "X-Total-Signatures": String(result.report.signaturesCount),
      },
    });
  } catch (err) {
    log.error("pdf render failed", { document: input.name, ms: Date.now() - startedAt, ...errFields(err) });
    return NextResponse.json(
      { error: "Failed to render PDF report.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to submit a document. See /docs for the API documentation." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
