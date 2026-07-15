# Trusting a private CA in DSS

The DSS demo webapp trusts only the certificate authorities carried by the **EU trusted lists**. A signature
from a private CA is therefore reported as *untrusted* — technically correct, but useless when you operate
that CA yourself and want your own validation service to say so.

This folder builds a DSS image that trusts the certificates in [`trusted/`](trusted) **in addition to** the
EU lists.

## What it does not do

It does not make anything *qualified*. DSS keeps qualification and trust apart: the certificates here go
into a second trusted source next to the trusted-list source, so a signature under our root validates as
**trusted, not qualified**. Nothing about the EU trusted lists changes.

## How it works

| Piece | Why |
|---|---|
| `trusted/*.crt` | The CA certificates to trust, PEM. Public material — committed on purpose, so the trust set is reviewable in git rather than hand-installed on a server. |
| `Dockerfile` | Builds a PKCS#12 trust store from those certificates with `keytool`, then copies it plus `dss-custom.properties` into `${CATALINA_HOME}/lib`. |
| `dss-custom.properties` | Sets `trusted.source.keystore.*`. DSS loads `classpath:dss-custom.properties` on top of the WAR's `dss.properties` (`ignoreResourceNotFound=true`, later wins). |

Two details decide whether this works, and both are easy to get wrong:

- **`trusted.source.keystore.filename` is a classpath resource, not a path.** DSS resolves it with
  `new ClassPathResource(filename).getFile()`. Keep it a bare file name.
- **Tomcat's `${catalina.home}/lib` is on the common classpath** — the directory itself, not just its jars.
  That is why both files go there and why a bare name resolves.

## Adding a CA

```bash
curl -o dss/trusted/my-root-ca.crt https://example.org/root.pem   # PEM, .crt extension
```

Verify the fingerprint against the one the CA publishes **before** committing it — the whole point of a
trust store is that you decided what is in it:

```bash
openssl x509 -in dss/trusted/my-root-ca.crt -noout -fingerprint -sha256
```

The file name becomes the keystore alias, so name it after the CA.

## Build & run

```bash
docker build -t mipdfvalidator-dss:6.4-trust --build-arg DSS_BASE=dss-demo:6.4 ./dss
```

`DSS_BASE` names the DSS demo bundle image you built yourself (the `ROOT.war` in a Tomcat/JDK image) — it is
not on a public registry. Then point the `dss` service at `mipdfvalidator-dss:6.4-trust` and restart it.

## Verify

Validate a PDF signed by that CA and look at the signing certificate's chain: every certificate up to and
including the root must come back `trusted: true`. Startup logs the import (`keytool -list` runs at build
time, so a broken certificate fails the build rather than silently producing an empty store).
