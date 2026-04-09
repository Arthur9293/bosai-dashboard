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
  type CommandItem,
} from "@/lib/api";

function formatNumber(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
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

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

function ctaClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
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

function commandTone(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (["done", "processed", "success", "completed", "resolved"].includes(normalized)) {
    return badgeClassName("success");
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return badgeClassName("warning");
  }

  if (["running", "processing"].includes(normalized)) {
    return badgeClassName("info");
  }

  if (["retry", "retriable"].includes(normalized)) {
    return badgeClassName("violet");
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return badgeClassName("danger");
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

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.status, "") ||
    toText(result.status, "") ||
    toText(result.status_select, "") ||
    toText(input.status, "") ||
    "unknown"
  );
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.capability, "") ||
    toText(input.capability, "") ||
    toText(result.capability, "") ||
    "unknown_capability"
  );
}

function getCommandWorkspace(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.workspace_id, "") ||
    toText(input.workspace_id, "") ||
    toText(input.workspaceId, "") ||
    toText(result.workspace_id, "") ||
    toText(result.workspaceId, "") ||
    "—"
  );
}

function getCommandTitle(command: CommandItem): string {
  return (
    toText(command.name, "") ||
    getCommandCapability(command) ||
    "Command detail"
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.flow_id, "") ||
    toText(input.flow_id, "") ||
    toText(input.flowId, "") ||
    toText(result.flow_id, "") ||
    toText(result.flowId, "") ||
    ""
  );
}

function getCommandUpdatedTs(command: CommandItem): number {
  const created = new Date(toText(command.created_at, "") || 0).getTime();
  const started = new Date(toText(command.started_at, "") || 0).getTime();
  const finished = new Date(toText(command.finished_at, "") || 0).getTime();

  return Math.max(created || 0, started || 0, finished || 0);
}

