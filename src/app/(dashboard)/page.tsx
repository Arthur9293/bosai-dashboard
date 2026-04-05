import Link from "next/link";
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
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
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
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function rowCardClassName() {
  return "rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.04]";
}

function badgeClassName(
  variant: "default" | "success" | "warning" | "danger" | "info" | "violet" = "default"
) {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300";
}

type CommandStatsCompat = {
  queue?: number;
  queued?: number;
  running?: number;
  retry?: number;
  dead?: number;
};

function getIncidentTitle(incident: IncidentItem) {
  return (
    incident.title ||
    incident.name ||
    incident.error_id ||
    "Untitled incident"
  );
}

function getIncidentStatus(incident: IncidentItem) {
  const direct = String(
    incident.status || incident.statut_incident || ""
  ).trim();

  if (direct) return direct;

  const sla = String(incident.sla_status || "").trim().toLowerCase();
  const remaining =
    typeof incident.sla_remaining_minutes === "number"
      ? incident.sla_remaining_minutes
      : undefined;

  if (sla === "breached") return "Open";
  if (remaining !== undefined && remaining < 0) return "Open";

  return "—";
}

function isOpenIncident(incident: IncidentItem) {
  return getIncidentStatus(incident).toLowerCase() === "open";
}

function isCriticalIncident(incident: IncidentItem) {
  const severity = String(incident.severity || "").toLowerCase();
  return severity === "critical" || severity === "critique";
}

function isWarningIncident(incident: IncidentItem) {
  const severity = String(incident.severity || "").toLowerCase();
  return (
    severity === "warning" ||
    severity === "warn" ||
    severity === "medium" ||
    severity === "moyen"
  );
}

function statusTone(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "open") return badgeClassName("danger");
  if (normalized === "resolved" || normalized === "closed") {
    return badgeClassName("success");
  }
  return badgeClassName("default");
}

function severityTone(severity: string) {
  const normalized = severity.trim().toLowerCase();

  if (normalized === "critical" || normalized === "critique") {
    return badgeClassName("danger");
  }

  if (normalized === "warning" || normalized === "warn") {
    return badgeClassName("warning");
  }

  if (normalized === "medium" || normalized === "moyen") {
    return badgeClassName("warning");
  }

  if (normalized === "high" || normalized === "élevé" || normalized === "eleve") {
    return badgeClassName("violet");
  }

  if (normalized === "low" || normalized === "faible") {
    return badgeClassName("success");
  }

  return badgeClassName("default");
}

function systemStatusTone(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "ok" || normalized === "loaded") {
    return "text-emerald-400";
  }

  if (normalized.includes("warn")) {
    return "text-amber-400";
  }

  return "text-zinc-300";
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
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

  const incidentItems: IncidentItem[] = incidents?.incidents ?? [];

  const openIncidents =
    incidents?.stats?.open ??
    incidentItems.filter((incident) => isOpenIncident(incident)).length;

  const criticalIncidents =
    incidents?.stats?.critical ??
    incidentItems.filter((incident) => isCriticalIncident(incident)).length;

  const warningIncidents =
    incidents?.stats?.warning ??
    incidentItems.filter((incident) => isWarningIncident(incident)).length;

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Overview
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Control tower du système BOSAI.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Health Score</div>
          <div className={`mt-3 text-4xl font-semibold tracking-tight ${healthTone(healthScore)}`}>
            {formatNumber(healthScore)}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={badgeClassName(healthScore >= 80 ? "success" : healthScore >= 50 ? "warning" : "danger")}>
              {healthLabel(healthScore)}
            </span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Total Runs</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatNumber(totalRuns)}
          </div>
          <div className="mt-3 text-sm text-zinc-300">
            Running: {formatNumber(runningRuns)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Queued Commands</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatNumber(queuedCommands)}
          </div>
          <div className="mt-3 text-sm text-zinc-300">
            Running: {formatNumber(runningCommands)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Open Incidents</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatNumber(openIncidents)}
          </div>
          <div className="mt-3 text-sm text-zinc-300">
            Critical: {formatNumber(criticalIncidents)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Event Throughput</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatNumber(processedEvents)}
          </div>
          <div className="mt-3 text-sm text-zinc-300">
            Errors: {formatNumber(eventErrors)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">System Health</div>
          <div className="space-y-3 text-sm">
            <MetricRow
              label="Airtable"
              value={<span className={systemStatusTone("OK")}>OK</span>}
            />
            <MetricRow
              label="Worker"
              value={<span className={systemStatusTone("OK")}>OK</span>}
            />
            <MetricRow
              label="Scheduler"
              value={<span className={systemStatusTone("OK")}>OK</span>}
            />
            <MetricRow
              label="Policies"
              value={<span className={systemStatusTone("Loaded")}>Loaded</span>}
            />
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Command Queue</div>
          <div className="space-y-3 text-sm">
            <MetricRow label="Queued" value={formatNumber(queuedCommands)} />
            <MetricRow label="Running" value={formatNumber(runningCommands)} />
            <MetricRow label="Retry" value={formatNumber(retryCommands)} />
            <MetricRow label="Dead" value={formatNumber(deadCommands)} />
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Event Stream</div>
          <div className="space-y-3 text-sm">
            <MetricRow label="New" value={formatNumber(newEvents)} />
            <MetricRow label="Queued" value={formatNumber(queuedEvents)} />
            <MetricRow label="Processed" value={formatNumber(processedEvents)} />
            <MetricRow label="Errors" value={formatNumber(eventErrors)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className={sectionLabelClassName()}>Live view</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-white">
                Incidents actifs
              </div>
            </div>

            <Link
              href="/incidents"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Voir tout
            </Link>
          </div>

          <div className="space-y-3">
            {incidentItems.slice(0, 5).map((incident) => {
              const incidentTitle = getIncidentTitle(incident);
              const incidentSubline =
                getIncidentStatus(incident) ||
                incident.sla_status ||
                "—";
              const incidentSeverity = incident.severity || "—";
              const incidentStatus = getIncidentStatus(incident);

              return (
                <Link
                  key={incident.id}
                  href={`/incidents/${encodeURIComponent(String(incident.id))}`}
                  className={rowCardClassName()}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className={metaLabelClassName()}>BOSAI Incident</div>
                        <div className="mt-2 break-words text-lg font-semibold tracking-tight text-white">
                          {incidentTitle}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <span className={statusTone(incidentStatus)}>
                          {incidentStatus || "—"}
                        </span>
                        <span className={severityTone(String(incidentSeverity))}>
                          {incidentSeverity || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
                      <div>
                        <div className={metaLabelClassName()}>Status line</div>
                        <div className="mt-1 text-zinc-200">{incidentSubline}</div>
                      </div>

                      <div>
                        <div className={metaLabelClassName()}>Workspace</div>
                        <div className="mt-1 text-zinc-200">
                          {String(incident.workspace_id || incident.workspace || "—")}
                        </div>
                      </div>

                      <div>
                        <div className={metaLabelClassName()}>Severity</div>
                        <div className="mt-1 text-zinc-200">{incidentSeverity || "—"}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {incidentItems.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
                Aucun incident affiché.
              </div>
            )}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Retry / Dead Zone</div>
          <div className="space-y-3 text-sm">
            <MetricRow label="Retry queue" value={formatNumber(retryCommands)} />
            <MetricRow label="Dead commands" value={formatNumber(deadCommands)} />
            <MetricRow label="Warnings" value={formatNumber(warningIncidents)} />
          </div>
        </div>
      </section>
    </div>
  );
}
