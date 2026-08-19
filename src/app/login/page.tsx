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
      <section className="sunset-panel relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative max-w-md px-10 text-center text-ink">
          <div className="mx-auto w-fit rounded-3xl bg-black/10 p-4 ring-1 ring-black/10 backdrop-blur-sm">
            <Logo size={160} className="drop-shadow-2xl" />
          </div>
          <h1 className="mt-8 text-4xl font-semibold leading-tight">The Wildlife Pros</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/75">
            CritterOps runs the office, the truck, and the trapline — quotes, dispatch, and the client hub in one sharp
            workspace.
          </p>
        </div>
      </section>
      <section
        className="flex items-center justify-center px-6 py-12"
        style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}
      >
        <div className="card w-full max-w-md p-8 md:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={52} />
            <div>
              <p className="text-sm font-semibold text-orange">The Wildlife Pros</p>
              <p className="text-sm text-muted-soft">CritterOps</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Field service operations for wildlife and pest work.</p>
          <form action="/api/auth/login" method="post" className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm font-semibold text-foreground">
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                defaultValue="admin@thewildlifepros.com"
                className="input-field mt-1.5"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue="demo"
                className="input-field mt-1.5"
              />
            </label>
            {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p> : null}
            <button type="submit" className="btn-primary min-h-11 w-full">
              Sign in
            </button>
            <p className="text-xs leading-relaxed text-muted-soft">
              Demo logins: admin@, dispatch@, or tech@thewildlifepros.com · password <strong className="text-foreground">demo</strong>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
