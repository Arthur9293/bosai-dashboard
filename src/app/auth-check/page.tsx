import { cookies } from "next/headers";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() || "authenticated";

export default async function AuthCheckPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value || "";
  const isAuthenticated = token === AUTH_COOKIE_VALUE;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white antialiased sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8 md:p-10">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">
              BOSAI Control Plane
            </div>

            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Auth check
            </h1>

            <p className="max-w-xl text-lg leading-9 text-zinc-400">
              Vérification serveur simple du cookie de connexion.
            </p>

            <div
              className={`rounded-[24px] px-5 py-4 text-sm ${
                isAuthenticated
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : "border border-rose-500/20 bg-rose-500/10 text-rose-200"
              }`}
            >
              {isAuthenticated ? "Cookie OK" : "Cookie absent ou invalide"}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300">
              <div>
                <span className="text-zinc-500">Cookie name :</span> {AUTH_COOKIE_NAME}
              </div>
              <div className="mt-2 break-all">
                <span className="text-zinc-500">Cookie value :</span>{" "}
                {token || "—"}
              </div>
              <div className="mt-2 break-all">
                <span className="text-zinc-500">Expected value :</span>{" "}
                {AUTH_COOKIE_VALUE}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-4 text-lg font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Ouvrir dashboard
              </a>

              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-4 text-lg font-medium text-white transition hover:bg-white/[0.08]"
              >
                Retour login
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
