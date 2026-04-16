export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white antialiased sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-6 sm:p-8 md:p-10">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">
              BOSAI Control Plane
            </div>

            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Login test
            </h1>

            <p className="max-w-xl text-lg leading-9 text-zinc-400">
              Test statique sans server action.
            </p>

            <a
              href="/auth-check"
              className="inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-4 text-lg font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              Ouvrir auth-check
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
