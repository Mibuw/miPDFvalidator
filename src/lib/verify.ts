import { validateSignature } from "./dss";
import { normalizeReports } from "./normalize";
import type { ValidationResponse } from "./types";

export interface VerifyInput {
  /** base64-encoded document bytes */
  bytes: string;
  name: string;
  /** Optional original document(s) for detached signatures (base64). */
  originalDocuments?: { bytes: string; name: string }[];
}

/**
 * Verify a document against the DSS backend and return the normalized report
 * together with the raw DSS reports. Shared by the web UI route
 * (`/api/validate`) and the public REST endpoint (`/api/v1/verify`).
 */
export async function verifyDocument(input: VerifyInput): Promise<ValidationResponse> {
  const raw = await validateSignature({
    signedDocument: { bytes: input.bytes, name: input.name || "document" },
    originalDocuments: input.originalDocuments?.length ? input.originalDocuments : undefined,
    // EXTRACT_ALL so DiagnosticData carries OCSP/CRL, timestamps and certificates.
    tokenExtractionStrategy: "EXTRACT_ALL",
  });
  const report = normalizeReports(raw);
  return { report, raw };
}
