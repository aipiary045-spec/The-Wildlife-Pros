"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

export function ClientPortalLink({ portalToken }: { portalToken: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/portal/${portalToken}`;
  const href = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="font-semibold">Customer hub</h2>
      <p className="mt-1 text-sm text-stone-600">
        Visits and service updates only.
      </p>
      <p className="mt-2 break-all font-mono text-xs text-stone-600">{path}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold"
        >
          <Copy size={16} />
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange px-4 text-sm font-semibold text-white"
        >
          <ExternalLink size={16} />
          Open hub
        </a>
      </div>
    </section>
  );
}
