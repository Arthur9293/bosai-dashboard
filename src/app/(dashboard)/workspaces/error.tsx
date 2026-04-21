"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WorkspacesErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-5 md:p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-red-300/80">
          Workspaces error
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          La page Workspaces a rencontré une erreur
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-red-100/85">
          {error?.message?.trim()
            ? error.message
            : "Une erreur inattendue est survenue pendant le rendu de la page Workspaces."}
        </p>

        {error?.digest ? (
          <p className="mt-2 text-xs text-red-200/70">
            Digest: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
          >
            Réessayer
          </button>

          <a
            href="/workspace"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            Retour au workspace
          </a>

          <a
            href="/overview"
            className="inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18"
          >
            Ouvrir Overview
          </a>
        </div>
      </div>
    </div>
  );
}
