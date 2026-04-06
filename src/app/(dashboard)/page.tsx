import Link from "next/link";
import {
  fetchCommands,
  fetchEvents,
  fetchHealthScore,
  fetchIncidents,
  fetchRuns,
  fetchSla,
} from "@/lib/api";

type IncidentItem = NonNullable<
  Awaited<ReturnType<typeof fetchIncidents>>["incidents"]
>[number];

type SlaItem = NonNullable<
  Awaited<ReturnType<typeof fetchSla>>["incidents"]
>[number];

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

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
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

function formatNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toText(item, "");
      if (candidate) return candidate;
    }
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function healthLabel(score: number) {
  if (score >= 80) return "STABLE";
  if (score >= 50) return "À SURVEILLER";
  return "CRITIQUE";
}

function healthTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function healthBadge(score: number) {
  if (score >= 80) return badgeClassName("success");
  if (score >= 50) return badgeClassName("warning");
  return badgeClassName("danger");
}

function sourceStateBadge(loaded: boolean, level: "ok" | "warn" | "error" = "ok") {
  if (!loaded) return badgeClassName("danger");
  if (level === "warn") return badgeClassName("warning");
  if (level === "error") return badgeClassName("danger");
  return badgeClassName("success");
}

function sourceStateLabel(loaded: boolean, okLabel = "LIVE") {
  return loaded ? okLabel : "UNAVAILABLE";
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function getIncidentTitle(incident: IncidentItem) {
  return (
    toText(incident.title) ||
    toText(incident.name) ||
    toText(incident.error_id) ||
    "Untitled incident"
  );
}

function getIncidentStatus(incident: IncidentItem) {
  const direct = toText(incident.status) || toText(incident.statut_incident);
  if (direct) return direct;

  const sla = toText(incident.sla_status).toLowerCase();
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

function isEscalatedIncident(incident: IncidentItem) {
  return getIncidentStatus(incident).toLowerCase() === "escalated";
}

function isCriticalIncident(incident: IncidentItem) {
  const severity = toText(incident.severity).toLowerCase();
  return severity === "critical" || severity === "critique";
}

function isWarningIncident(incident: IncidentItem) {
  const severity = toText(incident.severity).toLowerCase();
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
  if (normalized === "escalated") return badgeClassName("warning");
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

  if (
    normalized === "warning" ||
    normalized === "warn" ||
    normalized === "medium" ||
    normalized === "moyen"
  ) {
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

function getSlaTitle(item: SlaItem) {
  return (
    toText(item.title) ||
    toText(item.name) ||
    toText(item.category) ||
    toText(item.reason) ||
    (item.id ? `SLA ${item.id}` : "SLA item")
  );
}

function getSlaStatusNormalized(item: SlaItem) {
  const raw = toText(item.sla_status).toLowerCase();

  if (["ok"].includes(raw)) return "ok";
  if (["warning", "warn"].includes(raw)) return "warning";
  if (["breached", "breach"].includes(raw)) return "breached";
  if (["escalated", "escalade", "escaladé"].includes(raw)) return "escalated";
  if ((item as Record<string, unknown>).escalated === true) return "escalated";

  return "unknown";
}

function getSlaTone(item: SlaItem) {
  const status = getSlaStatusNormalized(item);

  if (status === "ok") return badgeClassName("success");
  if (status === "warning") return badgeClassName("warning");
  if (status === "breached") return badgeClassName("danger");
  if (status === "escalated") return badgeClassName("danger");

  return badgeClassName("default");
}

function getSlaLastCheck(item: SlaItem) {
  return (
    toText((item as Record<string, unknown>).last_sla_check) ||
    toText(item.updated_at) ||
    toText(item.created_at) ||
    ""
  );
}

export default async function OverviewPage() {
  let health = null as Awaited<ReturnType<typeof fetchHealthScore>> | null;
  let runs = null as Awaited<ReturnType<typeof fetchRuns>> | null;
  let commands = null as Awaited<ReturnType<typeof fetchCommands>> | null;
  let events = null as Awaited<ReturnType<typeof fetchEvents>> | null;
  let incidents = null as Awaited<ReturnType<typeof fetchIncidents>> | null;
  let sla = null as Awaited<ReturnType<typeof fetchSla>> | null;

  try {
    health = await fetchHealthScore();
  } catch {}

  try {
    runs = await fetchRuns();
  } catch {}

  try {
    commands = await fetchCommands(100);
  } catch {}

  try {
    events = await fetchEvents(100);
  } catch {}

  try {
    incidents = await fetchIncidents(100);
  } catch {}

  try {
    sla = await fetchSla(100);
  } catch {}

  const healthScore = health?.score ?? 0;
  const resolvedHealthLabel = toText(health?.status).toUpperCase() || healthLabel(healthScore);

  const runsLoaded = Boolean(runs);
  const commandsLoaded = Boolean(commands);
  const eventsLoaded = Boolean(events);
  const incidentsLoaded = Boolean(incidents);
  const slaLoaded = Boolean(sla);

  const totalRuns = runs?.count ?? 0;
  const runningRuns = runs?.stats?.running ?? 0;
  const doneRuns = runs?.stats?.done ?? 0;
  const errorRuns = runs?.stats?.error ?? 0;

  const commandStats = commands?.stats ?? {};
  const totalCommands = commands?.count ?? 0;
  const queuedCommands = commandStats.queue ?? commandStats.queued ?? 0;
  const runningCommands = commandStats.running ?? 0;
  const retryCommands = commandStats.retry ?? 0;
  const doneCommands = commandStats.done ?? 0;
  const failedCommands = (commandStats.error ?? 0) + (commandStats.dead ?? 0);
  const activeCommands = queuedCommands + runningCommands + retryCommands;

  const eventStats = events?.stats ?? {};
  const totalEvents = events?.count ?? 0;
  const newEvents = eventStats.new ?? 0;
  const queuedEvents = eventStats.queued ?? 0;
  const processedEvents = eventStats.processed ?? 0;
  const eventErrors = eventStats.error ?? 0;
  const latestEvent =
    Array.isArray(events?.events) && events?.events.length > 0
      ? [...events.events].sort(
          (a, b) =>
            new Date(
              toText(b.updated_at) || toText(b.processed_at) || toText(b.created_at) || 0
            ).getTime() -
            new Date(
              toText(a.updated_at) || toText(a.processed_at) || toText(a.created_at) || 0
            ).getTime()
        )[0]
      : null;

  const incidentItems: IncidentItem[] = Array.isArray(incidents?.incidents)
    ? incidents.incidents
    : [];

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

  const slaItems: SlaItem[] = Array.isArray(sla?.incidents) ? sla.incidents : [];
  const slaStats = sla?.stats ?? {};
  const slaOk = slaStats.ok ?? 0;
  const slaWarning = slaStats.warning ?? 0;
  const slaBreached = slaStats.breached ?? 0;
  const slaEscalated = slaStats.escalated ?? 0;
  const slaQueued = slaStats.escalation_queued ?? 0;
  const slaUnknown = slaStats.unknown ?? 0;
  const totalSlaSignals = slaItems.length;
  const slaCriticals = slaBreached + slaEscalated;

  const latestSlaItem =
    slaItems.length > 0
      ? [...slaItems].sort(
          (a, b) =>
            new Date(getSlaLastCheck(b) || 0).getTime() -
            new Date(getSlaLastCheck(a) || 0).getTime()
        )[0]
      : null;

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Overview
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Vue d’ensemble du control plane BOSAI avec santé système, exécutions,
            commands et signaux SLA.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Health score</div>
          <div className={`mt-3 text-5xl font-semibold tracking-tight ${healthTone(healthScore)}`}>
            {formatNumber(healthScore)}
          </div>
          <div className="mt-4">
            <span className={healthBadge(healthScore)}>{resolvedHealthLabel}</span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Runs actifs</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight text-sky-300">
            {formatNumber(runningRuns)}
          </div>
          <div className="mt-4 text-sm text-zinc-400">
            Total runs: <span className="text-zinc-200">{formatNumber(totalRuns)}</span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Commands actives</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight text-violet-300">
            {formatNumber(activeCommands)}
          </div>
          <div className="mt-4 text-sm text-zinc-400">
            Total commands: <span className="text-zinc-200">{formatNumber(totalCommands)}</span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">SLA critiques</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight text-rose-300">
            {formatNumber(slaCriticals)}
          </div>
          <div className="mt-4 text-sm text-zinc-400">
            Total signaux SLA: <span className="text-zinc-200">{formatNumber(totalSlaSignals)}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className={sectionLabelClassName()}>SLA Snapshot</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              État SLA
            </div>
          </div>
          <div className="text-sm text-zinc-500">{formatNumber(totalSlaSignals)} signal(s)</div>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">OK</div>
            <div className="mt-3 text-4xl font-semibold text-emerald-300">{formatNumber(slaOk)}</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Warning</div>
            <div className="mt-3 text-4xl font-semibold text-amber-300">{formatNumber(slaWarning)}</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Breached</div>
            <div className="mt-3 text-4xl font-semibold text-red-300">{formatNumber(slaBreached)}</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-sm text-zinc-400">Escalated</div
