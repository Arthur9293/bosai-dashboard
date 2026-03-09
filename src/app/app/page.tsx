import {
  fetchRuns,
  fetchCommands,
  fetchHealthScore,
  fetchIncidents,
} from "@/lib/api";

function getHealthTone(score: number) {
  if (score >= 80) {
    return "text-emerald-400";
  }

  if (score >= 50) {
    return "text-orange-300";
  }

  return "text-red-300";
}

function getHealthLabel(score: number) {
  if (score >= 80) {
    return "Stable";
  }

  if (score >= 50) {
    return "À surveiller";
  }

  return "Critique";
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ value }: { value?: string }) {
  const normalized = (value || "unknown").toLowerCase();

  const styles: Record<string, string> = {
    done: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    running: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
    queued: "bg-zinc-500/15 text-zinc-300 border border-white/10",
    queue: "bg-zinc-500/15 text-zinc-300 border border-white/10",
    error: "bg-red-500/15 text-red-300 border border-red-500/20",
    dead: "bg-red-500/15 text-red-300 border border-red-500/20",
    blocked: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
    unsupported: "bg-zinc-500/15 text-zinc-300 border border-white/10",
    ok: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    warning: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
    breached: "bg-red-500/15 text-red-300 border border-red-500/20",
    open: "bg-red-500/15 text-red-300 border border-red-500/20",
    resolved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    closed: "bg-zinc-500/15 text-zinc-300 border border-white/10",
    critical: "bg-red-500/15 text-red-300 border border-red-500/20",
  };

  const className =
    styles[normalized] ||
    "bg-white/5 text-zinc-300 border border-white/10";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {value || "Unknown"}
    </span>
  );
}

export default async function OverviewPage() {
  let runs = null;
  let commands = null;
  let health = null;
  let incidents = null;

  try {
    runs = await fetchRuns();
  } catch {}

  try {
    commands = await fetchCommands();
  } catch {}

  try {
    health = await fetchHealthScore();
  } catch {}

  try {
    incidents = await fetchIncidents();
  } catch {}

  const totalRuns = runs?.count ?? 0;
  const runningRuns = runs?.stats?.running ?? 0;
  const doneRuns = runs?.stats?.done ?? 0;
  const errorRuns = runs?.stats?.error ?? 0;

  const queuedCommands =
    commands?.stats?.queue ?? commands?.stats?.queued ?? 0;
  const runningCommands = commands?.stats?.running ?? 0;
  const errorCommands = commands?.stats?.error ?? 0;
  const doneCommands = commands?.stats?.done ?? 0;

  const healthScore = health?.score ?? 0;
  const healthIssues = Array.isArray(health?.issues) ? health.issues : [];

  const incidentRows = incidents?.incidents ?? [];
  const incidentCount = incidents?.count ?? incidentRows.length;

  const recentRuns = Array.isArray(runs?.runs) ? runs.runs.slice(0, 5) : [];
  const recentCommands = Array.isArray(commands?.commands)
    ? commands.commands.slice(0, 5)
    : [];
  const recentIncidents = Array.isArray(incidentRows)
    ? incidentRows.slice(0, 5)
    : [];

  const systemSignals: string[] = [];

  systemSignals.push(`Health score actuel : ${healthScore}/100`);

  if (queuedCommands > 0) {
    systemSignals.push(`${queuedCommands} commande(s) en file d’attente`);
  } else {
    systemSignals.push("Aucune commande en attente");
  }

  if (runningRuns > 0) {
    systemSignals.push(`${runningRuns} run(s) en cours`);
  } else {
    systemSignals.push("Aucun run en cours");
  }

  if (incidentCount > 0) {
    systemSignals.push(`${incidentCount} incident(s) ouvert(s)`);
  } else {
    systemSignals.push("Aucun incident ouvert");
  }

  if (errorCommands > 0) {
    systemSignals.push(`${errorCommands} commande(s) en erreur`);
  }

  if (errorRuns > 0) {
    systemSignals.push(`${errorRuns} run(s) en erreur`);
  }

  const healthTone = getHealthTone(healthScore);
  const healthLabel = getHealthLabel(healthScore);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              BOSAI Dashboard V1.5
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Overview
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Cockpit principal du workspace BOSAI. Vue consolidée du health
              score, des runs, des commandes et des incidents opérationnels.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Workspace
              </p>
              <p className="mt-2 text-sm font-medium text-white">Production</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Health state
              </p>
              <p className={`mt-2 text-sm font-medium ${healthTone}`}>
                {healthLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Signals
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {systemSignals.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">System Health</p>
          <p className={`mt-3 text-3xl font-semibold ${healthTone}`}>
            {healthScore}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Score global BOSAI</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Total Runs</p>
          <p className="mt-3 text-3xl font-semibold text-white">{totalRuns}</p>
          <p className="mt-2 text-xs text-zinc-500">Runs observés</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Running Runs</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {runningRuns}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Exécution active</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Commands Queue</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {queuedCommands}
          </p>
          <p className="mt-2 text-xs text-zinc-500">En attente de traitement</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Command Errors</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {errorCommands}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Erreurs commandes</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Open Incidents</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {incidentCount}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Incidents visibles</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Recent Runs</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Derniers runs remontés par le worker.
            </p>
          </div>

          <div className="px-5 py-4">
            {recentRuns.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun run disponible.</p>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run, index) => (
                  <div
                    key={run.id ?? run.run_id ?? `run-${index}`}
                    className="rounded-xl border border-white/10 bg-black/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {run.capability || "Unknown capability"}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {run.run_id || run.id || "—"}
                        </p>
                      </div>

                      <StatusBadge value={run.status} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>{run.worker || "—"}</span>
                      <span>{formatDate(run.started_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Recent Commands</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Activité récente de la file d’exécution.
            </p>
          </div>

          <div className="px-5 py-4">
            {recentCommands.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Aucune commande disponible.
              </p>
            ) : (
              <div className="space-y-3">
                {recentCommands.map((command, index) => (
                  <div
                    key={command.id ?? `command-${index}`}
                    className="rounded-xl border border-white/10 bg-black/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {command.capability || "Unknown capability"}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {command.id || "—"}
                        </p>
                      </div>

                      <StatusBadge value={command.status} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>Priority {command.priority ?? "—"}</span>
                      <span>{formatDate(command.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">System Signals</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Lecture synthétique de l’état BOSAI.
            </p>
          </div>

          <div className="px-5 py-4">
            <div className="space-y-3">
              {systemSignals.map((signal, index) => (
                <div
                  key={`${signal}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-sm text-zinc-300"
                >
                  {signal}
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Health Issues
              </p>

              {healthIssues.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">
                  Aucun signal remonté par /health/score.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {healthIssues.slice(0, 6).map((issue, index) => (
                    <div
                      key={`${issue}-${index}`}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                    >
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">
              Operational Snapshot
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Vue instantanée du système.
            </p>
          </div>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Runs Done
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {doneRuns}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Runs Error
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {errorRuns}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Commands Running
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {runningCommands}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Commands Done
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {doneCommands}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Zone prête pour les incidents réels BOSAI.
            </p>
          </div>

          <div className="px-5 py-4">
            {recentIncidents.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Aucun incident récent pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((incident, index) => (
                  <div
                    key={incident.id ?? `${incident.title}-${index}`}
                    className="rounded-xl border border-white/10 bg-black/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {incident.title || "Untitled incident"}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {incident.id || "—"}
                        </p>
                      </div>

                      <StatusBadge value={incident.status} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>{incident.source || "—"}</span>
                      <span>{formatDate(incident.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
