# miPDFValidator

**miPDFValidator** — a web frontend for validating electronic signatures (PAdES, XAdES, CAdES, ASiC)
on top of the [ETSI DSS](https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/) REST API.
Drag & drop a document → validate it via DSS → download a **PDF verification report**
including OCSP, CRL and timestamp checks.

> **Test instance:** <http://miPDFValidator.mitterbucher.com:3000> (availability not guaranteed)

## Features

- **Drag & drop + file upload** for signed documents
- **Automatic format detection** by DSS (PAdES / XAdES / CAdES / ASiC-S / ASiC-E)
- **PDF verification report** — modelled on the DSS *Simple Report*:
  overall status, signature details, certificate chain, qualification, signature scope,
  timestamps and **OCSP/CRL revocation checks**
- **Raw data export** of the DSS reports (JSON) for audit/debugging
- **Bilingual** (German / English) — switchable, selection is persisted
- Robust **report normalizer** that handles varying DSS JSON field names
  (PascalCase / camelCase) case-insensitively

## Architecture

```
Browser (Next.js / React)
   │  multipart upload
   ▼
/api/validate  ──► DSS REST  POST /services/rest/validation/validateSignature
   │  (normalizes SimpleReport + DiagnosticData)
   ▼
/api/report    ──► renders PDF via @react-pdf/renderer
```

The application only calls the DSS **validation/verification API**. The DSS endpoint
(your own Docker instance) is configured via an environment variable — no documents are
sent to any public service.

## Prerequisites

