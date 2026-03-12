import { fetchCommands } from "@/lib/api";

function statusTone(status?: string): string {
  const value = (status || "").toLowerCase();

  if (value === "done") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (value === "running") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (value === "queued" || value === "queue") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (value === "retry") {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }

  if (value === "blocked") {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }

  if (value === "unsupported" || value === "dead" || value === "error") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-zinc-700 bg-zinc-900/70 text-zinc-300";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatRetry(retryCount?: number | null, retryMax?: number | null): string {
  if (retryCount == null && retryMax == null) return "—";
  return `${retryCount ?? 0}/${retryMax ?? "—"}`;
}

export default async function CommandsPage() {
  let data = null;
  let errorMessage = "";

  try {
    data = await fetchCommands(12);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Impossible de charger les commandes.";
  }

  const stats = data?.stats ?? {};
  const commands = data?.commands ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-zinc-800 bg-[#050816] px-6 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:px-8 md:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.28em] text-emerald-300">
              Commands V2
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Commands
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg">
              File d’exécution BOSAI. Vue opérationnelle des commandes, de leur
              état, de leur priorité et du cycle de retry.
            </p>
          </div>

          <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-black/20 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Total visible
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {data?.count ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-black/20 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Source
              </div>
              <div className="mt-3 text-sm text-zinc-300">
                {data?.ok ? "Worker connecté" : "Lecture indisponible"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="text-sm text-zinc-400">Queued</div>
            <div className="mt-3 text-5xl font-semibold text-white">
              {stats.queued ?? 0}
            </div>
            <div className="mt-3 text-sm text-zinc-500">En attente d’exécution</div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="text-sm text-zinc-400">Running</div>
            <div className="mt-3 text-5xl font-semibold text-white">
              {stats.running ?? 0}
            </div>
            <div className="mt-3 text-sm text-zinc-500">Commandes actives</div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="text-sm text-zinc-400">Done</div>
            <div className="mt-3 text-5xl font-semibold text-white">
              {stats.done ?? 0}
            </div>
            <div className="mt-3 text-sm text-zinc-500">Exécutions terminées</div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="text-sm text-zinc-400">Errors / Dead</div>
            <div className="mt-3 text-5xl font-semibold text-white">
              {(stats.error ?? 0) + (stats.dead ?? 0)}
            </div>
            <div className="mt-3 text-sm text-zinc-500">Échecs visibles</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            Retry
          </div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {stats.retry ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            Blocked
          </div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {stats.blocked ?? 0}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            Unsupported
          </div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {stats.unsupported ?? 0}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/50 p-5 md:p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-white">Recent Commands</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Dernières commandes remontées par le worker BOSAI.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : commands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-6 text-sm text-zinc-500">
            Aucune commande visible pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {commands.map((command) => (
              <article
                key={command.id}
                className="rounded-3xl border border-zinc-800 bg-black/20 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-medium text-white">
                        {command.capability || "Unknown capability"}
                      </h3>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusTone(
                          command.status
                        )}`}
                      >
                        {command.status || "Unknown"}
                      </span>

                      {command.is_locked ? (
                        <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
                          Locked
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 break-all font-mono text-sm text-zinc-500">
                      {command.idempotency_key || command.id}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Priority
                      </div>
                      <div className="mt-2 text-lg font-medium text-white">
                        {command.priority ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Retry
                      </div>
                      <div className="mt-2 text-lg font-medium text-white">
                        {formatRetry(command.retry_count, command.retry_max)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Scheduled
                      </div>
                      <div className="mt-2 text-sm text-zinc-300">
                        {formatDate(command.scheduled_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Next retry
                      </div>
                      <div className="mt-2 text-sm text-zinc-300">
                        {formatDate(command.next_retry_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Locked by
                      </div>
                      <div className="mt-2 text-sm text-zinc-300">
                        {command.locked_by || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Record ID
                      </div>
                      <div className="mt-2 break-all font-mono text-sm text-zinc-400">
                        {command.id}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
