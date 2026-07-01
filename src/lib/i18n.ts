export type Locale = "de" | "en";

export const LOCALES: Locale[] = ["de", "en"];
export const DEFAULT_LOCALE: Locale = "de";

/**
 * Flat translation dictionary. Keys are shared by UI and PDF so both stay in
 * sync. Keep values free of markup.
 */
export const messages = {
  de: {
    "app.title": "miPDFValidator",
    "app.subtitle": "Elektronische Signaturen prüfen — auf Basis von eIDAS / ETSI DSS",
    "upload.headline": "Dokument zur Signaturprüfung hochladen",
    "upload.dnd": "Datei hierher ziehen oder klicken zum Auswählen",
    "upload.hint": "PAdES (PDF), XAdES (XML), CAdES (.p7m/.p7s) und ASiC-Container werden unterstützt",
    "upload.button": "Dokument auswählen",
    "upload.selected": "Ausgewählt",
    "upload.verify": "Signatur prüfen",
    "upload.verifying": "Prüfung läuft …",
    "upload.reset": "Zurücksetzen",
    "upload.tooLarge": "Datei ist zu groß (max. {mb} MB).",

    "result.title": "Verifikationsergebnis",
    "result.document": "Dokument",
    "result.validationTime": "Prüfzeitpunkt",
    "result.policy": "Validierungsrichtlinie",
    "result.signatures": "Signaturen",
    "result.valid": "gültig",
    "result.overall": "Gesamtergebnis",
    "result.downloadPdf": "PDF-Report herunterladen",
    "result.downloadRaw": "DSS-Rohdaten (JSON)",
    "result.newCheck": "Neue Prüfung",
    "result.noRevocation": "Keine Sperrinformationen (OCSP/CRL) im Report enthalten.",

    "sig.signature": "Signatur",
    "sig.timestamp": "Zeitstempel",
    "sig.evidenceRecord": "Evidence Record",
    "sig.format": "Format",
    "sig.signedBy": "Signiert von",
    "sig.signingTime": "Signaturzeitpunkt",
    "sig.bestSignatureTime": "Bester Signaturzeitpunkt",
    "sig.level": "Qualifikation",
    "sig.indication": "Indikation",
    "sig.subIndication": "Sub-Indikation",
    "sig.certChain": "Zertifikatskette",
    "sig.scope": "Signaturumfang",
    "sig.timestamps": "Zeitstempel",
    "sig.errors": "Fehler",
    "sig.warnings": "Warnungen",
    "sig.infos": "Hinweise",

    "sig.section.pdf": "Signatureigenschaften (PDF)",
    "sig.section.crypto": "Kryptografie",
    "sig.section.cert": "Signaturzertifikat",
    "sig.reason": "Grund",
    "sig.location": "Ort",
    "sig.contact": "Kontakt",
    "sig.fieldName": "Signaturfeld",
    "sig.pdfSignerName": "Name (PDF-Feld)",
    "sig.filter": "Signatur-Handler",
    "sig.subFilter": "PAdES-Typ",
    "sig.algorithm": "Algorithmus",
    "sig.keyLength": "Schlüssellänge",
    "sig.integrity": "Integrität",
    "sig.intactValid": "unversehrt & gültig",
    "sig.broken": "ungültig / manipuliert",
    "sig.issuer": "Aussteller",
    "sig.serial": "Seriennummer",
    "sig.validFrom": "Gültig ab",
    "sig.validTo": "Gültig bis",
    "sig.country": "Land",

    "ts.type": "Typ",
    "ts.digest": "Hash-Algorithmus",
    "ts.tsa": "Zeitstempeldienst (TSA)",
    "ts.time": "Zeitpunkt",

    "rev.title": "Sperrprüfung (OCSP / CRL)",
    "rev.type": "Typ",
    "rev.forCert": "Zertifikat",
    "rev.status": "Status",
    "rev.production": "Erstellt am",
    "rev.thisUpdate": "This Update",
    "rev.nextUpdate": "Next Update",
    "rev.origin": "Herkunft",

    "error.title": "Prüfung fehlgeschlagen",

    "report.heading": "Signatur-Validationsreport",
    "report.generated": "Erstellt am",
    "report.page": "Seite",
    "report.of": "von",
    "report.footer": "Erstellt mit miPDFValidator · basierend auf ETSI DSS",
    "report.summary": "Zusammenfassung",
    "report.details": "Signaturdetails",

    "indication.TOTAL_PASSED": "Bestanden",
    "indication.PASSED": "Bestanden",
    "indication.INDETERMINATE": "Unbestimmt",
    "indication.TOTAL_FAILED": "Nicht bestanden",
    "indication.FAILED": "Nicht bestanden",
    "indication.NO_SIGNATURE_FOUND": "Keine Signatur gefunden",
  },
  en: {
    "app.title": "miPDFValidator",
    "app.subtitle": "Validate electronic signatures — powered by eIDAS / ETSI DSS",
    "upload.headline": "Upload a document for signature validation",
    "upload.dnd": "Drag a file here or click to select",
    "upload.hint": "PAdES (PDF), XAdES (XML), CAdES (.p7m/.p7s) and ASiC containers are supported",
    "upload.button": "Select document",
    "upload.selected": "Selected",
    "upload.verify": "Verify signature",
    "upload.verifying": "Verifying …",
    "upload.reset": "Reset",
    "upload.tooLarge": "File is too large (max {mb} MB).",

    "result.title": "Verification result",
    "result.document": "Document",
    "result.validationTime": "Validation time",
    "result.policy": "Validation policy",
    "result.signatures": "Signatures",
    "result.valid": "valid",
    "result.overall": "Overall result",
    "result.downloadPdf": "Download PDF report",
    "result.downloadRaw": "DSS raw data (JSON)",
    "result.newCheck": "New check",
    "result.noRevocation": "No revocation data (OCSP/CRL) contained in the report.",

    "sig.signature": "Signature",
    "sig.timestamp": "Timestamp",
    "sig.evidenceRecord": "Evidence record",
    "sig.format": "Format",
    "sig.signedBy": "Signed by",
    "sig.signingTime": "Signing time",
    "sig.bestSignatureTime": "Best signature time",
    "sig.level": "Qualification",
    "sig.indication": "Indication",
    "sig.subIndication": "Sub indication",
    "sig.certChain": "Certificate chain",
    "sig.scope": "Signature scope",
    "sig.timestamps": "Timestamps",
    "sig.errors": "Errors",
    "sig.warnings": "Warnings",
    "sig.infos": "Notes",

    "sig.section.pdf": "Signature properties (PDF)",
    "sig.section.crypto": "Cryptography",
    "sig.section.cert": "Signing certificate",
    "sig.reason": "Reason",
    "sig.location": "Location",
    "sig.contact": "Contact",
    "sig.fieldName": "Signature field",
    "sig.pdfSignerName": "Name (PDF field)",
    "sig.filter": "Signature handler",
    "sig.subFilter": "PAdES type",
    "sig.algorithm": "Algorithm",
    "sig.keyLength": "Key length",
    "sig.integrity": "Integrity",
    "sig.intactValid": "intact & valid",
    "sig.broken": "invalid / tampered",
    "sig.issuer": "Issuer",
    "sig.serial": "Serial number",
    "sig.validFrom": "Valid from",
    "sig.validTo": "Valid until",
    "sig.country": "Country",

    "ts.type": "Type",
    "ts.digest": "Hash algorithm",
    "ts.tsa": "Time stamping authority (TSA)",
    "ts.time": "Time",

    "rev.title": "Revocation checks (OCSP / CRL)",
    "rev.type": "Type",
    "rev.forCert": "Certificate",
    "rev.status": "Status",
    "rev.production": "Produced at",
    "rev.thisUpdate": "This update",
    "rev.nextUpdate": "Next update",
    "rev.origin": "Origin",

    "error.title": "Verification failed",

    "report.heading": "Signature Validation Report",
    "report.generated": "Generated at",
    "report.page": "Page",
    "report.of": "of",
    "report.footer": "Generated with miPDFValidator · based on ETSI DSS",
    "report.summary": "Summary",
    "report.details": "Signature details",

    "indication.TOTAL_PASSED": "Passed",
    "indication.PASSED": "Passed",
    "indication.INDETERMINATE": "Indeterminate",
    "indication.TOTAL_FAILED": "Failed",
    "indication.FAILED": "Failed",
    "indication.NO_SIGNATURE_FOUND": "No signature found",
  },
} as const;

