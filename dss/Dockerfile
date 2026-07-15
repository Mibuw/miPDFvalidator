# DSS with our own trust anchors.
#
# The stock DSS demo webapp trusts only what the EU trusted lists carry, so signatures from a private CA —
# including our own miPDFsign Cloud CA — are reported as untrusted. This image adds a PKCS#12 trust store
# built from every certificate in ./trusted and points DSS at it (see dss-custom.properties).
#
# Build:  docker build -t mipdfvalidator-dss:6.4-trust --build-arg DSS_BASE=dss-demo:6.4 ./dss
# The base is the DSS demo bundle image you built yourself (ROOT.war in a Tomcat/JDK image) — it is not on
# a public registry, so DSS_BASE has to name a local tag.

ARG DSS_BASE=dss-demo:6.4

# ── 1. Build the trust store from the committed certificates ────────────────────────────────────────
FROM eclipse-temurin:21-jre AS truststore

# Not a secret: the store holds public CA certificates only and is baked into the image. It exists because
# PKCS#12 requires one; it protects nothing. Override it if your setup wants a different value — then set
# trusted.source.keystore.password in dss-custom.properties to match.
ARG STORE_PASS=dss-password

WORKDIR /build
COPY trusted/ /build/trusted/

RUN set -eu; \
    found=0; \
    for cert in /build/trusted/*.crt; do \
      [ -e "$cert" ] || continue; \
      found=1; \
      alias="$(basename "$cert" .crt)"; \
      echo "importing $alias"; \
      keytool -importcert -noprompt -trustcacerts \
        -alias "$alias" -file "$cert" \
        -keystore /build/mipdfsign-truststore.p12 \
        -storetype PKCS12 -storepass "$STORE_PASS"; \
    done; \
    [ "$found" = 1 ] || { echo "no certificates in ./trusted — refusing to build an empty trust store" >&2; exit 1; }; \
    keytool -list -keystore /build/mipdfsign-truststore.p12 -storetype PKCS12 -storepass "$STORE_PASS"

# ── 2. Drop it into Tomcat's lib, which is on the common classpath ──────────────────────────────────
FROM ${DSS_BASE}
COPY --from=truststore /build/mipdfsign-truststore.p12 /usr/local/tomcat/lib/mipdfsign-truststore.p12
COPY dss-custom.properties /usr/local/tomcat/lib/dss-custom.properties
