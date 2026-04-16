export default function AuthCheckPage() {
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
              Cette page est statique pour isoler le crash runtime.
            </p>

            <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              Si tu vois cette page après login, alors le problème ne vient pas du rendu
              de cette route.
            </div>

            <div className="flex flex-col gap-3 pt-4">
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