function commandSummaryLine(command: CommandItem): string {
  return [
    getCommandStatus(command).toUpperCase(),
    getCommandCapability(command),
    getCommandWorkspace(command),
  ]
    .filter(Boolean)
    .join(" · ");
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

function StatCard({
  label,
  value,
  toneClass,
  helper,
}: {
  label: string;
  value: number;
  toneClass: string;
  helper?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
      {helper ? <div className="mt-3 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function SectionBlock({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className={sectionLabelClassName()}>{title}</div>
          <p className="max-w-3xl text-base text-zinc-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickLinkCard({
  title,
  subtitle,
  href,
  badge,
}: {
  title: string;
  subtitle: string;
  href: string;
  badge?: ReactNode;
}) {
  return (
    <Link href={href} className={rowCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={metaLabelClassName()}>BOSAI Lane</div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-white">
            {title}
          </div>
          <div className="mt-2 text-sm text-zinc-400">{subtitle}</div>
        </div>
        {badge}
      </div>
    </Link>
  );
}

function AttentionIncidentCard({ incident }: { incident: IncidentItem }) {
  const incidentTitle = getIncidentTitle(incident);
  const incidentSeverity = incident.severity || "—";
  const incidentStatus = getIncidentStatus(incident);
  const incidentWorkspace = String(incident.workspace_id || incident.workspace || "—");
  const incidentFlow = String(incident.flow_id || incident.root_event_id || "—");

  return (
    <Link
      href={`/incidents/${encodeURIComponent(String(incident.id))}`}
      className={rowCardClassName()}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className={metaLabelClassName()}>Incident prioritaire</div>
            <div className="mt-2 break-words text-lg font-semibold tracking-tight text-white">
              {incidentTitle}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              {incidentWorkspace} · {incidentFlow}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className={statusTone(incidentStatus)}>{incidentStatus || "—"}</span>
            <span className={severityTone(String(incidentSeverity))}>
              {incidentSeverity || "—"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AttentionCommandCard({ command }: { command: CommandItem }) {
  const status = getCommandStatus(command);
  const title = getCommandTitle(command);
  const flowId = getCommandFlowId(command);

  return (
    <Link
      href={`/commands/${encodeURIComponent(String(command.id || ""))}`}
      className={rowCardClassName()}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className={metaLabelClassName()}>Command prioritaire</div>
            <div className="mt-2 break-words text-lg font-semibold tracking-tight text-white">
              {title}
            </div>
            <div className="mt-2 text-sm text-zinc-400">{commandSummaryLine(command)}</div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className={commandTone(status)}>{status.toUpperCase()}</span>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-1 break-all text-zinc-200">{flowId || "—"}</div>
          </div>
          <div>
            <div className={metaLabelClassName()}>Workspace</div>
            <div className="mt-1 text-zinc-200">{getCommandWorkspace(command)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RecentRunCard({
  title,
  value,
  href,
  badge,
}: {
  title: string;
  value: string;
  href: string;
  badge?: ReactNode;
}) {
  return (
    <Link href={href} className={rowCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={metaLabelClassName()}>{title}</div>
          <div className="mt-2 break-words text-base font-semibold tracking-tight text-white">
            {value}
          </div>
        </div>
        {badge}
      </div>
    </Link>
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
  const commandItems: CommandItem[] = Array.isArray(commands?.commands)
    ? commands!.commands
    : [];
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
  const totalEvents =
    newEvents + queuedEvents + processedEvents + eventErrors;

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

  const activeIncidentItems = incidentItems
    .filter((incident) => isOpenIncident(incident) || isEscalatedIncident(incident))
    .sort((a, b) => {
      const aTs = new Date(
        toText(a.updated_at, "") || toText(a.created_at, "") || 0
      ).getTime();
      const bTs = new Date(
        toText(b.updated_at, "") || toText(b.created_at, "") || 0
      ).getTime();

      const aPriority =
        isEscalatedIncident(a) && isCriticalIncident(a)
          ? 0
          : isEscalatedIncident(a)
            ? 1
            : isCriticalIncident(a)
              ? 2
              : 3;

      const bPriority =
        isEscalatedIncident(b) && isCriticalIncident(b)
          ? 0
          : isEscalatedIncident(b)
            ? 1
            : isCriticalIncident(b)
              ? 2
              : 3;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return bTs - aTs;
    });

  const attentionCommands = [...commandItems]
    .filter((command) => {
      const status = getCommandStatus(command).toLowerCase();
      return ["running", "retry", "error", "failed", "dead", "blocked"].includes(
        status
      );
    })
    .sort((a, b) => getCommandUpdatedTs(b) - getCommandUpdatedTs(a));

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

  const activeFlowIds = new Set<string>();
  activeIncidentItems.forEach((incident) => {
    const value = toText(incident.flow_id, "") || toText(incident.root_event_id, "");
    if (value) activeFlowIds.add(value);
  });
  attentionCommands.forEach((command) => {
    const value = getCommandFlowId(command);
    if (value) activeFlowIds.add(value);
  });
  const flowsUnderAttention = activeFlowIds.size;

  const recentCommands = [...commandItems]
    .sort((a, b) => getCommandUpdatedTs(b) - getCommandUpdatedTs(a))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div className="space-y-4 xl:flex xl:items-end xl:justify-between xl:gap-8 xl:space-y-0">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Overview
            </h1>
            <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
              Cockpit principal BOSAI avec santé système, exécutions en cours,
              signaux critiques et accès rapide aux lanes métier.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
            <Link href="/flows" className={ctaClassName("soft")}>
              Ouvrir Flows
            </Link>
            <Link href="/incidents" className={ctaClassName("danger")}>
              Voir Incidents
            </Link>
            <Link href="/commands" className={ctaClassName("primary")}>
              Voir Commands
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Health score"
          value={healthScore}
          toneClass={healthTone(healthScore)}
          helper={healthLabel(healthScore, healthStatus)}
        />
        <StatCard
          label="Flows sous attention"
          value={flowsUnderAttention}
          toneClass="text-sky-300"
          helper="Liés aux incidents ou commands actives"
        />
        <StatCard
          label="Commands actives"
          value={activeCommands}
          toneClass="text-violet-300"
          helper={`Total commands: ${formatNumber(totalCommands)}`}
        />
        <StatCard
          label="Incidents ouverts"
          value={openIncidents}
          toneClass="text-red-300"
          helper={`Warnings: ${formatNumber(warningIncidents)}`}
        />
        <StatCard
          label="SLA critiques"
          value={criticalSlaSignals}
          toneClass="text-rose-300"
          helper={`Total signaux SLA: ${formatNumber(totalSlaSignals)}`}
        />
      </section>

      <SectionBlock
        title="Needs attention"
        description="Ce qui demande une action maintenant : incidents ouverts ou escaladés, commands encore actives ou en échec."
        action={
          <div className="text-sm text-zinc-500">
            {activeIncidentItems.length + attentionCommands.length} élément(s)
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={cardClassName()}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className={metaLabelClassName()}>Incidents</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  Priorité incident
                </div>
              </div>

              <Link href="/incidents" className={ctaClassName("soft")}>
                Voir tout
              </Link>
            </div>

            <div className="space-y-3">
              {activeIncidentItems.slice(0, 4).map((incident) => (
                <AttentionIncidentCard key={incident.id} incident={incident} />
              ))}

              {activeIncidentItems.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
                  Aucun incident actif affiché.
                </div>
              )}
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className={metaLabelClassName()}>Commands</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  Priorité command
                </div>
              </div>

              <Link href="/commands" className={ctaClassName("soft")}>
                Voir tout
              </Link>
            </div>

            <div className="space-y-3">
              {attentionCommands.slice(0, 4).map((command) => (
                <AttentionCommandCard key={String(command.id)} command={command} />
              ))}

              {attentionCommands.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
                  Aucune command critique affichée.
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="System lanes"
        description="Accès rapide aux vues principales du control plane BOSAI."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          <QuickLinkCard
            title="Flows"
            subtitle={`${formatNumber(flowsUnderAttention)} flow(s) sous attention`}
            href="/flows"
            badge={<span className={badgeClassName("info")}>Flows</span>}
          />
          <QuickLinkCard
            title="Incidents"
            subtitle={`${formatNumber(openIncidents)} ouverts · ${formatNumber(
              criticalIncidents
            )} critiques`}
            href="/incidents"
            badge={<span className={badgeClassName("danger")}>Incidents</span>}
          />
          <QuickLinkCard
            title="Commands"
            subtitle={`${formatNumber(activeCommands)} actives · ${formatNumber(
              doneCommands
            )} terminées`}
            href="/commands"
            badge={<span className={badgeClassName("violet")}>Commands</span>}
          />
          <QuickLinkCard
            title="Events"
            subtitle={`${formatNumber(processedEvents)} traités · ${formatNumber(
              eventErrors
            )} erreurs`}
            href="/events"
            badge={<span className={badgeClassName("warning")}>Events</span>}
          />
          <QuickLinkCard
            title="Runs"
            subtitle={`${formatNumber(runningRuns)} running · ${formatNumber(
              errorRuns
            )} error`}
            href="/runs"
            badge={<span className={badgeClassName("info")}>Runs</span>}
          />
          <QuickLinkCard
            title="SLA"
            subtitle={`${formatNumber(slaBreached)} breached · ${formatNumber(
              slaEscalated
            )} escalated`}
            href="/sla"
            badge={<span className={badgeClassName("danger")}>SLA</span>}
          />
        </div>
      </SectionBlock>

      <SectionBlock
        title="System snapshot"
        description="État synthétique des exécutions, commands, events et SLA."
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-4">
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
          </div>

          <div className={cardClassName()}>
            <div className="mb-5 text-lg font-medium text-white">Runs snapshot</div>
            <div className="space-y-3 text-sm">
              <MetricRow label="Running" value={formatNumber(runningRuns)} />
              <MetricRow label="Done" value={formatNumber(doneRuns)} />
              <MetricRow label="Error" value={formatNumber(errorRuns)} />
              <MetricRow label="Total" value={formatNumber(totalRuns)} />
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
              <MetricRow label="Total" value={formatNumber(totalEvents)} />
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="SLA snapshot"
        description="Répartition actuelle des signaux SLA."
        action={<Link href="/sla" className={ctaClassName("primary")}>Ouvrir la vue SLA</Link>}
      >
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
      </SectionBlock>

      <SectionBlock
        title="Recent activity"
        description="Dernières commands observées par BOSAI."
        action={<Link href="/commands" className={ctaClassName("soft")}>Voir toutes les commands</Link>}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {recentCommands.slice(0, 5).map((command) => (
            <RecentRunCard
              key={String(command.id)}
              title="Command récente"
              value={getCommandTitle(command)}
              href={`/commands/${encodeURIComponent(String(command.id || ""))}`}
              badge={
                <span className={commandTone(getCommandStatus(command))}>
                  {getCommandStatus(command).toUpperCase()}
                </span>
              }
            />
          ))}

          {recentCommands.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
              Aucune activité récente affichée.
            </div>
          )}
        </div>
      </SectionBlock>
    </div>
  );
}
