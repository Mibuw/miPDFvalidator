"use client";

import { useEffect, useRef, useState } from "react";

// Renders the OpenAPI spec with Redoc, loaded from a CDN. If the CDN is
// unreachable (e.g. offline), we show a fallback with a link to the raw spec.
declare global {
  interface Window {
    Redoc?: { init: (url: string, options: object, element: HTMLElement) => void };
  }
}

const REDOC_CDN = "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (window.Redoc && containerRef.current) {
      window.Redoc.init("/openapi.yaml", { hideDownloadButton: false }, containerRef.current);
      return;
    }
    const script = document.createElement("script");
    script.src = REDOC_CDN;
    script.async = true;
    script.onload = () => {
      if (window.Redoc && containerRef.current) {
        window.Redoc.init("/openapi.yaml", { hideDownloadButton: false }, containerRef.current);
      } else {
        setFailed(true);
      }
    };
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {failed && (
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h1 className="text-xl font-bold text-slate-800">API-Dokumentation</h1>
          <p className="mt-2 text-slate-600">
            Die interaktive Doku konnte nicht geladen werden (CDN nicht erreichbar). Die OpenAPI-Spezifikation
            steht hier zur Verfügung:
          </p>
          <a
            href="/openapi.yaml"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            openapi.yaml herunterladen
          </a>
        </div>
      )}
      <div ref={containerRef} />
    </main>
  );
}
