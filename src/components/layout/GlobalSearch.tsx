"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { groupSearchResults, SEARCH_KIND_LABEL, type SearchResult } from "@/lib/search";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (value: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { results?: SearchResult[] };
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void runSearch(query), 200);
    return () => window.clearTimeout(timer);
  }, [open, query, runSearch]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const groups = groupSearchResults(results);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-line bg-background px-3 py-2 text-sm text-stone-600 md:flex"
      >
        <Search size={16} />
        <span>Search</span>
        <kbd className="rounded bg-panel px-1.5 py-0.5 text-[10px] text-stone-500">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-background text-stone-600 md:hidden"
      >
        <Search size={18} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-panel shadow-xl">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Search size={18} className="text-stone-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Client, phone, job #, quote, invoice…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-stone-500">
                Esc
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading ? <p className="px-3 py-4 text-sm text-stone-500">Searching…</p> : null}
              {!loading && query.trim().length < 2 && query.replace(/\D/g, "").length < 3 ? (
                <p className="px-3 py-4 text-sm text-stone-500">Type at least 2 characters or 3 phone digits.</p>
              ) : null}
              {!loading && groups.length === 0 && query.trim().length >= 2 ? (
                <p className="px-3 py-4 text-sm text-stone-500">No matches.</p>
              ) : null}
              {groups.map((group) => (
                <section key={group.kind} className="mb-2">
                  <p className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                    {SEARCH_KIND_LABEL[group.kind]}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={`${item.kind}:${item.id}`}
                      type="button"
                      onClick={() => go(item.href)}
                      className="block w-full rounded-xl px-3 py-2 text-left hover:bg-background"
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-stone-600">{item.subtitle}</p>
                    </button>
                  ))}
                </section>
              ))}
            </div>
            <div className="border-t border-line px-4 py-2 text-xs text-stone-500">
              Jump to clients, work orders, quotes, and invoices.{" "}
              <Link href="/clients" onClick={() => setOpen(false)} className="font-semibold text-orange">
                Browse clients
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
