import Link from "next/link";

export default function WorkspaceHomePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <div className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Workspace Home
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            Home OK
          </h1>

          <p className="mt-3 text-zinc-400">
            Si tu vois cette page, le routeur /workspace/home fonctionne
            correctement.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
      </div>
    </main>
  );
}