export type MessageKey = keyof (typeof messages)["de"];

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];
  let value: string = (dict as Record<string, string>)[key] ?? (messages[DEFAULT_LOCALE] as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return value;
}

/**
 * Turn a cryptic PDF signature sub-filter into a human-readable description.
 * Returns the raw value when unknown.
 */
export function describeSubFilter(locale: Locale, subFilter: string | undefined): string | undefined {
  if (!subFilter) return undefined;
  const map: Record<string, { de: string; en: string }> = {
    "ETSI.CAdES.detached": {
      de: "CAdES-basiert (ETSI) – aktueller PAdES-Standard",
      en: "CAdES-based (ETSI) – current PAdES standard",
    },
    "ETSI.RFC3161": {
      de: "Dokument-Zeitstempel (RFC 3161)",
      en: "Document timestamp (RFC 3161)",
    },
    "adbe.pkcs7.detached": {
      de: "Adobe PKCS#7, separat (klassisch)",
      en: "Adobe PKCS#7, detached (legacy)",
    },
    "adbe.pkcs7.sha1": {
      de: "Adobe PKCS#7 mit SHA-1 (veraltet)",
      en: "Adobe PKCS#7 with SHA-1 (deprecated)",
    },
    "adbe.x509.rsa_sha1": {
      de: "Adobe X.509 RSA mit SHA-1 (veraltet)",
      en: "Adobe X.509 RSA with SHA-1 (deprecated)",
    },
  };
  const hit = map[subFilter];
  return hit ? hit[locale] : subFilter;
}

/** Translate a DSS indication string to a localized label (falls back to the raw value). */
export function translateIndication(locale: Locale, indication: string | undefined): string {
  if (!indication) return "—";
  const key = `indication.${indication}` as MessageKey;
  const dict = messages[locale] as Record<string, string>;
  return dict[key] ?? indication;
}
