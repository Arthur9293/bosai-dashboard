import { cookies } from "next/headers";

const AUTH_COOKIE_NAME =
  process.env.BOSAI_AUTH_COOKIE_NAME?.trim() || "bosai_auth";

export default async function AuthCheckPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value || null;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white antialiased sm:px-6">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8 md:p-10">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">
              BOSAI Control Plane
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Auth check
            </h1>

            <p className="text-lg leading-8 text-zinc-400">
              Cette page sert à vérifier que la connexion et le proxy fonctionnent.
            </p>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-zinc-400">Cookie lu côté serveur</div>
            <div className="mt-3 break-all text-xl font-medium text-white">
              {authCookie || "AUCUN COOKIE"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
