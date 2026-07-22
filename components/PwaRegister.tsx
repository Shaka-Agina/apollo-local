"use client";

import { useEffect } from "react";

/** Registers the service worker for offline recently-played audio caching. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Only register in production / secure contexts (HTTPS or localhost).
    if (!window.isSecureContext) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
