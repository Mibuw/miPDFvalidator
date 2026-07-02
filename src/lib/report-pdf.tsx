/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { NormalizedReport, NormalizedToken } from "./types";
import { STATUS_HEX, formatDate, statusOf } from "./status";
import { describeSubFilter, translate, translateIndication, type Locale } from "./i18n";

const COLORS = {
  ink: "#0b1120",
  muted: "#475569",
  line: "#e2e8f0",
  panel: "#f8fafc",
  brand: "#1d4ed8",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 9.5,
    color: COLORS.ink,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand,
    paddingBottom: 10,
    marginBottom: 16,
  },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: COLORS.ink },
  subtle: { fontSize: 8.5, color: COLORS.muted },

  overallBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  overallLabel: { fontSize: 9, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 },
  overallValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    marginTop: 4,
    color: COLORS.ink,
  },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 18 },
  summaryCell: { width: "50%", paddingVertical: 4, paddingRight: 10 },
  summaryKey: { fontSize: 8, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  summaryVal: { fontSize: 10, color: COLORS.ink },

  card: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 6,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.panel,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  cardTitleLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  formatBadge: {
    backgroundColor: COLORS.brand,
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  cardBody: { paddingHorizontal: 10, paddingVertical: 8 },

  badge: {
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 9,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  kvRow: { flexDirection: "row", paddingVertical: 2 },
  kvKey: { width: "34%", fontSize: 8.5, color: COLORS.muted },
  kvVal: { width: "66%", fontSize: 9 },

  msgBlock: { marginTop: 6 },
  msgHead: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  msgItem: { fontSize: 8.5, marginLeft: 8 },

  table: { marginTop: 4, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4 },
  trHead: { flexDirection: "row", backgroundColor: COLORS.panel, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.line },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", padding: 4, color: COLORS.muted },
  td: { fontSize: 8, padding: 4 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 6,
    fontSize: 7.5,
    color: COLORS.muted,
  },
});

function Badge({ indication, locale }: { indication: string; locale: Locale }) {
  const cat = statusOf(indication);
  const c = STATUS_HEX[cat];
  return (
    <Text style={[styles.badge, { color: c.fg, backgroundColor: c.bg }]}>
      {translateIndication(locale, indication)}
    </Text>
  );
}

function KV({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <Text style={styles.kvVal}>{v}</Text>
    </View>
  );
}

function Messages({ head, items, color }: { head: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <View style={styles.msgBlock} wrap={false}>
      <Text style={[styles.msgHead, { color }]}>{head}</Text>
      {items.map((m, i) => (
        <Text key={i} style={styles.msgItem}>
          • {m}
        </Text>
      ))}
    </View>
  );
}

function TokenCard({ token, index, locale }: { token: NormalizedToken; index: number; locale: Locale }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const kindLabel =
    token.kind === "timestamp"
      ? t("sig.timestamp")
      : token.kind === "evidenceRecord"
        ? t("sig.evidenceRecord")
        : t("sig.signature");

  return (
    // Card is wrappable so a long signature flows onto the next page instead of
    // jumping wholesale and leaving a big gap. Each inner block below carries
    // wrap={false} so individual sections never split mid-row.
    <View style={styles.card}>
      <View style={styles.cardHeader} wrap={false} minPresenceAhead={60}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.cardTitleLabel}>
            {kindLabel} #{index + 1}
            {token.format ? "   " : ""}
          </Text>
          {token.format ? <Text style={styles.formatBadge}>{token.format}</Text> : null}
        </View>
        <Badge indication={token.indication} locale={locale} />
      </View>
      <View style={styles.cardBody}>
        <View wrap={false}>
          <KV k={t("sig.signedBy")} v={token.signedBy} />
          <KV k={t("sig.signingTime")} v={token.signingTime ? formatDate(token.signingTime, locale) : undefined} />
          <KV
            k={t("sig.bestSignatureTime")}
            v={token.bestSignatureTime ? formatDate(token.bestSignatureTime, locale) : undefined}
          />
          <KV k={t("sig.level")} v={token.signatureLevelDescription ?? token.signatureLevel} />
          <KV k={t("sig.subIndication")} v={token.subIndication} />
        </View>

        {token.pdf &&
          (token.pdf.reason || token.pdf.location || token.pdf.subFilter || token.pdf.filter || token.pdf.fieldName || token.pdf.contactInfo || token.pdf.signerName) && (
            <View style={styles.msgBlock} wrap={false}>
              <Text style={styles.msgHead}>{t("sig.section.pdf")}</Text>
              <KV k={t("sig.reason")} v={token.pdf.reason} />
              <KV k={t("sig.location")} v={token.pdf.location} />
              <KV k={t("sig.contact")} v={token.pdf.contactInfo} />
              <KV k={t("sig.pdfSignerName")} v={token.pdf.signerName} />
              <KV k={t("sig.fieldName")} v={token.pdf.fieldName} />
              <KV k={t("sig.filter")} v={token.pdf.filter} />
              {token.pdf.subFilter && (
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>{t("sig.subFilter")}</Text>
                  <Text style={styles.kvVal}>
                    {describeSubFilter(locale, token.pdf.subFilter)}
                    <Text style={{ color: COLORS.muted }}> ({token.pdf.subFilter})</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

        {token.signerCertificate && (
          <View style={styles.msgBlock} wrap={false}>
            <Text style={styles.msgHead}>{t("sig.section.cert")}</Text>
            <KV k={t("sig.issuer")} v={token.signerCertificate.issuer} />
            <KV k={t("sig.serial")} v={token.signerCertificate.serialNumber} />
            <KV
              k={t("sig.validFrom")}
              v={token.signerCertificate.notBefore ? formatDate(token.signerCertificate.notBefore, locale) : undefined}
            />
            <KV
              k={t("sig.validTo")}
              v={token.signerCertificate.notAfter ? formatDate(token.signerCertificate.notAfter, locale) : undefined}
            />
            <KV k={t("sig.country")} v={token.signerCertificate.country} />
          </View>
        )}

        {token.crypto && (token.crypto.encryptionAlgorithm || token.crypto.digestAlgorithm) && (
          <View style={styles.msgBlock} wrap={false}>
            <Text style={styles.msgHead}>{t("sig.section.crypto")}</Text>
            <KV
              k={t("sig.algorithm")}
              v={[token.crypto.encryptionAlgorithm, token.crypto.digestAlgorithm].filter(Boolean).join(" / ") || undefined}
            />
            <KV k={t("sig.keyLength")} v={token.crypto.keyLength ? `${token.crypto.keyLength} bit` : undefined} />
            <KV
              k={t("sig.integrity")}
              v={
                token.crypto.signatureValid === undefined
                  ? undefined
                  : token.crypto.signatureIntact && token.crypto.signatureValid
                    ? t("sig.intactValid")
                    : t("sig.broken")
              }
            />
          </View>
        )}

        {token.certificateChain.length > 0 && (
          <View style={styles.msgBlock} wrap={false}>
            <Text style={styles.msgHead}>{t("sig.certChain")}</Text>
            {token.certificateChain.map((c, i) => (
              <Text key={i} style={styles.msgItem}>
                {i + 1}. {c.qualifiedName ?? c.id ?? "—"}
                {c.trusted ? "  ✓" : ""}
              </Text>
            ))}
          </View>
        )}

        {token.scopes.length > 0 && (
          <View style={styles.msgBlock} wrap={false}>
            <Text style={styles.msgHead}>{t("sig.scope")}</Text>
            {token.scopes.map((s, i) => (
              <Text key={i} style={styles.msgItem}>
                • {[s.name, s.scope, s.value].filter(Boolean).join(" · ") || "—"}
              </Text>
            ))}
          </View>
        )}

        {token.timestamps.length > 0 && (
          <View style={styles.msgBlock} wrap={false}>
            <Text style={styles.msgHead}>{t("sig.timestamps")}</Text>
            {token.timestamps.map((ts, i) => (
              <View key={i} style={{ marginLeft: 8, marginBottom: 3 }}>
                <Text style={styles.msgItem}>
                  • {ts.type ? `${ts.type} — ` : ""}
                  {ts.productionTime ? formatDate(ts.productionTime, locale) : "—"}
                  {ts.indication ? `  (${translateIndication(locale, ts.indication)})` : ""}
                </Text>
                {ts.producedBy && (
                  <Text style={[styles.msgItem, { marginLeft: 16, color: COLORS.muted }]}>
                    {t("ts.tsa")}: {ts.producedBy}
                  </Text>
                )}
                {ts.digestAlgorithm && (
                  <Text style={[styles.msgItem, { marginLeft: 16, color: COLORS.muted }]}>
                    {t("ts.digest")}: {ts.digestAlgorithm}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Messages head={t("sig.errors")} items={token.errors} color={STATUS_HEX.fail.fg} />
        <Messages head={t("sig.warnings")} items={token.warnings} color={STATUS_HEX.indeterminate.fg} />
        <Messages head={t("sig.infos")} items={token.infos} color={COLORS.muted} />
      </View>
    </View>
  );
}

export function ReportDocument({ report, locale }: { report: NormalizedReport; locale: Locale }) {
  const t = (k: Parameters<typeof translate>[1], vars?: Record<string, string | number>) =>
    translate(locale, k, vars);
  const cat = statusOf(report.overallIndication);
  const overall = STATUS_HEX[cat];
  const generated = formatDate(new Date().toISOString(), locale);

  return (
    <Document
      title={`${t("report.heading")} — ${report.documentName ?? ""}`}
      author="miPDFvalidator"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brandRow}>
            <Text style={styles.title}>{t("report.heading")}</Text>
            <Text style={styles.subtle}>
              {t("report.generated")}: {generated}
            </Text>
          </View>
        </View>

        {/* Overall banner */}
        <View style={[styles.overallBanner, { backgroundColor: overall.bg }]}>
          <View>
            <Text style={styles.overallLabel}>{t("result.overall")}</Text>
            <Text style={[styles.overallValue, { color: overall.fg }]}>
              {translateIndication(locale, report.overallIndication)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.overallLabel}>{t("result.signatures")}</Text>
            <Text style={[styles.overallValue, { color: overall.fg }]}>
              {report.validSignaturesCount} / {report.signaturesCount} {t("result.valid")}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <Text style={styles.sectionTitle}>{t("report.summary")}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryKey}>{t("result.document")}</Text>
            <Text style={styles.summaryVal}>{report.documentName ?? "—"}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryKey}>{t("result.validationTime")}</Text>
            <Text style={styles.summaryVal}>{formatDate(report.validationTime, locale)}</Text>
          </View>
          {report.containerType && (
            <View style={styles.summaryCell}>
              <Text style={styles.summaryKey}>Container</Text>
              <Text style={styles.summaryVal}>{report.containerType}</Text>
            </View>
          )}
          {(report.policyName || report.policyDescription) && (
            <View style={styles.summaryCell}>
              <Text style={styles.summaryKey}>{t("result.policy")}</Text>
              <Text style={styles.summaryVal}>
                {[report.policyName, report.policyDescription].filter(Boolean).join(" — ")}
              </Text>
            </View>
          )}
        </View>

        {/* Signature details */}
        <Text style={styles.sectionTitle} minPresenceAhead={120}>
          {t("report.details")}
        </Text>
        {report.tokens.map((token, i) => (
          <TokenCard key={token.id ?? i} token={token} index={i} locale={locale} />
        ))}

        {/* Revocation table */}
        <Text style={styles.sectionTitle}>{t("rev.title")}</Text>
        {report.revocations.length === 0 ? (
          <Text style={styles.subtle}>{t("result.noRevocation")}</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.trHead}>
              <Text style={[styles.th, { width: "12%" }]}>{t("rev.type")}</Text>
              <Text style={[styles.th, { width: "30%" }]}>{t("rev.forCert")}</Text>
              <Text style={[styles.th, { width: "16%" }]}>{t("rev.status")}</Text>
              <Text style={[styles.th, { width: "21%" }]}>{t("rev.production")}</Text>
              <Text style={[styles.th, { width: "21%" }]}>{t("rev.nextUpdate")}</Text>
            </View>
            {report.revocations.map((r, i) => (
              <View key={r.id ?? i} style={styles.tr} wrap={false}>
                <Text style={[styles.td, { width: "12%", fontFamily: "Helvetica-Bold" }]}>{r.kind || "—"}</Text>
                <Text style={[styles.td, { width: "30%" }]}>{r.forCertificate ?? "—"}</Text>
                <Text style={[styles.td, { width: "16%" }]}>{r.status ?? "—"}</Text>
                <Text style={[styles.td, { width: "21%" }]}>
                  {r.productionDate ? formatDate(r.productionDate, locale) : "—"}
                </Text>
                <Text style={[styles.td, { width: "21%" }]}>
                  {r.nextUpdate ? formatDate(r.nextUpdate, locale) : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{t("report.footer")}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${t("report.page")} ${pageNumber} ${t("report.of")} ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Render the PDF verification report to a Node Buffer. */
export async function renderReportToBuffer(report: NormalizedReport, locale: Locale): Promise<Buffer> {
  return renderToBuffer(<ReportDocument report={report} locale={locale} />);
}
