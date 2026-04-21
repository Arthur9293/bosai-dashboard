"use client";

type CommandsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CommandsError({
  error,
  reset,
}: CommandsErrorProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-5 md:p-6">
        <div className="text-xs uppercase tracking-[0.22em] text-red-300">
          BOSAI Dashboard
        </div>

        <div className="mt-5">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Commands indisponible
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-300">
            La surface Commands a rencontré une erreur de rendu. Le reste du
            cockpit peut rester sain, mais cette page doit être rechargée ou
            sécurisée.
          </p>
        </div>

        <div className="mt-6 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Message
          </div>
          <div className="mt-2 break-words text-sm text-zinc-100">
            {error?.message || "commands_render_failed"}
          </div>
        </div>

        {error?.digest ? (
          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Digest
            </div>
            <div className="mt-2 break-all text-sm text-zinc-100">
              {error.digest}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Réessayer
          </button>

          <a
            href="/overview"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Retour Overview
          </a>
        </div>
      </section>
    </div>
  );
}
