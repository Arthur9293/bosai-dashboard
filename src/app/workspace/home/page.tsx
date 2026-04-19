import Link from "next/link";

export default function WorkspaceHomePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Workspace Home
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Workspace Home
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Test ultra-safe. Cette page ne dépend ni du resolver, ni de la session,
              ni des composants dashboard.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="space-y-3">
            <div className="text-lg font-medium text-white">
              Si tu vois cette carte, la route /workspace/home fonctionne.
            </div>

            <div className="text-sm text-zinc-400">
              Le problème vient alors du contenu précédent de la page, pas du routing.
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/overview"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            Ouvrir Overview
          </Link>

          <Link
            href="/flows"
            className="inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Ouvrir Flows
          </Link>
        </section>
      </div>
    </main>
  );
}
