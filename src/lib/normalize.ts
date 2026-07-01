import type {
  DssRawReports,
  Indication,
  NormalizedCertificate,
  NormalizedInnerTimestamp,
  NormalizedReport,
  NormalizedRevocation,
  NormalizedScope,
  NormalizedToken,
  TokenKind,
} from "./types";

/**
 * Defensive, case-insensitive access helpers.
 *
 * DSS JSON key casing differs between versions/serializers. Instead of hard
 * coding one convention we look up keys case-insensitively and accept the first
 * of several candidate names.
 */

type AnyObj = Record<string, unknown>;

function isObj(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Case-insensitive single-key read from an object. */
function ci(obj: unknown, ...keys: string[]): unknown {
  if (!isObj(obj)) return undefined;
  const lowerMap: Record<string, string> = {};
  for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = k;
  for (const key of keys) {
    const real = lowerMap[key.toLowerCase()];
    if (real !== undefined) return obj[real];
  }
  return undefined;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // DSS sometimes wraps enum values as { value, description } or { $ }
  if (isObj(v)) {
    const inner = ci(v, "value", "$", "content", "name");
    if (inner !== undefined) return asString(inner);
  }
  return undefined;
}

function asNumber(v: unknown, fallback = 0): number {
  const s = asString(v);
  if (s === undefined) return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/** Always return an array, whether DSS gave us one, none, or a single object. */
function asArray(v: unknown): unknown[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Collect string messages from DSS message arrays that may be strings or {value,key}. */
function messages(v: unknown): string[] {
  return asArray(v)
    .map((m) => {
      if (typeof m === "string") return m;
      return asString(ci(m, "value", "Value", "content", "message", "Message"));
    })
    .filter((s): s is string => !!s && s.trim().length > 0);
}

/** Pretty-print a DSS signature format token, e.g. PAdES_BASELINE_LT -> PAdES-BASELINE-LT. */
function prettyFormat(v: unknown): string | undefined {
  const s = asString(v);
  return s ? s.replace(/_/g, "-") : undefined;
}

function normalizeCertificateChain(v: unknown): NormalizedCertificate[] {
  const chain = ci(v, "certificate", "Certificate");
  return asArray(chain).map((c) => ({
    id: asString(ci(c, "id", "Id")),
    qualifiedName: asString(ci(c, "qualifiedName", "QualifiedName")),
    trusted: asString(ci(c, "trusted", "Trusted")) === "true",
  }));
}

function normalizeScopes(v: unknown): NormalizedScope[] {
  const scope = ci(v, "signatureScope", "SignatureScope");
  return asArray(scope).map((s) => ({
    name: asString(ci(s, "name", "Name")),
    scope: asString(ci(s, "scope", "Scope")),
    value: asString(ci(s, "value", "Value")),
  }));
}

function normalizeInnerTimestamps(v: unknown): NormalizedInnerTimestamp[] {
  // In the SimpleReport a signature carries a `Timestamps`/`Timestamp` list.
  const holder = ci(v, "timestamps", "Timestamps");
  const list = holder !== undefined ? ci(holder, "timestamp", "Timestamp") ?? holder : ci(v, "timestamp", "Timestamp");
  return asArray(list).map((t) => ({
    id: asString(ci(t, "id", "Id")),
    type: asString(ci(t, "type", "Type", "timestampType", "TimestampType")),
    productionTime: asString(ci(t, "productionTime", "ProductionTime")),
    indication: asString(ci(t, "indication", "Indication")) as Indication,
    subIndication: asString(ci(t, "subIndication", "SubIndication")),
  }));
}

function normalizeToken(kind: TokenKind, node: unknown, index: number): NormalizedToken {
  return {
    kind,
    id: asString(ci(node, "id", "Id")) ?? `${kind}-${index + 1}`,
    filename: asString(ci(node, "filename", "Filename")),
    format: prettyFormat(ci(node, "signatureFormat", "SignatureFormat")),
    indication: (asString(ci(node, "indication", "Indication")) as Indication) ?? "INDETERMINATE",
    subIndication: asString(ci(node, "subIndication", "SubIndication")),
    signingTime: asString(ci(node, "signingTime", "SigningTime")),
    bestSignatureTime: asString(ci(node, "bestSignatureTime", "BestSignatureTime")),
    productionTime: asString(ci(node, "productionTime", "ProductionTime")),
    signedBy: asString(ci(node, "signedBy", "SignedBy")),
    signatureLevel: asString(ci(node, "signatureLevel", "SignatureLevel")),
    signatureLevelDescription: asString(
      isObj(ci(node, "signatureLevel", "SignatureLevel"))
        ? ci(ci(node, "signatureLevel", "SignatureLevel"), "description", "Description")
        : undefined,
    ),
    errors: messages(ci(node, "errors", "Errors", "error", "Error")),
    warnings: messages(ci(node, "warnings", "Warnings", "warning", "Warning")),
    infos: messages(ci(node, "infos", "Infos", "info", "Info")),
    certificateChain: normalizeCertificateChain(ci(node, "certificateChain", "CertificateChain")),
    scopes: normalizeScopes(node),
    timestamps: normalizeInnerTimestamps(node),
  };
}

/** Build an id -> node index (case-insensitive id lookup). */
function indexById(nodes: unknown[]): Record<string, unknown> {
  const idx: Record<string, unknown> = {};
  for (const n of nodes) {
    const id = asString(ci(n, "id", "Id"));
    if (id) idx[id] = n;
  }
  return idx;
}

function boolOf(v: unknown): boolean | undefined {
  const s = asString(v);
  if (s === undefined) return undefined;
  return s === "true";
}

/** DSS DistinguishedName fields are arrays of { value, Format }; take the first value. */
function dnString(v: unknown): string | undefined {
  for (const e of asArray(v)) {
    const s = typeof e === "string" ? e : asString(ci(e, "value", "Value"));
    if (s) return s;
  }
  return undefined;
}

/** Extract the CN component of a distinguished name string. */
function commonNameOf(dn: string | undefined): string | undefined {
  if (!dn) return undefined;
  const m = /(?:^|,)\s*cn=([^,]+)/i.exec(dn);
  return m ? m[1].trim() : dn;
}

function digestMethodOf(node: unknown): string | undefined {
  const dm = asArray(ci(node, "digestMatcher", "DigestMatcher"))[0];
  return asString(ci(dm, "digestMethod", "DigestMethod"));
}

/** Resolve a DSS certificate reference ({Certificate: id} | {id}) to a readable name. */
function resolveCertName(ref: unknown, certById: Record<string, unknown>): string | undefined {
  const id = asString(ci(ref, "certificate", "Certificate", "id", "Id"));
  if (!id) return undefined;
  const c = certById[id];
  return c ? certName(c) : id;
}

/**
 * Enrich a signature token with details that only exist in the DiagnosticData:
 * PDF signature dictionary (reason/location/subfilter/…), crypto algorithms and
 * the signing certificate. The DiagnosticData `Signature.Id` matches the
 * SimpleReport token id.
 */
function enrichSignatureFromDiagnostic(
  token: NormalizedToken,
  dd: unknown,
  certById: Record<string, unknown>,
): void {
  const pdfRev = ci(dd, "pdfRevision", "PDFRevision");
  const dict = ci(pdfRev, "pdfSignatureDictionary", "PDFSignatureDictionary");
  const field = asArray(ci(pdfRev, "signatureField", "SignatureField"))[0];
  if (dict || field) {
    token.pdf = {
      reason: asString(ci(dict, "reason", "Reason")),
      location: asString(ci(dict, "location", "Location")),
      contactInfo: asString(ci(dict, "contactInfo", "ContactInfo")),
      signerName: asString(ci(dict, "signerName", "SignerName")),
      fieldName: asString(ci(field, "name", "Name")),
      filter: asString(ci(dict, "filter", "Filter")),
      subFilter: asString(ci(dict, "subFilter", "SubFilter")),
    };
  }

  const bs = ci(dd, "basicSignature", "BasicSignature");
  if (bs) {
    token.crypto = {
      encryptionAlgorithm: asString(
        ci(bs, "encryptionAlgoUsedToSignThisToken", "EncryptionAlgoUsedToSignThisToken"),
      ),
      digestAlgorithm: asString(ci(bs, "digestAlgoUsedToSignThisToken", "DigestAlgoUsedToSignThisToken")),
      keyLength: asString(ci(bs, "keyLengthUsedToSignThisToken", "KeyLengthUsedToSignThisToken")),
      maskGenerationFunction: asString(
        ci(bs, "maskGenerationFunctionUsedToSignThisToken", "MaskGenerationFunctionUsedToSignThisToken"),
      ),
      signatureIntact: boolOf(ci(bs, "signatureIntact", "SignatureIntact")),
      signatureValid: boolOf(ci(bs, "signatureValid", "SignatureValid")),
    };
  }

  const scId = asString(ci(ci(dd, "signingCertificate", "SigningCertificate"), "certificate", "Certificate", "id", "Id"));
  const sc = scId ? certById[scId] : undefined;
  if (sc) {
    token.signerCertificate = {
      commonName: asString(ci(sc, "commonName", "CommonName")),
      issuer: commonNameOf(dnString(ci(sc, "issuerDistinguishedName", "IssuerDistinguishedName"))),
      serialNumber: asString(ci(sc, "serialNumber", "SerialNumber")),
      notBefore: asString(ci(sc, "notBefore", "NotBefore")),
      notAfter: asString(ci(sc, "notAfter", "NotAfter")),
      country: asString(ci(sc, "countryName", "CountryName")),
    };
  }
}

/**
 * Apply DiagnosticData enrichment to all tokens: signature-level details plus
 * per-timestamp digest algorithm and issuing TSA name.
 */
function enrichTokens(tokens: NormalizedToken[], diagnosticData: unknown): void {
  const ddSignatures = indexById(asArray(ci(diagnosticData, "signature", "Signature")));
  const ddTimestamps = indexById(asArray(ci(diagnosticData, "timestamp", "Timestamp")));
  const certById = indexById(asArray(ci(diagnosticData, "certificate", "Certificate")));

  for (const token of tokens) {
    if (token.kind === "signature") {
      const dd = ddSignatures[token.id];
      if (dd) enrichSignatureFromDiagnostic(token, dd, certById);
    }
    for (const its of token.timestamps) {
      const tdd = its.id ? ddTimestamps[its.id] : undefined;
      if (tdd) {
        its.digestAlgorithm = digestMethodOf(tdd);
        its.producedBy = resolveCertName(ci(tdd, "signingCertificate", "SigningCertificate"), certById);
      }
    }
  }
}

/**
 * The SimpleReport holds a heterogeneous list under a long property name
 * (`signatureOrTimestampOrEvidenceRecord` in recent DSS). Each entry is a
 * single-key wrapper: { Signature: {...} } / { Timestamp: {...} } / ...
 */
function extractTokens(simpleReport: unknown): NormalizedToken[] {
  const listCandidates = [
    ci(simpleReport, "signatureOrTimestampOrEvidenceRecord"),
    ci(simpleReport, "signatureOrTimestamp"),
    ci(simpleReport, "signatures"),
    ci(simpleReport, "Signature"),
  ].find((v) => v !== undefined);

  const tokens: NormalizedToken[] = [];
  asArray(listCandidates).forEach((entry, index) => {
    // Entry may be a wrapper {Signature: {...}} or the token object itself.
    const sig = ci(entry, "signature", "Signature");
    const ts = ci(entry, "timestamp", "Timestamp");
    const er = ci(entry, "evidenceRecord", "EvidenceRecord");
    if (isObj(sig)) tokens.push(normalizeToken("signature", sig, index));
    else if (isObj(ts)) tokens.push(normalizeToken("timestamp", ts, index));
    else if (isObj(er)) tokens.push(normalizeToken("evidenceRecord", er, index));
    else if (isObj(entry)) tokens.push(normalizeToken("signature", entry, index));
  });
  return tokens;
}

function certName(cert: unknown): string | undefined {
  return (
    asString(ci(cert, "commonName", "CommonName")) ??
    asString(ci(cert, "readableCertificateName", "ReadableCertificateName")) ??
    asString(ci(cert, "subjectDistinguishedName", "SubjectDistinguishedName")) ??
    asString(ci(cert, "id", "Id"))
  );
}

/** Details of a single revocation token (independent of any certificate). */
function revocationTokenDetails(r: unknown): Omit<NormalizedRevocation, "status" | "forCertificate"> {
  return {
    id: asString(ci(r, "id", "Id")),
    kind: (asString(ci(r, "revocationType", "RevocationType", "type", "Type")) ?? "").toUpperCase() as
      | "OCSP"
      | "CRL",
    origin: asString(ci(r, "origin", "Origin", "source", "Source", "sourceAddress", "SourceAddress")),
    productionDate: asString(ci(r, "productionDate", "ProductionDate")),
    thisUpdate: asString(ci(r, "thisUpdate", "ThisUpdate")),
    nextUpdate: asString(ci(r, "nextUpdate", "NextUpdate")),
    revocationReason: asString(ci(r, "reason", "Reason", "revocationReason", "RevocationReason")),
  };
}

/**
 * Extract OCSP/CRL revocation details from the DiagnosticData.
 *
 * Confirmed against DSS 6.4 REST output: revocation tokens live under
 * `Revocation` and certificates under `Certificate`. The per-certificate status
 * (GOOD/REVOKED/UNKNOWN) lives on each certificate's `CertificateRevocation`
 * linkage, which references a revocation token by id. We therefore:
 *   1. index revocation tokens by id,
 *   2. walk each certificate's `Revocations` to pair a token with the status
 *      of that specific certificate,
 *   3. fall back to listing the raw revocation tokens if no linkage exists.
 */
function extractRevocations(diagnosticData: unknown): NormalizedRevocation[] {
  const revTokens = asArray(
    ci(diagnosticData, "usedRevocations", "UsedRevocations", "Revocation", "revocations", "Revocations"),
  );
  const certs = asArray(
    ci(diagnosticData, "usedCertificates", "UsedCertificates", "Certificate", "certificates", "Certificates"),
  );

  const revIndex: Record<string, ReturnType<typeof revocationTokenDetails>> = {};
  for (const r of revTokens) {
    const details = revocationTokenDetails(r);
    if (details.id) revIndex[details.id] = details;
  }

  const results: NormalizedRevocation[] = [];

  // 1) Preferred: per-certificate revocation status linkage. In DSS 6.4 this is
  //    each certificate's `CertificateRevocation` (Status + Revocation id ref).
  for (const cert of certs) {
    const name = certName(cert);
    for (const cr of asArray(
      ci(cert, "certificateRevocation", "CertificateRevocation", "revocations", "Revocations"),
    )) {
      const revRef = ci(cr, "revocation", "Revocation");
      const revId =
        typeof revRef === "string" ? revRef : asString(ci(revRef, "certificate", "Certificate", "id", "Id")) ?? asString(revRef);
      const base = revId ? revIndex[revId] : undefined;
      results.push({
        ...(base ?? { kind: (asString(ci(cr, "type", "Type")) ?? "").toUpperCase() as "OCSP" | "CRL" }),
        id: revId ?? base?.id,
        status: asString(ci(cr, "status", "Status")),
        revocationReason:
          asString(ci(cr, "reason", "Reason", "revocationReason", "RevocationReason")) ?? base?.revocationReason,
        forCertificate: name,
      });
    }
  }

  // 2) Fallback: no certificate linkage — list the revocation tokens directly.
  if (results.length === 0) {
    // Map signing-certificate ids to names so we can label the tokens.
    const certIndex: Record<string, string> = {};
    for (const cert of certs) {
      const id = asString(ci(cert, "id", "Id"));
      const name = certName(cert);
      if (id && name) certIndex[id] = name;
    }
    for (const r of revTokens) {
      const forId = asString(
        ci(ci(r, "signingCertificate", "SigningCertificate"), "certificate", "Certificate", "id", "Id"),
      );
      results.push({
        ...revocationTokenDetails(r),
        status: asString(ci(r, "status", "Status")),
        forCertificate: forId ? certIndex[forId] ?? forId : undefined,
      });
    }
  }

  return results;
}

/** Roll up an overall indication for the whole document. */
function rollUp(tokens: NormalizedToken[], validCount: number, sigCount: number): Indication {
  const sigTokens = tokens.filter((t) => t.kind === "signature");
  if (sigTokens.length === 0 && sigCount === 0) return "NO_SIGNATURE_FOUND";
  if (sigTokens.some((t) => /FAILED/i.test(t.indication))) return "TOTAL_FAILED";
  if (validCount > 0 && validCount === (sigCount || sigTokens.length)) return "TOTAL_PASSED";
  if (sigTokens.every((t) => /PASSED/i.test(t.indication)) && sigTokens.length > 0) return "TOTAL_PASSED";
  return "INDETERMINATE";
}

export function normalizeReports(raw: DssRawReports): NormalizedReport {
  const simpleReport = raw.SimpleReport ?? raw.simpleReport ?? {};
  const diagnosticData = raw.DiagnosticData ?? raw.diagnosticData ?? {};

  const tokens = extractTokens(simpleReport);
  enrichTokens(tokens, diagnosticData);
  const revocations = extractRevocations(diagnosticData);

  const signaturesCount = asNumber(
    ci(simpleReport, "signaturesCount", "SignaturesCount"),
    tokens.filter((t) => t.kind === "signature").length,
  );
  const validSignaturesCount = asNumber(
    ci(simpleReport, "validSignaturesCount", "ValidSignaturesCount"),
    tokens.filter((t) => t.kind === "signature" && /PASSED/i.test(t.indication)).length,
  );

  const policy = ci(simpleReport, "validationPolicy", "ValidationPolicy", "policy", "Policy");

  return {
    documentName: asString(ci(simpleReport, "documentName", "DocumentName")),
    validationTime: asString(ci(simpleReport, "validationTime", "ValidationTime")),
    signaturesCount,
    validSignaturesCount,
    containerType: asString(ci(simpleReport, "containerType", "ContainerType")),
    policyName: asString(ci(policy, "policyName", "PolicyName", "name", "Name")),
    policyDescription: asString(ci(policy, "policyDescription", "PolicyDescription", "description", "Description")),
    tokens,
    revocations,
    overallIndication: rollUp(tokens, validSignaturesCount, signaturesCount),
  };
}
