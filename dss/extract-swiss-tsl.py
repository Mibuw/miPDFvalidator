#!/usr/bin/env python3
"""Extract the CA/service certificates of all GRANTED trust services from the
Swiss Trusted List (ETSI TS 119 612) into PEM .crt files.

Usage: extract-swiss-tsl.py <tsl.xml> <out-dir>

Only services whose status is 'granted'/'recognisedatnationallevel' are taken,
so withdrawn/expired services are not trusted. Files are named by TSP + SHA-256
prefix and de-duplicated. These become trust anchors in the DSS trust store
(trusted, not qualified — DSS qualification requires the TSL as a real list).
"""
import sys, os, re, base64, hashlib, subprocess
import xml.etree.ElementTree as ET

T = "{http://uri.etsi.org/02231/v2#}"
NS = {"t": "http://uri.etsi.org/02231/v2#"}

def to_pem(b64):
    der = base64.b64decode(re.sub(r"\s", "", b64))
    return der, "-----BEGIN CERTIFICATE-----\n" + base64.encodebytes(der).decode() + "-----END CERTIFICATE-----\n"

def subject(der):
    try:
        p = subprocess.run(["openssl", "x509", "-noout", "-subject", "-nameopt", "RFC2253"],
                            input=der, capture_output=True)
        return p.stdout.decode().strip().removeprefix("subject=")
    except Exception:
        return "?"

def main(tsl, outdir):
    root = ET.parse(tsl).getroot()
    os.makedirs(outdir, exist_ok=True)
    for f in os.listdir(outdir):
        if f.endswith(".crt"):
            os.remove(os.path.join(outdir, f))
    seen, written = set(), 0
    for tsp in root.iter(T + "TrustServiceProvider"):
        n = tsp.find(".//t:TSPName/t:Name", NS)
        tspname = n.text if n is not None else "?"
        for info in tsp.iter(T + "ServiceInformation"):
            st = info.find("t:ServiceStatus", NS)
            status = st.text if st is not None else ""
            if not ("granted" in status or "recognisedatnationallevel" in status):
                continue
            for x in info.iter(T + "X509Certificate"):
                if not x.text:
                    continue
                der, pem = to_pem(x.text)
                fp = hashlib.sha256(der).hexdigest()
                if fp in seen:
                    continue
                seen.add(fp)
                safe = re.sub(r"[^A-Za-z0-9]+", "-", tspname)[:28].strip("-")
                open(os.path.join(outdir, f"ch-{safe}-{fp[:12]}.crt"), "w").write(pem)
                written += 1
    print(f"{written} granted Swiss certificates -> {outdir}")
    return written

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(2)
    sys.exit(0 if main(sys.argv[1], sys.argv[2]) > 0 else 1)
