#!/usr/bin/env bash
# Refresh the Swiss ZertES trust anchors from the official Swiss TSL, and
# rebuild + redeploy the DSS trust wrapper ONLY if the certificate set changed.
# The DSS base image is untouched — this only regenerates our trust store.
#   Scheduled weekly via /etc/cron.d/mipdfvalidator-swiss-tsl
set -euo pipefail
DIR=/opt/mipdfvalidator
TSL_URL=https://trustedlist.tsl-switzerland.ch/tsl-ch.xml
log(){ echo "[$(date -Is)] $*"; }
cd "$DIR"

before=$(cat dss/trusted/ch/*.crt 2>/dev/null | sha256sum | cut -d' ' -f1 || echo none)
tmp=$(mktemp)
curl -fsSL --max-time 60 -o "$tmp" "$TSL_URL"
[ -s "$tmp" ] || { log "ERROR: empty download from $TSL_URL"; exit 1; }
python3 dss/extract-swiss-tsl.py "$tmp" dss/trusted/ch
rm -f "$tmp"
after=$(cat dss/trusted/ch/*.crt 2>/dev/null | sha256sum | cut -d' ' -f1)

if [ "$before" = "$after" ]; then
  log "Swiss TSL unchanged — no redeploy needed"
  exit 0
fi
log "Swiss TSL changed — rebuilding DSS trust image"
docker build -t mipdfvalidator-dss:6.4-trust --build-arg DSS_BASE=dss-demo:6.4 ./dss >/tmp/dss-trust-build.log 2>&1
docker compose -f docker-compose.prod.yml up -d dss
log "DSS redeployed with refreshed Swiss trust"