1. **Node.js ≥ 18** (tested with Node 24) — or **Docker** (see [Deployment](#deployment-docker))
2. A running **DSS instance** with REST services.

   miPDFValidator is **only a client** — it does not contain DSS. The backend comes from the
   **EU Digital Signature Service (DSS)** project by the European Commission:

   - Source & docs: <https://github.com/esig/dss>
   - Ready-made **demo bundles** (contain the `dss-demo-webapp`, e.g. as a `.war`) for download:
     [`dss-demo-bundle` in the EU Maven repository][dss-bundle]

   [dss-bundle]: https://ec.europa.eu/digital-building-blocks/artifact/service/rest/repository/browse/esignaturedss/eu/europa/ec/joinup/sd-dss/dss-demo-bundle/

   A typical Docker setup drops the `ROOT.war` (from the bundle) into an official
   Tomcat/JDK image and starts DSS on port `8080`:

   ```bash
   docker compose up -d --build      # starts DSS on :8080
   docker compose logs -f            # DSS loads the EU trusted lists on startup
   ```

   The REST services must be reachable at `http://<host>:8080/services/rest/...`.

## Setup

```bash
npm install
cp .env.example .env.local     # then adjust DSS_API_URL
npm run dev
```

`.env.local`:

```env
DSS_API_URL=http://localhost:8080   # base URL of your DSS instance (no trailing /)
MAX_UPLOAD_MB=20
DSS_TIMEOUT_MS=60000
```

The app opens at <http://localhost:3000>.

## Deployment (Docker)

A production-ready Docker setup is included for permanent operation: a multi-stage build
based on the Next.js **standalone** output (slim image, non-root) and a
`docker-compose.yml` with `restart: unless-stopped`.

```bash
docker compose up -d --build     # build image + start container
docker compose logs -f           # logs
docker compose down              # stop & remove
```

The app then runs at <http://localhost:3000> and comes back up automatically after a
reboot (once the Docker engine is up).

### Networking to the DSS backend

If **DSS also runs as a container**, the app container must **not** reach DSS via
`localhost` (that points at the app container itself), but via the **container/service
name** on the shared Docker network. The bundled `docker-compose.yml` attaches the app to
the external DSS network and sets accordingly:

```yaml
environment:
  DSS_API_URL: http://dss-demo:8080   # container name of the DSS instance
networks:
  dss:
    name: dss-demo-bundle-64_default  # adjust to your DSS network if needed
    external: true
```

Check network and container names with `docker network ls` and `docker ps`.
If DSS does **not** run in Docker but directly on the host, use
`DSS_API_URL: http://host.docker.internal:8080`.

## Usage

1. Drop or select a signed document
2. Click **Verify signature**
3. The result is shown (overall status, signatures, revocation check)
4. **Download the PDF report** — contains all verification details incl. OCSP/CRL/timestamp

## REST API

Besides the web frontend, a REST API is available that accepts a document, verifies it
and returns the **PDF report** directly.

- **Interactive docs (Redoc):** <http://localhost:3000/docs>
- **OpenAPI specification:** [`/openapi.yaml`](public/openapi.yaml)

### `POST /api/v1/verify`

Verifies a signed document and returns a PDF report (default) or the structured JSON.

**Query parameters**

| Parameter | Values | Default | Description |
| --- | --- | --- | --- |
| `lang` | `de`, `en` | `de` | language of the PDF report |
| `format` | `pdf`, `json` | `pdf` | response format (also via `Accept` header) |
| `filename` | string | `document` | file name for raw-body uploads |

**Response headers (for PDF)**: `X-Verification-Indication`, `X-Valid-Signatures`,
`X-Total-Signatures` — so a client can evaluate the overall result without parsing the PDF.

**Example — multipart, PDF response:**

```bash
curl -X POST "http://localhost:3000/api/v1/verify?lang=en" \
  -F "file=@signed.pdf" \
  -o verification-report.pdf
```

**Example — raw body, JSON response:**

```bash
curl -X POST "http://localhost:3000/api/v1/verify?format=json&filename=signed.pdf" \
  -H "Content-Type: application/pdf" \
  --data-binary "@signed.pdf"
```

**Detached signature** (separate original document):

```bash
curl -X POST "http://localhost:3000/api/v1/verify" \
  -F "file=@signature.p7s" \
  -F "originalDocument=@original.txt" \
  -o report.pdf
```

Errors are returned as JSON: `400` (bad request), `413` (too large),
`502` (DSS unreachable), `500` (unexpected).

### Other endpoints (used by the frontend)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/validate` | verification → structured JSON (report + raw DSS data) |
| `POST /api/report` | render a PDF from an existing report object |

## Logging

All routes and the DSS client emit **structured logs** — one JSON line per event to
`stdout`/`stderr`, ideal for `docker compose logs` and log collectors (Loki, ELK …).
Each request gets a `reqId` that correlates all of its lines
(request → DSS call incl. timing → result/error).

Every line is separated by origin via the **`channel`** field:

| `channel` | Routes | Origin |
| --- | --- | --- |
| `web` | `/api/validate`, `/api/report` | called by the browser frontend |
| `api` | `/api/v1/verify` | public REST API (external clients) |

```bash
docker compose logs -f mipdfvalidator                          # live
docker compose logs mipdfvalidator | grep '"channel":"api"'    # public API only
docker compose logs mipdfvalidator | grep '"channel":"web"'    # web frontend only
docker compose logs mipdfvalidator | grep '"level":"error"'    # errors only
```

Example line:

```json
{"ts":"2026-07-01T18:13:19.482Z","level":"info","msg":"DSS validateSignature request","channel":"api","route":"/api/v1/verify","reqId":"e350a6c2-…","document":"dummy.pdf","strategy":"EXTRACT_ALL"}
```

Verbosity is controlled by `LOG_LEVEL` (`debug` | `info` | `warn` | `error`, default
`info`). **Document contents are never logged** — only metadata such as file name, size,
timing and result indication.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm run start` | production server |
| `npm run typecheck` | TypeScript check without emit |

## Notes on DSS JSON compatibility

The JSON field names of DSS reports can vary slightly between DSS versions. The normalizer
in [`src/lib/normalize.ts`](src/lib/normalize.ts) therefore reads fields case-insensitively
and accepts several candidate names. If a field is named differently in your DSS version,
it can be added there selectively; the raw DSS data is also available via the JSON export.

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS · Framer Motion · @react-pdf/renderer

## License & acknowledgements

The **miPDFValidator** code is licensed under the **MIT License** — see [`LICENSE`](LICENSE).

miPDFValidator is a standalone REST client and contains no DSS code. The actual signature
validation is performed by the **EU Digital Signature Service (DSS)** project:

- **DSS** — © European Commission, licensed under **LGPL-2.1**.
  Source: <https://github.com/esig/dss> ·
  Demo bundles: [EU Maven repository][dss-bundle]

DSS is accessed exclusively as an external service via its REST API (no linking, no
bundling), so this project's MIT license and DSS's LGPL-2.1 coexist independently. All
rights to DSS remain with the European Union and the respective authors.

The web dependencies used (Next.js, React, @react-pdf/renderer, Framer Motion,
Tailwind CSS) are licensed under MIT, TypeScript under Apache-2.0.
