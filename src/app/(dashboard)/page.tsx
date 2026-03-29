import {
  fetchCommands,
  fetchEvents,
  fetchHealthScore,
  fetchIncidents,
  fetchRuns,
  type IncidentItem,
  type HealthScoreResponse,
  type RunsResponse,
  type CommandsResponse,
  type EventsResponse,
  type IncidentsResponse,
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

type CommandStatsCompat = {
  queue?: number;
  queued?: number;
  running?: number;
  retry?: number;
  dead?: number;
};

function getIncidentTitle(incident: IncidentItem) {
  return incident.title || incident.name || incident.error_id || "Untitled incident";
}

function getIncidentStatus(incident: IncidentItem) {
  return incident.status || incident.statut_incident || "—";
}

export default async function OverviewPage() {
  let health: HealthScoreResponse | null = null;
  let runs: RunsResponse | null = null;
  let commands: CommandsResponse | null = null;
  let events: EventsResponse | null = null;
  let incidents: IncidentsResponse | null = null;

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

  const commandStats = commands?.stats as CommandStatsCompat | undefined;
  const queuedCommands = commandStats?.queue ?? commandStats?.queued ?? 0;
  const runningCommands = commandStats?.running ?? 0;
  const retryCommands = commandStats?.retry ?? 0;
  const deadCommands = commandStats?.dead ?? 0;

  const newEvents = events?.stats?.new ?? 0;
  const queuedEvents = events?.stats?.queued ?? 0;
  const processedEvents = events?.stats?.processed ?? 0;
  const eventErrors = events?.stats?.error ?? 0;

  const openIncidents = incidents?.stats?.open ?? 0;
  const criticalIncidents = incidents?.stats?.critical ?? 0;
  const warningIncidents = incidents?.stats?.warning ?? 0;

  const incidentItems: IncidentItem[] = incidents?.incidents ?? [];

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          Control tower du système BOSAI.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-1`}>
          <div className="mb-4 text-lg font-medium">System Health</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Airtable</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Worker</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Scheduler</span>
              <span className="text-emerald-400">OK</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Policies</span>
              <span className="text-emerald-400">Loaded</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium">Command Queue</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Queued</span>
              <span>{formatNumber(queuedCommands)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Running</span>
              <span>{formatNumber(runningCommands)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Retry</span>
              <span>{formatNumber(retryCommands)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Dead</span>
              <span>{formatNumber(deadCommands)}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium">Event Stream</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">New</span>
              <span>{formatNumber(newEvents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Queued</span>
              <span>{formatNumber(queuedEvents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Processed</span>
              <span>{formatNumber(processedEvents)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Errors</span>
              <span>{formatNumber(eventErrors)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium">Incidents actifs</div>

          <div className="space-y-3 text-sm">
            {incidentItems.slice(0, 5).map((incident) => {
              const incidentTitle = getIncidentTitle(incident);
              const incidentSubline =
                incident.sla_status || getIncidentStatus(incident) || "—";
              const incidentSeverity = incident.severity || "—";
              const incidentStatus = getIncidentStatus(incident);

              return (
                <div
                  key={incident.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{incidentTitle}</div>
                    <div className="mt-1 text-zinc-500">{incidentSubline}</div>
                  </div>

                  <div className="text-left text-zinc-400 sm:text-right">
                    <div>{incidentSeverity}</div>
                    <div>{incidentStatus}</div>
                  </div>
                </div>
              );
            })}

            {incidentItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                Aucun incident affiché.
              </div>
            )}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium">Retry / Dead Zone</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Retry queue</span>
              <span>{formatNumber(retryCommands)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Dead commands</span>
              <span>{formatNumber(deadCommands)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Warnings</span>
              <span>{formatNumber(warningIncidents)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
