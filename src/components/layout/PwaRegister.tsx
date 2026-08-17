"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/field-fetch";

export function PwaRegister() {
  useEffect(() => {
    const onOnline = () => {
      void flushOfflineQueue();
    };
    window.addEventListener("online", onOnline);

    if (!("serviceWorker" in navigator)) {
      return () => window.removeEventListener("online", onOnline);
    }
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}
