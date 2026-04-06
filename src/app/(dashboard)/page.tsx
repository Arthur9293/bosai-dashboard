import Link from "next/link";
import type { ReactNode } from "react";
import {
  fetchCommands,
  fetchEvents,
  fetchHealthScore,
  fetchIncidents,
  fetchRuns,
  fetchSla,
  type IncidentItem,
  type HealthScoreResponse,
  type RunsResponse,
  type CommandsResponse,
  type EventsResponse,
  type IncidentsResponse,
  type SlaResponse,
} from "@/lib/api";

function formatNumber(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function healthLabel(score: number, rawStatus?: string): string {
  const normalized = String(rawStatus || "").trim().toLowerCase();

  if (normalized && normalized !== "unknown") {
    return normalized.toUpperCase();
  }

  if (score >= 80) return "STABLE";
  if (score >= 50) return "À SURVEILLER";
  return "CRITIQUE";
}

function healthTone(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function rowCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.04]";
}

function badgeClassName(
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "violet" = "default"
): string {
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
  error?: number;
  done?: number;
};

function getIncidentTitle(incident: IncidentItem): string {
  return incident.title || incident.name || incident.error_id || "Untitled incident";
}

function getIncidentStatus(incident: IncidentItem): string {
  const direct = String(incident.status || incident.statut_incident || "").trim();
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

function isOpenIncident(incident: IncidentItem): boolean {
  return getIncidentStatus(incident).toLowerCase() === "open";
}

function isEscalatedIncident(incident: IncidentItem): boolean {
  return getIncidentStatus(incident).toLowerCase() === "escalated";
}

function isCriticalIncident(incident: IncidentItem): boolean {
  const severity = String(incident.severity || "").toLowerCase();
  return severity === "critical" || severity === "critique";
}

function isWarningIncident(incident: IncidentItem): boolean {
  const severity = String(incident.severity || "").toLowerCase();
  return (
    severity === "warning" ||
    severity === "warn" ||
    severity === "medium" ||
    severity === "moyen"
  );
}

function statusTone(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (normalized === "open") return badgeClassName("danger");
  if (normalized === "escalated") return badgeClassName("warning");
  if (normalized === "resolved" || normalized === "closed") {
    return badgeClassName("success");
  }

  return badgeClassName("default");
}

function severityTone(severity: string): string {
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

function systemStatusTone(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "ok" || normalized === "loaded" || normalized === "healthy") {
    return "text-emerald-400";
  }

  if (normalized.includes("warn")) {
    return "text-amber-400";
  }

  if (normalized === "error" || normalized === "critical") {
    return "text-red-400";
  }

  return "text-zinc-300";
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
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
  let sla: SlaResponse | null = null;

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

  try {
    sla = await fetchSla(100);
  } catch {}

  const healthScore = health?.score ?? 0;
  const healthStatus = health?.status ?? "";

  const totalRuns = runs?.count ?? 0;
  const runningRuns = runs?.stats?.running ?? 0;
  const doneRuns = runs?.stats?.done ?? 0;
  const errorRuns = runs?.stats?.error ?? 0;

  const commandStats = commands?.stats as CommandStatsCompat | undefined;
  const queuedCommands = commandStats?.queue ?? commandStats?.queued ?? 0;
  const runningCommands = commandStats?.running ?? 0;
  const retryCommands = commandStats?.retry ?? 0;
  const deadCommands = commandStats?.dead ?? 0;
  const failedCommands = (commandStats?.error ?? 0) + deadCommands;
  const doneCommands = commandStats?.done ?? 0;
  const totalCommands = commands?.count ?? 0;
  const activeCommands = queuedCommands + runningCommands + retryCommands;

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

  const activeIncidentItems = incidentItems.filter(
    (incident) => isOpenIncident(incident) || isEscalatedIncident(incident)
  );

  const slaStats = sla?.stats ?? {};
  const slaItems = Array.isArray(sla?.incidents) ? sla.incidents : [];
  const slaOk = slaStats.ok ?? 0;
  const slaWarning = slaStats.warning ?? 0;
  const slaBreached = slaStats.breached ?? 0;
  const slaEscalated = slaStats.escalated ?? 0;
  const slaQueued = slaStats.escalation_queued ?? 0;
  const slaUnknown = slaStats.unknown ?? 0;
  const totalSlaSignals = slaItems.length;
  const criticalSlaSignals = slaBreached + slaEscalated;

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Overview
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Vue d’ensemble du control plane BOSAI avec santé système,
            exécutions, commands, events et signaux SLA.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Health score</div>
          <div
            className={`mt-3 text-5xl font-semibold tracking-tight ${healthTone(
              healthScore
            )}`}
          >
            {formatNumber(healthScore)}
          </div>
          <div className="mt-4">
            <span
              className={badgeClassName(
                healthScore >= 80
                  ? "success"
                  : healthScore >= 50
                    ? "warning"
                    : "danger"
              )}
            >
              {healthLabel(healthScore, healthStatus)}
            </span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Runs actifs</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight text-sky-300">
            {formatNumber(runningRuns)}
          </div>
          <div className="mt-4 text-sm text-zinc-300">
            Total runs: {formatNumber(totalRuns)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Commands actives</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight text-violet-300">
            {formatNumber(activeCommands)}
          </div>
          <div className="mt-4 text-sm text-zinc-300">
            Total commands: {formatNumber(totalCommands)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">SLA critiques</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight text-rose-300">
            {formatNumber(criticalSlaSignals)}
          </div>
          <div className="mt-4 text-sm text-zinc-300">
            Total signaux SLA: {formatNumber(totalSlaSignals)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">System health</div>
          <div className="space-y-3 text-sm">
            <MetricRow
              label="Health status"
              value={
                <span
                  className={systemStatusTone(
                    healthLabel(healthScore, healthStatus)
                  )}
                >
                  {healthLabel(healthScore, healthStatus)}
                </span>
              }
            />
            <MetricRow
              label="Worker"
              value={<span className={systemStatusTone("healthy")}>Healthy</span>}
            />
            <MetricRow
              label="Airtable"
              value={<span className={systemStatusTone("ok")}>OK</span>}
            />
            <MetricRow
              label="Policies"
              value={<span className={systemStatusTone("loaded")}>Loaded</span>}
            />
          </div>

          <div className="mt-5">
            <Link
              href="/runs"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Aller aux runs
            </Link>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Runs snapshot</div>
          <div className="space-y-3 text-sm">
            <MetricRow label="Running" value={formatNumber(runningRuns)} />
            <MetricRow label="Done" value={formatNumber(doneRuns)} />
            <MetricRow label="Error" value={formatNumber(errorRuns)} />
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Commands snapshot</div>
          <div className="space-y-3 text-sm">
            <MetricRow label="Queued" value={formatNumber(queuedCommands)} />
            <MetricRow label="Running" value={formatNumber(runningCommands)} />
            <MetricRow label="Retry" value={formatNumber(retryCommands)} />
            <MetricRow label="Done" value={formatNumber(doneCommands)} />
            <MetricRow label="Failed/Dead" value={formatNumber(failedCommands)} />
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Events snapshot</div>
          <div className="space-y-3 text-sm">
            <MetricRow label="New" value={formatNumber(newEvents)} />
            <MetricRow label="Queued" value={formatNumber(queuedEvents)} />
            <MetricRow label="Processed" value={formatNumber(processedEvents)} />
            <MetricRow label="Errors" value={formatNumber(eventErrors)} />
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className={sectionLabelClassName()}>SLA snapshot</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              État SLA
            </div>
          </div>

          <div className="text-sm text-zinc-400">
            {formatNumber(totalSlaSignals)} signal(s)
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">OK</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
              {formatNumber(slaOk)}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Warning</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-300">
              {formatNumber(slaWarning)}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Breached</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-red-300">
              {formatNumber(slaBreached)}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Escalated</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-rose-300">
              {formatNumber(slaEscalated)}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Queued</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-violet-300">
              {formatNumber(slaQueued)}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Unknown</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-300">
              {formatNumber(slaUnknown)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href="/sla"
            className="inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Ouvrir la vue SLA
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className={sectionLabelClassName()}>Quick navigation</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
                Vues principales
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/flows"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Flows
            </Link>
            <Link
              href="/commands"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Commands
            </Link>
            <Link
              href="/events"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Events
            </Link>
            <Link
              href="/incidents"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Incidents
            </Link>
            <Link
              href="/runs"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Runs
            </Link>
            <Link
              href="/sla"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir SLA
            </Link>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className={sectionLabelClassName()}>Live view</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
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
            {activeIncidentItems.slice(0, 5).map((incident) => {
              const incidentTitle = getIncidentTitle(incident);
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

                    <div className="grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                      <div>
                        <div className={metaLabelClassName()}>Workspace</div>
                        <div className="mt-1 text-zinc-200">
                          {String(incident.workspace_id || incident.workspace || "—")}
                        </div>
                      </div>

                      <div>
                        <div className={metaLabelClassName()}>SLA</div>
                        <div className="mt-1 text-zinc-200">
                          {String(incident.sla_status || "—")}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {activeIncidentItems.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
                Aucun incident actif affiché.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Open</div>
              <div className="mt-2 text-2xl font-semibold text-red-300">
                {formatNumber(openIncidents)}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Critical</div>
              <div className="mt-2 text-2xl font-semibold text-rose-300">
                {formatNumber(criticalIncidents)}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Warning</div>
              <div className="mt-2 text-2xl font-semibold text-amber-300">
                {formatNumber(warningIncidents)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
