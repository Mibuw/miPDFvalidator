"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { NormalizedReport, NormalizedToken } from "@/lib/types";
import { formatDate, statusOf } from "@/lib/status";
import { describeSubFilter } from "@/lib/i18n";
import { useI18n } from "./LanguageProvider";
import { IndicationBadge } from "./IndicationBadge";

const OVERALL_BG: Record<string, string> = {
  pass: "from-green-50 to-white ring-green-200",
  indeterminate: "from-amber-50 to-white ring-amber-200",
  fail: "from-red-50 to-white ring-red-200",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-4">
      <dt className="w-52 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <dl className="divide-y divide-slate-50">{children}</dl>
    </div>
  );
}

function MessageList({ title, items, tone }: { title: string; items: string[]; tone: "fail" | "warn" | "info" }) {
  if (!items.length) return null;
  const color =
    tone === "fail" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-slate-500";
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
        {items.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function TokenCard({ token, index }: { token: NormalizedToken; index: number }) {
  const { t, locale, ti } = useI18n();
  const kindLabel =
    token.kind === "timestamp"
      ? t("sig.timestamp")
      : token.kind === "evidenceRecord"
        ? t("sig.evidenceRecord")
        : t("sig.signature");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {kindLabel} #{index + 1}
          </span>
          {token.format && (
            <span className="rounded-md bg-blue-600 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-white shadow-sm">
              {token.format}
            </span>
          )}
        </div>
        <IndicationBadge indication={token.indication} />
      </div>

      <div className="px-4 py-3">
        <dl className="divide-y divide-slate-50">
          <Row label={t("sig.signedBy")} value={token.signedBy} />
          <Row label={t("sig.signingTime")} value={token.signingTime ? formatDate(token.signingTime, locale) : null} />
          <Row
            label={t("sig.bestSignatureTime")}
            value={token.bestSignatureTime ? formatDate(token.bestSignatureTime, locale) : null}
          />
          <Row label={t("sig.level")} value={token.signatureLevelDescription ?? token.signatureLevel} />
          <Row label={t("sig.subIndication")} value={token.subIndication} />
        </dl>

        {token.pdf && (token.pdf.reason || token.pdf.location || token.pdf.subFilter || token.pdf.filter || token.pdf.fieldName || token.pdf.contactInfo || token.pdf.signerName) && (
          <Group title={t("sig.section.pdf")}>
            <Row label={t("sig.reason")} value={token.pdf.reason} />
            <Row label={t("sig.location")} value={token.pdf.location} />
            <Row label={t("sig.contact")} value={token.pdf.contactInfo} />
            <Row label={t("sig.pdfSignerName")} value={token.pdf.signerName} />
            <Row label={t("sig.fieldName")} value={token.pdf.fieldName} />
            <Row label={t("sig.filter")} value={token.pdf.filter} />
            {token.pdf.subFilter && (
              <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-4">
                <dt className="w-52 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t("sig.subFilter")}
                </dt>
                <dd className="text-sm text-slate-800">
                  {describeSubFilter(locale, token.pdf.subFilter)}
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-400">
                    {token.pdf.subFilter}
                  </span>
                </dd>
              </div>
            )}
          </Group>
        )}

        {token.signerCertificate && (
          <Group title={t("sig.section.cert")}>
            <Row label={t("sig.issuer")} value={token.signerCertificate.issuer} />
            <Row label={t("sig.serial")} value={token.signerCertificate.serialNumber} />
            <Row
              label={t("sig.validFrom")}
              value={token.signerCertificate.notBefore ? formatDate(token.signerCertificate.notBefore, locale) : null}
            />
            <Row
              label={t("sig.validTo")}
              value={token.signerCertificate.notAfter ? formatDate(token.signerCertificate.notAfter, locale) : null}
            />
            <Row label={t("sig.country")} value={token.signerCertificate.country} />
          </Group>
        )}

        {token.crypto && (token.crypto.encryptionAlgorithm || token.crypto.digestAlgorithm) && (
          <Group title={t("sig.section.crypto")}>
            <Row
              label={t("sig.algorithm")}
              value={[token.crypto.encryptionAlgorithm, token.crypto.digestAlgorithm].filter(Boolean).join(" / ")}
            />
            <Row label={t("sig.keyLength")} value={token.crypto.keyLength ? `${token.crypto.keyLength} bit` : null} />
            <Row
              label={t("sig.integrity")}
              value={
                token.crypto.signatureValid === undefined
                  ? null
                  : token.crypto.signatureIntact && token.crypto.signatureValid
                    ? `✓ ${t("sig.intactValid")}`
                    : `✗ ${t("sig.broken")}`
              }
            />
          </Group>
        )}

        {token.certificateChain.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("sig.certChain")}</p>
            <ol className="mt-1 space-y-0.5 text-sm text-slate-700">
              {token.certificateChain.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{i + 1}.</span>
                  <span className="break-all">{c.qualifiedName ?? c.id ?? "—"}</span>
                  {c.trusted && <span className="text-xs font-semibold text-green-600">✓ trusted</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {token.timestamps.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("sig.timestamps")}</p>
            <ul className="mt-1 space-y-2 text-sm text-slate-700">
              {token.timestamps.map((ts, i) => (
                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {ts.type && <span className="font-mono text-xs text-slate-500">{ts.type}</span>}
                    <span className="font-medium">{ts.productionTime ? formatDate(ts.productionTime, locale) : "—"}</span>
                    {ts.indication && <IndicationBadge indication={ts.indication} />}
                  </div>
                  <div className="mt-1 grid grid-cols-1 gap-x-4 text-xs text-slate-500 sm:grid-cols-2">
                    {ts.producedBy && (
                      <span>
                        {t("ts.tsa")}: <span className="text-slate-700">{ts.producedBy}</span>
                      </span>
                    )}
                    {ts.digestAlgorithm && (
                      <span>
                        {t("ts.digest")}: <span className="text-slate-700">{ts.digestAlgorithm}</span>
                      </span>
                    )}
                    {ts.subIndication && (
                      <span>
                        {t("sig.subIndication")}: <span className="text-slate-700">{ts.subIndication}</span>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <MessageList title={t("sig.errors")} items={token.errors} tone="fail" />
        <MessageList title={t("sig.warnings")} items={token.warnings} tone="warn" />
        <MessageList title={t("sig.infos")} items={token.infos} tone="info" />
      </div>
    </motion.div>
  );
}

function RevocationTable({ report }: { report: NormalizedReport }) {
  const { t, locale } = useI18n();
  if (report.revocations.length === 0) {
    return <p className="text-sm text-slate-500">{t("result.noRevocation")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm scroll-slim">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-semibold">{t("rev.type")}</th>
            <th className="px-3 py-2 font-semibold">{t("rev.forCert")}</th>
            <th className="px-3 py-2 font-semibold">{t("rev.status")}</th>
            <th className="px-3 py-2 font-semibold">{t("rev.production")}</th>
            <th className="px-3 py-2 font-semibold">{t("rev.nextUpdate")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {report.revocations.map((r, i) => (
            <tr key={r.id ?? i}>
              <td className="px-3 py-2 font-semibold text-slate-800">{r.kind || "—"}</td>
              <td className="px-3 py-2 text-slate-700">{r.forCertificate ?? "—"}</td>
              <td className="px-3 py-2 text-slate-700">{r.status ?? "—"}</td>
              <td className="px-3 py-2 text-slate-600">{r.productionDate ? formatDate(r.productionDate, locale) : "—"}</td>
              <td className="px-3 py-2 text-slate-600">{r.nextUpdate ? formatDate(r.nextUpdate, locale) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ValidationResultView({ report }: { report: NormalizedReport }) {
  const { t, locale } = useI18n();
  const cat = statusOf(report.overallIndication);

  return (
    <div className="space-y-8">
      {/* Overall banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl bg-gradient-to-br p-6 ring-1 ${OVERALL_BG[cat]}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("result.overall")}</p>
            <div className="mt-2">
              <IndicationBadge indication={report.overallIndication} size="lg" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t("result.signatures")}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {report.validSignaturesCount}
              <span className="text-slate-400"> / {report.signaturesCount}</span>{" "}
              <span className="text-sm font-medium text-slate-500">{t("result.valid")}</span>
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 border-t border-slate-200/70 pt-4 sm:grid-cols-2">
          <Row label={t("result.document")} value={report.documentName} />
          <Row label={t("result.validationTime")} value={formatDate(report.validationTime, locale)} />
          {report.containerType && <Row label="Container" value={report.containerType} />}
          {(report.policyName || report.policyDescription) && (
            <Row
              label={t("result.policy")}
              value={[report.policyName, report.policyDescription].filter(Boolean).join(" — ")}
            />
          )}
        </dl>
      </motion.div>

      {/* Signature details */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{t("report.details")}</h2>
        {report.tokens.length === 0 ? (
          <p className="text-sm text-slate-500">{t("indication.NO_SIGNATURE_FOUND")}</p>
        ) : (
          report.tokens.map((token, i) => <TokenCard key={token.id ?? i} token={token} index={i} />)
        )}
      </section>

      {/* Revocation */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">{t("rev.title")}</h2>
        <RevocationTable report={report} />
      </section>
    </div>
  );
}
