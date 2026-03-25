import { fetchRuns } from "../../../lib/api";
import { PageHeader } from "../../../components/ui/page-header";

type RunItem = {
  id: string;
  run_id?: string;
  worker?: string;
  capability?: string;
  status?: string;
  priority?: number;
  started_at?: string;
  finished_at?: string;
  dry_run?: boolean | null;
};

type RunStats = {
  running?: number;
  done?: number;
  error?: number;
  unsupported?: number;
  other?: number;
};

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toString() : "0";
}

function tone(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "done") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "error") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (s === "unsupported") {
    return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-zinc-800 bg-zinc-900 p-6";
}

export default async function RunsPage() {
  let data: any = null;

  try {
    data = await fetchRuns();
  } catch {
    data = null;
  }

  const runs: RunItem[] = data?.runs ?? [];
  const stats = (data?.stats ?? {}) as RunStats;

  const totalRuns = data?.count ?? runs.length ?? 0;
  const runningCount = stats.running ?? 0;
  const doneCount = stats.done ?? 0;
  const errorCount = stats.error ?? 0;
  const unsupportedCount = stats.unsupported ?? 0;
  const otherCount = stats.other ?? 0;

  const visibleRuns = [...runs]
    .sort(
      (a, b) =>
        new Date(b.started_at || 0).getTime() -
        new Date(a.started_at || 0).getTime()
    )
    .slice(0, 50);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Runs"
        description="Historique d’exécution des capacités BOSAI. Cette vue affiche les runs, statuts, workers et signaux d’exécution."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Total runs</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(totalRuns)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Running</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">
            {formatNumber(runningCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">
            {formatNumber(doneCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Error</div>
          <div className="mt-3 text-4xl font-semibold text-red-300">
            {formatNumber(errorCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Unsupported</div>
          <div className="mt-3 text-4xl font-semibold text-zinc-300">
            {formatNumber(unsupportedCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Other</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(otherCount)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">System runs</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Historique récent des exécutions BOSAI.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            {visibleRuns.length} visible(s)
          </div>
        </div>

        {visibleRuns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
            Aucun run visible pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      BOSAI RUN
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="break-all text-base font-semibold text-white">
                        {run.capability || "Unknown capability"}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                          run.status
                        )}`}
                      >
                        {(run.status || "unknown").toUpperCase()}
                      </span>

                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                        {run.dry_run ? "DRY RUN" : "LIVE"}
                      </span>
                    </div>

                    <div className="break-all text-sm text-zinc-400">
                      ID: <span className="text-zinc-300">{run.id}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        Run ID:{" "}
                        <span className="break-all text-zinc-300">
                          {run.run_id || "—"}
                        </span>
                      </div>

                      <div>
                        Worker:{" "}
                        <span className="text-zinc-300">
                          {run.worker || "—"}
                        </span>
                      </div>

                      <div>
                        Priority:{" "}
                        <span className="text-zinc-300">
                          {run.priority ?? "—"}
                        </span>
                      </div>

                      <div>
                        Started:{" "}
                        <span className="text-zinc-300">
                          {formatDate(run.started_at)}
                        </span>
                      </div>

                      <div>
                        Finished:{" "}
                        <span className="text-zinc-300">
                          {formatDate(run.finished_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 xl:min-w-[120px] xl:text-right">
                    EXECUTION SIGNAL
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
