/**
 * Normalized domain model consumed by the UI and the PDF report.
 *
 * DSS returns its reports as JSON derived from JAXB-annotated classes. The exact
 * key casing (PascalCase vs camelCase) depends on the DSS version and the JSON
 * provider configured in the webapp. To stay resilient we never consume the raw
 * DSS JSON directly in the UI — everything goes through `normalizeReports`
 * (see normalize.ts), which produces the shapes below.
 */

export type Indication =
  | "TOTAL_PASSED"
  | "PASSED"
  | "INDETERMINATE"
  | "TOTAL_FAILED"
  | "FAILED"
  | "NO_SIGNATURE_FOUND"
  | (string & {});

export type TokenKind = "signature" | "timestamp" | "evidenceRecord";

export interface NormalizedCertificate {
  id?: string;
  qualifiedName?: string;
  trusted?: boolean;
}

export interface NormalizedScope {
  name?: string;
  scope?: string;
  value?: string;
}

export interface NormalizedInnerTimestamp {
  id?: string;
  type?: string;
  productionTime?: string;
  indication?: Indication;
  subIndication?: string;
  /** Digest algorithm of the timestamped message imprint, e.g. "SHA256". */
  digestAlgorithm?: string;
  /** Readable name of the Time Stamping Authority (TSA) that issued it. */
  producedBy?: string;
}

/** Contents of the PDF signature dictionary (PAdES-specific). */
export interface NormalizedPdfInfo {
  /** Reason the document was signed, e.g. "QES via ID-Austria". */
  reason?: string;
  /** Signing location, e.g. "Vienna". */
  location?: string;
  contactInfo?: string;
  /** Name as stored in the PDF signature dictionary. */
  signerName?: string;
  /** Name of the PDF signature form field. */
  fieldName?: string;
  /** Signature handler / creator, e.g. "Adobe.PPKLite". */
  filter?: string;
  /** PAdES sub-filter identifying the concrete signature encoding,
   *  e.g. "ETSI.CAdES.detached" or "adbe.pkcs7.detached". */
  subFilter?: string;
}

/** Cryptographic properties of the signature value. */
export interface NormalizedCrypto {
  encryptionAlgorithm?: string;
  digestAlgorithm?: string;
  keyLength?: string;
  maskGenerationFunction?: string;
  signatureIntact?: boolean;
  signatureValid?: boolean;
}

/** Key details of the signing certificate. */
export interface NormalizedSignerCertificate {
  commonName?: string;
  issuer?: string;
  serialNumber?: string;
  notBefore?: string;
  notAfter?: string;
  country?: string;
}

export interface NormalizedToken {
  kind: TokenKind;
  id: string;
  filename?: string;
  /** e.g. "PAdES-BASELINE-LT", "XAdES-BASELINE-B" */
  format?: string;
  indication: Indication;
  subIndication?: string;
  signingTime?: string;
  bestSignatureTime?: string;
  productionTime?: string;
  signedBy?: string;
  /** Qualification, e.g. "QESig", "AdESig", "NA" */
  signatureLevel?: string;
  signatureLevelDescription?: string;
  errors: string[];
  warnings: string[];
  infos: string[];
  certificateChain: NormalizedCertificate[];
  scopes: NormalizedScope[];
  timestamps: NormalizedInnerTimestamp[];
  /** PAdES PDF signature dictionary details (enriched from DiagnosticData). */
  pdf?: NormalizedPdfInfo;
  /** Cryptographic algorithm details (enriched from DiagnosticData). */
  crypto?: NormalizedCrypto;
  /** Signing certificate details (enriched from DiagnosticData). */
  signerCertificate?: NormalizedSignerCertificate;
}

export type RevocationKind = "OCSP" | "CRL" | (string & {});

export interface NormalizedRevocation {
  id?: string;
  kind: RevocationKind;
  origin?: string;
  productionDate?: string;
  thisUpdate?: string;
  nextUpdate?: string;
  /** Status of the checked certificate: e.g. "GOOD", "REVOKED", "UNKNOWN" */
  status?: string;
  revocationReason?: string;
  /** Human-readable name of the certificate this revocation refers to. */
  forCertificate?: string;
}

export interface NormalizedReport {
  documentName?: string;
  validationTime?: string;
  signaturesCount: number;
  validSignaturesCount: number;
  containerType?: string;
  policyName?: string;
  policyDescription?: string;
  tokens: NormalizedToken[];
  /** OCSP/CRL details extracted from the DiagnosticData. */
  revocations: NormalizedRevocation[];
  /** Overall roll-up indication for the whole document. */
  overallIndication: Indication;
}

/** Raw DSS `WSReportsDTO` — kept as `unknown`-ish maps for defensive access. */
export interface DssRawReports {
  SimpleReport?: unknown;
  DetailedReport?: unknown;
  DiagnosticData?: unknown;
  ValidationReport?: unknown;
  // camelCase fallbacks
  simpleReport?: unknown;
  detailedReport?: unknown;
  diagnosticData?: unknown;
  validationReport?: unknown;
  [key: string]: unknown;
}

/** Payload returned by our /api/validate route to the client. */
export interface ValidationResponse {
  report: NormalizedReport;
  /** Raw DSS reports, forwarded so the user can download/inspect the originals. */
  raw: DssRawReports;
}
