import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";
import { fetchRuns } from "../../lib/api";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function badgeClasses(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "done" || normalized === "success") {
    return "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  }

  if (normalized === "running") {
    return "border border-amber-500/30 bg-amber-500/15 text-amber-300";
  }

  if (normalized === "error" || normalized === "failed") {
    return "border border-rose-500/30 bg-rose-500/15 text-rose-300";
  }

  return "border border-white/10 bg-white/5 text-white/70";
}

export default async function RunsPage() {
  let data: Awaited<ReturnType<typeof fetchRuns>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchRuns();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Erreur inconnue pendant le chargement des runs.";
  }

  const runs = data?.runs ?? [];
  const stats = data?.stats;

  return (
    <AppShell title="Runs">
      <PageHeader
        title="Runs"
        description="Journal d’exécution runtime."
      />

      {error ? (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <h3 className="text-lg font-semibold text-rose-200">
            Erreur de chargement
          </h3>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
          <p className="mt-3 text-xs text-rose-100/60">
            Vérifie NEXT_PUBLIC_WORKER_URL et l’endpoint /runs du worker.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Total</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {data?.count ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">runs</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Running</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {stats?.running ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">en cours</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Done</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {stats?.done ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">terminés</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Error</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {stats?.error ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">en erreur</div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Recent Runs ({runs.length})
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  Dernières exécutions remontées par le worker.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                {data?.count ?? 0} run(s)
              </div>
            </div>

            {runs.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/60">
                Aucun run trouvé.
              </div>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <article
                    key={run.id}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-white">
                          {run.capability || "Run sans capability"}
                        </div>

                        <div className="mt-1 text-sm text-white/45">
                          Worker: {run.worker || "—"}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(
                            run.status
                          )}`}
                        >
                          {run.status || "Unknown"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <div className="text-white/35">Run ID</div>
                        <div className="mt-1 break-all">{run.run_id || "—"}</div>
                      </div>

                      <div>
                        <div className="text-white/35">Started</div>
                        <div className="mt-1">{formatDate(run.started_at)}</div>
                      </div>

                      <div>
                        <div className="text-white/35">Finished</div>
                        <div className="mt-1">{formatDate(run.finished_at)}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
