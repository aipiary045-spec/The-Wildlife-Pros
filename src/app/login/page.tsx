"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Logo } from "@/components/brand/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("owner@thewildlifepros.com");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to sign in");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Email
        <input
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-orange py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Open dispatch board"}
      </button>
      <p className="text-xs text-stone-500">
        Demo logins: owner@, dispatch@, or tech@thewildlifepros.com · password <strong>demo</strong>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="sunset-panel relative hidden items-center justify-center lg:flex">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-md px-8 text-center text-ink">
          <Logo size={180} className="mx-auto drop-shadow-xl" />
          <h1 className="mt-6 font-display text-4xl tracking-wide">THE WILDLIFE PROS</h1>
          <p className="mt-3 text-lg text-ink/80">
            CritterOps runs the office, the truck, and the trapline — quotes, dispatch, compliance, and
            the client hub in one place.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo size={56} />
            <div>
              <p className="font-display tracking-widest text-orange">THE WILDLIFE PROS</p>
              <p className="text-sm text-stone-500">CritterOps</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mb-6 text-sm text-stone-600">Field service operations for wildlife & pest work.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
