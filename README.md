# miPDFValidator

**miPDFValidator** — ein Web-Frontend zur Prüfung elektronischer Signaturen (PAdES, XAdES, CAdES, ASiC) auf Basis
der [ETSI DSS](https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/) REST-API.
Dokument per Drag & Drop hochladen → Validierung über DSS → **PDF-Verifikationsreport**
inkl. OCSP-, CRL- und Zeitstempel-Prüfung herunterladen.

> **Test-Instanz:** <http://miPDFValidator.mitterbucher.com:3000> (Verfügbarkeit ohne Gewähr)

## Features

- **Drag & Drop + Datei-Upload** für signierte Dokumente
- **Automatische Formaterkennung** durch DSS (PAdES / XAdES / CAdES / ASiC-S / ASiC-E)
- **Verifikationsreport als PDF** – am DSS *Simple Report* orientiert:
  Gesamtstatus, Signaturdetails, Zertifikatskette, Qualifikation, Signaturumfang,
  Zeitstempel sowie **OCSP-/CRL-Sperrprüfung**
- **Rohdaten-Export** der DSS-Reports (JSON) für Audit/Debugging
- **Zweisprachig** (Deutsch / Englisch) – umschaltbar, Auswahl wird gespeichert
- Robuster **Report-Normalizer**, der unterschiedliche DSS-JSON-Feldnamen
  (PascalCase / camelCase) case-insensitiv verarbeitet

## Architektur

```
Browser (Next.js / React)
   │  multipart Upload
   ▼
/api/validate  ──► DSS REST  POST /services/rest/validation/validateSignature
   │  (normalisiert SimpleReport + DiagnosticData)
   ▼
/api/report    ──► rendert PDF via @react-pdf/renderer
```

Die Anwendung ruft **nur die Validation-/Verification-API** von DSS auf. Der DSS-Endpoint
(deine eigene Docker-Instanz) wird per Umgebungsvariable konfiguriert – es werden keine
Dokumente an öffentliche Dienste gesendet.

## Voraussetzungen

