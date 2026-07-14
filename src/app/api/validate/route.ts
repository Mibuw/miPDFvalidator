import { NextRequest, NextResponse } from "next/server";
import { DssError } from "@/lib/dss";
import { verifyDocument } from "@/lib/verify";
import { logger, newRequestId, errFields } from "@/lib/logger";
import { recordValidation } from "@/lib/stats";

// The DSS client uses Node core (Buffer, fetch abort) — force the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maxBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 20;
  return mb * 1024 * 1024;
}

export async function POST(req: NextRequest) {
  // channel "web": this route backs the browser UI (not the public REST API).
  // Authenticated by middleware (Basic auth); the user is forwarded here.
  const user = req.headers.get("x-auth-user") || "anonymous";
  const log = logger.child({ channel: "web", route: "/api/validate", reqId: newRequestId(), user });
  const startedAt = Date.now();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    log.warn("invalid multipart request");
    return NextResponse.json({ error: "Invalid multipart/form-data request." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    log.warn("no file provided");
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size === 0) {
    log.warn("empty file", { document: file.name });
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }
  if (file.size > maxBytes()) {
    log.warn("file too large", { document: file.name, size: file.size, maxBytes: maxBytes() });
    return NextResponse.json(
      { error: `File too large. Maximum is ${process.env.MAX_UPLOAD_MB || 20} MB.` },
      { status: 413 },
    );
  }

  log.info("validate request", { document: file.name, size: file.size });

  // Optional original document for detached signatures.
  const original = form.get("originalDocument");

  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer).toString("base64");

  const originalDocuments: { bytes: string; name: string }[] = [];
  if (original instanceof File && original.size > 0) {
    const ob = Buffer.from(await original.arrayBuffer()).toString("base64");
    originalDocuments.push({ bytes: ob, name: original.name });
  }

  try {
    const payload = await verifyDocument(
      {
        bytes,
        name: file.name || "document",
        originalDocuments: originalDocuments.length ? originalDocuments : undefined,
      },
      log,
    );
    log.info("validate ok", {
      document: file.name,
      indication: payload.report.overallIndication,
      validSignatures: payload.report.validSignaturesCount,
      totalSignatures: payload.report.signaturesCount,
      ms: Date.now() - startedAt,
    });
    await recordValidation({
      user,
      route: "/api/validate",
      indication: payload.report.overallIndication,
      valid: payload.report.validSignaturesCount,
      total: payload.report.signaturesCount,
    });
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof DssError) {
      const status = err.status && err.status >= 400 ? err.status : 502;
      log.warn("validate failed (DSS)", { status, ms: Date.now() - startedAt, ...errFields(err) });
      return NextResponse.json({ error: err.message, detail: err.detail }, { status });
    }
    log.error("validate failed (unexpected)", { ms: Date.now() - startedAt, ...errFields(err) });
    return NextResponse.json(
      { error: "Unexpected error during validation.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
