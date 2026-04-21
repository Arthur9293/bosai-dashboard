import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspacesPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
          Diagnostic
        </div>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Workspaces route OK
        </h1>

        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
          Si cette page s’affiche sans écran noir, alors le bug ne vient pas de la
          route <code className="text-zinc-200">/workspaces</code> elle-même, mais
          d’un composant importé dans l’ancienne version.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/workspace"
          className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-white transition hover:bg-white/[0.04]"
        >
          <div className="text-sm text-zinc-400">Retour</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            Ouvrir Workspace
          </div>
        </Link>

        <Link
          href="/overview"
          className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-white transition hover:bg-white/[0.04]"
        >
          <div className="text-sm text-zinc-400">Surface</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            Ouvrir Overview
          </div>
        </Link>

        <Link
          href="/settings"
          className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-white transition hover:bg-white/[0.04]"
        >
          <div className="text-sm text-zinc-400">Config</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            Ouvrir Settings
          </div>
        </Link>

        <Link
          href="/policies"
          className="rounded-[24px] border border-white/10 bg-black/20 p-5 text-white transition hover:bg-white/[0.04]"
        >
          <div className="text-sm text-zinc-400">Governance</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">
            Ouvrir Policies
          </div>
        </Link>
      </section>

      <section className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-5">
        <div className="text-sm leading-7 text-amber-100">
          Test temporaire. Ne pas garder cette version comme version finale.
        </div>
      </section>
    </div>
  );
}
