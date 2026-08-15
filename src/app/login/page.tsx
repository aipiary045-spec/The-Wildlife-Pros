import { Logo } from "@/components/brand/Logo";
import { safeNextPath } from "@/lib/paths";

const ERRORS: Record<string, string> = {
  invalid: "Invalid credentials",
  missing: "Email and password are required",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const error = params.error ? (ERRORS[params.error] ?? "Unable to sign in") : "";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
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
      <section className="flex items-center justify-center px-6 py-12" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}>
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
          <form action="/api/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm">
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                defaultValue="admin@thewildlifepros.com"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue="demo"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </label>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            <button type="submit" className="w-full rounded-lg bg-orange py-2.5 font-semibold text-white">
              Open dispatch board
            </button>
            <p className="text-xs text-stone-500">
              Demo logins: admin@, dispatch@, or tech@thewildlifepros.com · password <strong>demo</strong>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
