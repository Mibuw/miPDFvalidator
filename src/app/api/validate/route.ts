import { NextRequest, NextResponse } from "next/server";
import { DssError } from "@/lib/dss";
import { verifyDocument } from "@/lib/verify";

// The DSS client uses Node core (Buffer, fetch abort) — force the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maxBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB) || 20;
  return mb * 1024 * 1024;
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart/form-data request." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }
  if (file.size > maxBytes()) {
    return NextResponse.json(
      { error: `File too large. Maximum is ${process.env.MAX_UPLOAD_MB || 20} MB.` },
      { status: 413 },
    );
  }

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
    const payload = await verifyDocument({
      bytes,
      name: file.name || "document",
      originalDocuments: originalDocuments.length ? originalDocuments : undefined,
    });
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof DssError) {
      return NextResponse.json(
        { error: err.message, detail: err.detail },
        { status: err.status && err.status >= 400 ? err.status : 502 },
      );
    }
    return NextResponse.json(
      { error: "Unexpected error during validation.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