1. **Node.js ≥ 18** (getestet mit Node 24) — bzw. **Docker** (siehe [Deployment](#deployment-docker))
2. Eine laufende **DSS-Instanz** mit REST-Services.

   miPDFValidator ist **nur ein Client** — es enthält kein DSS. Das Backend stammt aus dem
   Projekt **EU Digital Signature Service (DSS)** der Europäischen Kommission:

   - Quellcode & Doku: <https://github.com/esig/dss>
   - Fertige **Demo-Bundles** (enthalten die `dss-demo-webapp`, u. a. als `.war`) zum Download:
     [`dss-demo-bundle` im EU-Maven-Repository][dss-bundle]

   [dss-bundle]: https://ec.europa.eu/digital-building-blocks/artifact/service/rest/repository/browse/esignaturedss/eu/europa/ec/joinup/sd-dss/dss-demo-bundle/

   Ein typisches Docker-Setup legt das `ROOT.war` (aus dem Bundle) in ein offizielles
   Tomcat-/JDK-Image und startet DSS auf Port `8080`:

   ```bash
   docker compose up -d --build      # startet DSS auf :8080
   docker compose logs -f            # DSS lädt beim Start die EU-Trusted-Lists
   ```

   Die REST-Services müssen unter `http://<host>:8080/services/rest/...` erreichbar sein.

## Einrichtung

```bash
npm install
cp .env.example .env.local     # danach DSS_API_URL anpassen
npm run dev
```

`.env.local`:

```env
DSS_API_URL=http://localhost:8080   # Basis-URL deiner DSS-Instanz (ohne / am Ende)
MAX_UPLOAD_MB=20
DSS_TIMEOUT_MS=60000
```

App öffnet unter <http://localhost:3000>.

## Deployment (Docker)

Für den Dauerbetrieb liegt ein produktionsfertiges Docker-Setup bei: ein Multi-Stage-Build
auf Basis des Next.js **standalone**-Outputs (schlankes Image, non-root) und eine
`docker-compose.yml` mit `restart: unless-stopped`.

```bash
docker compose up -d --build     # Image bauen + Container starten
docker compose logs -f           # Logs
docker compose down              # stoppen & entfernen
```

Danach läuft die App unter <http://localhost:3000> und kommt nach einem Reboot
automatisch wieder hoch (sobald die Docker-Engine läuft).

### Netzwerk zum DSS-Backend

Läuft **DSS ebenfalls als Container**, darf der App-Container DSS **nicht** über
`localhost` ansprechen (das zeigt auf den App-Container selbst), sondern über den
**Container-/Servicenamen** im gemeinsamen Docker-Netzwerk. Die mitgelieferte
`docker-compose.yml` hängt die App an das externe DSS-Netzwerk und setzt entsprechend:

```yaml
environment:
  DSS_API_URL: http://dss-demo:8080   # Container-Name der DSS-Instanz
networks:
  dss:
    name: dss-demo-bundle-64_default  # ggf. an dein DSS-Netzwerk anpassen
    external: true
```

Netzwerk- und Container-Namen prüfst du mit `docker network ls` bzw. `docker ps`.
Läuft DSS **nicht** in Docker, sondern direkt auf dem Host, verwende
`DSS_API_URL: http://host.docker.internal:8080`.

## Nutzung

1. Signiertes Dokument per Drag & Drop ablegen oder auswählen
2. **Signatur prüfen** klicken
3. Ergebnis wird angezeigt (Gesamtstatus, Signaturen, Sperrprüfung)
4. **PDF-Report herunterladen** – enthält alle Prüfdetails inkl. OCSP/CRL/Timestamp

## REST-API

Neben dem Web-Frontend steht eine REST-API bereit, die ein Dokument entgegennimmt,
verifiziert und direkt den **PDF-Report** zurückgibt.

- **Interaktive Doku (Redoc):** <http://localhost:3000/docs>
- **OpenAPI-Spezifikation:** [`/openapi.yaml`](public/openapi.yaml)

### `POST /api/v1/verify`

Verifiziert ein signiertes Dokument und liefert einen PDF-Report (Standard) oder das
strukturierte JSON.

**Query-Parameter**

| Parameter | Werte | Default | Beschreibung |
| --- | --- | --- | --- |
| `lang` | `de`, `en` | `de` | Sprache des PDF-Reports |
| `format` | `pdf`, `json` | `pdf` | Antwortformat (auch via `Accept`-Header) |
| `filename` | String | `document` | Dateiname bei Raw-Body-Upload |

**Antwort-Header (bei PDF)**: `X-Verification-Indication`, `X-Valid-Signatures`,
`X-Total-Signatures` — so kann ein Client das Gesamtergebnis auswerten, ohne das PDF zu parsen.

**Beispiel – multipart, PDF zurück:**

```bash
curl -X POST "http://localhost:3000/api/v1/verify?lang=de" \
  -F "file=@signiert.pdf" \
  -o verification-report.pdf
```

**Beispiel – Raw-Body, JSON zurück:**

```bash
curl -X POST "http://localhost:3000/api/v1/verify?format=json&filename=signiert.pdf" \
  -H "Content-Type: application/pdf" \
  --data-binary "@signiert.pdf"
```

**Detached-Signatur** (separates Originaldokument):

```bash
curl -X POST "http://localhost:3000/api/v1/verify" \
  -F "file=@signature.p7s" \
  -F "originalDocument=@original.txt" \
  -o report.pdf
```

Fehler werden als JSON zurückgegeben: `400` (ungültige Anfrage), `413` (zu groß),
`502` (DSS nicht erreichbar), `500` (unerwartet).

### Weitere Endpunkte (vom Frontend genutzt)

| Endpoint | Zweck |
| --- | --- |
| `POST /api/validate` | Verifizierung → strukturiertes JSON (Report + DSS-Rohdaten) |
| `POST /api/report` | PDF aus einem bereits vorhandenen Report-Objekt rendern |

## Scripts

| Script | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build |
| `npm run start` | Produktionsserver |
| `npm run typecheck` | TypeScript-Prüfung ohne Emit |

## Hinweise zur DSS-JSON-Kompatibilität

Die JSON-Feldnamen der DSS-Reports können je nach DSS-Version leicht abweichen. Der
Normalizer in [`src/lib/normalize.ts`](src/lib/normalize.ts) liest Felder deshalb
case-insensitiv und akzeptiert mehrere Kandidatennamen. Falls in deiner DSS-Version ein
Feld anders heißt, lässt sich das dort punktuell ergänzen; die DSS-Rohdaten sind zudem
über den JSON-Export einsehbar.

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Framer Motion · @react-pdf/renderer

## Lizenz & Danksagung

Der Code von **miPDFValidator** steht unter der **MIT-Lizenz** — siehe [`LICENSE`](LICENSE).

miPDFValidator ist ein eigenständiger REST-Client und enthält keinen DSS-Code. Die
eigentliche Signaturprüfung leistet das Projekt **EU Digital Signature Service (DSS)**:

- **DSS** — © European Commission, lizenziert unter **LGPL-2.1**.
  Quellcode: <https://github.com/esig/dss> ·
  Demo-Bundles: [EU-Maven-Repository][dss-bundle]

DSS wird ausschließlich als externer Dienst über dessen REST-API angesprochen (kein
Linking, kein Bundling), weshalb die MIT-Lizenz dieses Projekts und die LGPL-2.1 von DSS
unabhängig nebeneinander bestehen. Alle Rechte an DSS verbleiben bei der Europäischen
Union bzw. den jeweiligen Urhebern.

Die verwendeten Web-Abhängigkeiten (Next.js, React, @react-pdf/renderer, Framer Motion,
Tailwind CSS) stehen unter der MIT-Lizenz, TypeScript unter Apache-2.0.
