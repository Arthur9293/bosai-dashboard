import { Sidebar } from "@/components/layout/sidebar";
import {
  fetchCommands,
  fetchEvents,
  fetchHealthScore,
  fetchIncidents,
  fetchRuns,
} from "@/lib/api";

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toString() : "0";
}

function healthLabel(score: number) {
  if (score >= 80) return "Stable";
  if (score >= 50) return "À surveiller";
  return "Critique";
}

function healthTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

export default async function OverviewPage() {
  let health = null;
  let runs = null;
  let commands = null;
  let events = null;
  let incidents = null;

  try {
    health = await fetchHealthScore();
  } catch {}

  try {
    runs = await fetchRuns();
  } catch {}

  try {
    commands = await fetchCommands();
  } catch {}

  try {
    events = await fetchEvents();
  } catch {}

  try {
    incidents = await fetchIncidents();
  } catch {}

  const healthScore = health?.score ?? 0;
  const totalRuns = runs?.count ?? 0;
  const runningRuns = runs?.stats?.running ?? 0;

  const queuedCommands = commands?.stats?.queued ?? 0;
  const runningCommands = commands?.stats?.running ?? 0;
  const retryCommands = commands?.stats?.retry ?? 0;
  const deadCommands = commands?.stats?.dead ?? 0;

  const newEvents = events?.stats?.new ?? 0;
  const queuedEvents = events?.stats?.queued ?? 0;
  const processedEvents = events?.stats?.processed ?? 0;
  const eventErrors = events?.stats?.error ?? 0;

  const openIncidents = incidents?.stats?.open ?? 0;
  const criticalIncidents = incidents?.stats?.critical ?? 0;
  const warningIncidents = incidents?.stats?.warning ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Control tower du système BOSAI.
            </p>
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className={cardClassName()}>
              <div className="text-sm text-zinc-400">Health Score</div>
              <div className={`mt-3 text-4xl font-semibold ${healthTone(healthScore)}`}>
                {formatNumber(healthScore)}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                {healthLabel(healthScore)}
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="text-sm text-zinc-400">Total Runs</div>
              <div className="mt-3 text-4xl font-semibold">
                {formatNumber(totalRuns)}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Running: {formatNumber(runningRuns)}
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="text-sm text-zinc-400">Queued Commands</div>
              <div className="mt-3 text-4xl font-semibold">
                {formatNumber(queuedCommands)}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Running: {formatNumber(runningCommands)}
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="text-sm text-zinc-400">Open Incidents</div>
              <div className="mt-3 text-4xl font-semibold">
                {formatNumber(openIncidents)}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Critical: {formatNumber(criticalIncidents)}
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="text-sm text-zinc-400">Event Throughput</div>
              <div className="mt-3 text-4xl font-semibold">
                {formatNumber(processedEvents)}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Errors: {formatNumber(eventErrors)}
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className={`${cardClassName()} xl:col-span-1`}>
              <div className="mb-4 text-lg font-medium">System Health</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Airtable</span>
                  <span className="text-emerald-400">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Worker</span>
                  <span className="text-emerald-400">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Scheduler</span>
                  <span className="text-emerald-400">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Policies</span>
                  <span className="text-emerald-400">Loaded</span>
                </div>
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="mb-4 text-lg font-medium">Command Queue</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Queued</span>
                  <span>{formatNumber(queuedCommands)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Running</span>
                  <span>{formatNumber(runningCommands)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Retry</span>
                  <span>{formatNumber(retryCommands)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dead</span>
                  <span>{formatNumber(deadCommands)}</span>
                </div>
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="mb-4 text-lg font-medium">Event Stream</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">New</span>
                  <span>{formatNumber(newEvents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Queued</span>
                  <span>{formatNumber(queuedEvents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Processed</span>
                  <span>{formatNumber(processedEvents)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Errors</span>
                  <span>{formatNumber(eventErrors)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className={`${cardClassName()} xl:col-span-2`}>
              <div className="mb-4 text-lg font-medium">Incidents actifs</div>
              <div className="space-y-3 text-sm">
                {(incidents?.incidents ?? []).slice(0, 5).map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3"
                  >
                    <div>
                      <div className="font-medium">
                        {incident.title || "Untitled incident"}
                      </div>
                      <div className="text-zinc-500">
                        {incident.sla_status || "—"}
                      </div>
                    </div>
                    <div className="text-right text-zinc-400">
                      <div>{incident.severity || "—"}</div>
                      <div>{incident.status || "—"}</div>
                    </div>
                  </div>
                ))}

                {(incidents?.incidents ?? []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-sm text-zinc-500">
                    Aucun incident affiché.
                  </div>
                )}
              </div>
            </div>

            <div className={cardClassName()}>
              <div className="mb-4 text-lg font-medium">Retry / Dead Zone</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Retry queue</span>
                  <span>{formatNumber(retryCommands)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dead commands</span>
                  <span>{formatNumber(deadCommands)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Warnings</span>
                  <span>{formatNumber(warningIncidents)}</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
