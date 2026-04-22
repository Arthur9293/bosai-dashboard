import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import {
  fetchCommands,
  fetchEvents,
  fetchHealthScore,
  fetchIncidents,
  fetchRuns,
  fetchSla,
  type CommandItem,
  type CommandsResponse,
  type EventItem,
  type EventsResponse,
  type HealthScoreResponse,
  type IncidentItem,
  type IncidentsResponse,
  type RunsResponse,
  type SlaResponse,
} from "@/lib/api";
import {
  appendWorkspaceIdToHref,
  resolveWorkspaceContext,
  workspaceMatchesOrUnscoped,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function formatNumber(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
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

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;

  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = String(value || "").trim();
    if (text) search.set(key, text);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function cardClassName(): string {
  return "rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5";
}

function compactCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5";
}

function rowCardClassName(): string {
  return "block w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.04]";
}

function compactRowCardClassName(): string {
  return "block w-full overflow-hidden rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5 transition hover:border-white/15 hover:bg-white/[0.04] md:px-5 md:py-4";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function badgeClassName(variant: BadgeVariant = "default"): string {
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

function ctaCompactClassName(): string {
  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]";
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

function coreHealthBadgeLabel(label: string): string {
  const normalized = label.trim().toUpperCase();

  if (normalized === "STABLE") return "Core stable";
  if (normalized === "À SURVEILLER") return "Core à surveiller";
  if (normalized === "CRITIQUE") return "Core critique";
  return `Core ${label}`;
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

function safeResolveOverviewActiveWorkspaceId(args: {
  searchParams: SearchParams;
  cookieValues: Record<string, string | undefined>;
}): string {
  try {
    return resolveWorkspaceContext(args).activeWorkspaceId || "";
  } catch {
    return "";
  }
}

function extractCommandItems(data: CommandsResponse | null): CommandItem[] {
  if (!data || typeof data !== "object") return [];

  const raw = data as unknown as Record<string, unknown>;
  const candidates = [
    raw.commands,
    raw.items,
    raw.data,
    raw.results,
    raw.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as CommandItem[];
    }
  }

  return [];
}

function extractEventItems(data: EventsResponse | null): EventItem[] {
  if (!data || typeof data !== "object") return [];

  const raw = data as unknown as Record<string, unknown>;
  const candidates = [
    raw.events,
    raw.items,
    raw.data,
    raw.results,
    raw.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as EventItem[];
    }
  }

  return [];
}

function extractIncidentItems(data: IncidentsResponse | null): IncidentItem[] {
  if (!data || typeof data !== "object") return [];

  const raw = data as unknown as Record<string, unknown>;
  const candidates = [
    raw.incidents,
    raw.items,
    raw.data,
    raw.results,
    raw.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as IncidentItem[];
    }
  }

  return [];
}

function overviewPostureTone(params: {
  criticalSlaSignals: number;
  escalatedIncidents: number;
  openIncidents: number;
  failedCommands: number;
  retryCommands: number;
  activeCommands: number;
  flowsUnderAttention: number;
  healthScore: number;
}): BadgeVariant {
  const {
    criticalSlaSignals,
    escalatedIncidents,
    openIncidents,
    failedCommands,
    retryCommands,
    activeCommands,
    flowsUnderAttention,
    healthScore,
  } = params;

  if (criticalSlaSignals > 0 || escalatedIncidents > 0) return "danger";
  if (openIncidents > 0 || failedCommands > 0 || retryCommands > 0) return "warning";
  if (activeCommands > 0 || flowsUnderAttention > 0) return "info";
  if (healthScore >= 80) return "success";
  if (healthScore >= 50) return "warning";
  return "danger";
}

function overviewPostureLabel(params: {
  criticalSlaSignals: number;
  escalatedIncidents: number;
  openIncidents: number;
  failedCommands: number;
  retryCommands: number;
  activeCommands: number;
  flowsUnderAttention: number;
  healthScore: number;
}): string {
  const tone = overviewPostureTone(params);

  if (tone === "danger") return "Pression critique";
  if (tone === "warning") return "Sous surveillance";
  if (tone === "info") return "Activité en cours";
  return "Stable";
}

function overviewPostureSummary(params: {
  criticalSlaSignals: number;
  escalatedIncidents: number;
  openIncidents: number;
  failedCommands: number;
  retryCommands: number;
  activeCommands: number;
  flowsUnderAttention: number;
  healthScore: number;
}): string {
  const {
    criticalSlaSignals,
    escalatedIncidents,
    openIncidents,
    failedCommands,
    retryCommands,
    activeCommands,
    flowsUnderAttention,
    healthScore,
  } = params;

  if (criticalSlaSignals > 0 || escalatedIncidents > 0) {
    return "Le core peut rester stable pendant que la couche opérationnelle demande une action immédiate.";
  }

  if (openIncidents > 0 || failedCommands > 0 || retryCommands > 0) {
    return "Le système reste exploitable, mais certains signaux actifs méritent une vérification rapide.";
  }

  if (activeCommands > 0 || flowsUnderAttention > 0) {
    return "Le cockpit sert surtout à suivre l’activité en cours et confirmer la bonne lecture des flux.";
  }

  if (healthScore >= 80) {
    return "Les surfaces visibles du dashboard restent globalement stables.";
  }

  return "L’état global mérite une surveillance légère même sans alerte dominante.";
}

/* ---------------- Incident helpers ---------------- */

function getIncidentTitle(incident: IncidentItem): string {
  return (
    toText((incident as Record<string, unknown>).title) ||
    toText((incident as Record<string, unknown>).name) ||
    toText((incident as Record<string, unknown>).error_id) ||
    "Untitled incident"
  );
}

function getIncidentStatus(incident: IncidentItem): string {
  const raw =
    toText((incident as Record<string, unknown>).status) ||
    toText((incident as Record<string, unknown>).statut_incident);

  const normalized = raw.toLowerCase();
  const sla = toText((incident as Record<string, unknown>).sla_status).toLowerCase();
  const resolvedAt = toText((incident as Record<string, unknown>).resolved_at);

  if (resolvedAt) return "resolved";
  if (["open", "opened", "new", "active", "en cours"].includes(normalized)) {
    return "open";
  }
  if (["escalated", "escalade", "escaladé"].includes(normalized)) {
    return "escalated";
  }
  if (["resolved", "closed", "done", "résolu", "resolve"].includes(normalized)) {
    return "resolved";
  }

  if (!normalized) {
    if (sla === "breached") return "open";
    return "open";
  }

  return normalized;
}

function getIncidentSeverity(incident: IncidentItem): string {
  const raw = toText((incident as Record<string, unknown>).severity).toLowerCase();
  const sla = toText((incident as Record<string, unknown>).sla_status).toLowerCase();

  if (!raw) {
    if (sla === "breached") return "critical";
    return "unknown";
  }

  if (["critical", "critique"].includes(raw)) return "critical";
  if (["high", "élevé", "eleve"].includes(raw)) return "high";
  if (["warning", "warn", "medium", "moyen"].includes(raw)) return "medium";
  if (["low", "faible"].includes(raw)) return "low";

  return raw;
}

function getIncidentWorkspaceScope(incident: IncidentItem): string {
  return (
    toText((incident as Record<string, unknown>).workspace_id) ||
    toText((incident as Record<string, unknown>).workspace) ||
    ""
  );
}

function getIncidentWorkspace(incident: IncidentItem): string {
  return getIncidentWorkspaceScope(incident) || "—";
}

function getIncidentFlowId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).flow_id);
}

function getIncidentRootEventId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).root_event_id);
}

function getIncidentSourceRecordId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).source_record_id);
}

function getIncidentCommandId(incident: IncidentItem): string {
  return (
    toText((incident as Record<string, unknown>).command_id) ||
    toText((incident as Record<string, unknown>).linked_command)
  );
}

function getIncidentUpdatedTs(incident: IncidentItem): number {
  const record = incident as Record<string, unknown>;

  return Math.max(
    toTs(record.resolved_at as string | number | null | undefined),
    toTs(record.updated_at as string | number | null | undefined),
    toTs(record.opened_at as string | number | null | undefined),
    toTs(record.created_at as string | number | null | undefined)
  );
}

function getIncidentActivityLabel(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;

  const value =
    toText(record.updated_at) ||
    toText(record.opened_at) ||
    toText(record.created_at) ||
    toText(record.resolved_at);

  return formatDate(value || null);
}

function getIncidentBusinessKey(incident: IncidentItem): string {
  const workspace = getIncidentWorkspaceScope(incident);
  const title = getIncidentTitle(incident).toLowerCase();
  const flowId = getIncidentFlowId(incident);
  const rootEventId = getIncidentRootEventId(incident);
  const sourceRecordId = getIncidentSourceRecordId(incident);
  const commandId = getIncidentCommandId(incident);
  const category = toText((incident as Record<string, unknown>).category).toLowerCase();
  const reason = toText((incident as Record<string, unknown>).reason).toLowerCase();
  const errorId = toText((incident as Record<string, unknown>).error_id).toLowerCase();

  if (flowId) return `flow|${workspace}|${flowId}|${category}|${reason}|${title}`;
  if (rootEventId) {
    return `root|${workspace}|${rootEventId}|${category}|${reason}|${title}`;
  }
  if (sourceRecordId) {
    return `source|${workspace}|${sourceRecordId}|${category}|${reason}|${title}`;
  }
  if (commandId) {
    return `command|${workspace}|${commandId}|${category}|${reason}|${title}`;
  }
  if (errorId) return `error|${workspace}|${errorId}|${category}|${reason}|${title}`;

  return `id|${workspace}|${toText((incident as Record<string, unknown>).id)}`;
}

function getIncidentFlowKey(incident: IncidentItem): string {
  return (
    getIncidentFlowId(incident) ||
    getIncidentRootEventId(incident) ||
    getIncidentSourceRecordId(incident)
  );
}

function isLegacyNoiseIncident(incident: IncidentItem): boolean {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = toText((incident as Record<string, unknown>).category).trim().toLowerCase();
  const reason = toText((incident as Record<string, unknown>).reason).trim().toLowerCase();
  const errorId = toText((incident as Record<string, unknown>).error_id);
  const resolutionNote = toText((incident as Record<string, unknown>).resolution_note);
  const lastAction = toText((incident as Record<string, unknown>).last_action);

  const flowId = getIncidentFlowId(incident);
  const rootEventId = getIncidentRootEventId(incident);
  const sourceRecordId = getIncidentSourceRecordId(incident);
  const commandId = getIncidentCommandId(incident);

  const isGenericTitle = title === "incident" || title === "untitled incident";
  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";
  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const hasNoLinking =
    flowId === "" &&
    rootEventId === "" &&
    sourceRecordId === "" &&
    commandId === "";

  const hasStrongSignal =
    errorId !== "" ||
    resolutionNote !== "" ||
    lastAction !== "" ||
    category === "http_failure" ||
    reason === "http_5xx_exhausted" ||
    reason === "http_status_error" ||
    reason === "forbidden_host" ||
    !hasNoLinking;

  return (
    isGenericTitle &&
    isGenericCategory &&
    isGenericReason &&
    !hasStrongSignal
  );
}

function dedupeIncidents(items: IncidentItem[]): IncidentItem[] {
  const map = new Map<string, IncidentItem>();

  for (const item of items) {
    const key = getIncidentBusinessKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    if (getIncidentUpdatedTs(item) >= getIncidentUpdatedTs(existing)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function isOpenIncident(incident: IncidentItem): boolean {
  return getIncidentStatus(incident) === "open";
}

function isEscalatedIncident(incident: IncidentItem): boolean {
  return getIncidentStatus(incident) === "escalated";
}

function isCriticalIncident(incident: IncidentItem): boolean {
  return getIncidentSeverity(incident) === "critical";
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

/* ---------------- Command helpers ---------------- */

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson((command as Record<string, unknown>).input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson((command as Record<string, unknown>).result);
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText((command as Record<string, unknown>).status) ||
    toText(result.status) ||
    toText(result.status_select) ||
    toText(input.status) ||
    "unknown"
  ).toLowerCase();
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText((command as Record<string, unknown>).capability) ||
    toText(input.capability) ||
    toText(result.capability) ||
    "unknown_capability"
  );
}

function getCommandWorkspaceScope(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText((command as Record<string, unknown>).workspace_id) ||
    toText(input.workspace_id) ||
    toText((input as Record<string, unknown>).workspaceId) ||
    toText(result.workspace_id) ||
    toText((result as Record<string, unknown>).workspaceId) ||
    ""
  );
}

function getCommandWorkspace(command: CommandItem): string {
  return getCommandWorkspaceScope(command) || "—";
}

function getCommandTitle(command: CommandItem): string {
  return (
    toText((command as Record<string, unknown>).name) ||
    getCommandCapability(command) ||
    "Command detail"
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText((command as Record<string, unknown>).flow_id) ||
    toText(input.flow_id) ||
    toText((input as Record<string, unknown>).flowId) ||
    toText(result.flow_id) ||
    toText((result as Record<string, unknown>).flowId) ||
    ""
  );
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toText(record.root_event_id) ||
    toText(input.root_event_id) ||
    toText((input as Record<string, unknown>).rootEventId) ||
    toText(result.root_event_id) ||
    toText((result as Record<string, unknown>).rootEventId) ||
    ""
  );
}

function getCommandSourceEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toText(record.source_event_id) ||
    toText(record.Source_Event_ID) ||
    toText(input.source_event_id) ||
    toText((input as Record<string, unknown>).sourceEventId) ||
    toText(input.event_id) ||
    toText((input as Record<string, unknown>).eventId) ||
    toText(result.source_event_id) ||
    toText((result as Record<string, unknown>).sourceEventId) ||
    toText(result.event_id) ||
    toText((result as Record<string, unknown>).eventId) ||
    ""
  );
}

function getCommandActivityTs(command: CommandItem): number {
  const record = command as Record<string, unknown>;

  return Math.max(
    toTs(record.finished_at as string | number | null | undefined),
    toTs(record.updated_at as string | number | null | undefined),
    toTs(record.started_at as string | number | null | undefined),
    toTs(record.created_at as string | number | null | undefined)
  );
}

function getCommandActivityLabel(command: CommandItem): string {
  const record = command as Record<string, unknown>;

  const value =
    toText(record.updated_at) ||
    toText(record.finished_at) ||
    toText(record.started_at) ||
    toText(record.created_at);

  return formatDate(value || null);
}

function getCommandFlowKey(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toText(record.flow_id) ||
    toText(input.flow_id) ||
    toText((input as Record<string, unknown>).flowId) ||
    toText(result.flow_id) ||
    toText((result as Record<string, unknown>).flowId) ||
    toText(record.root_event_id) ||
    toText(input.root_event_id) ||
    toText((input as Record<string, unknown>).rootEventId) ||
    toText(result.root_event_id) ||
    toText((result as Record<string, unknown>).rootEventId) ||
    toText(record.source_event_id) ||
    toText(record.Source_Event_ID) ||
    toText(input.source_event_id) ||
    toText((input as Record<string, unknown>).sourceEventId) ||
    toText(input.event_id) ||
    toText((input as Record<string, unknown>).eventId) ||
    toText(result.source_event_id) ||
    toText((result as Record<string, unknown>).sourceEventId) ||
    toText(result.event_id) ||
    toText((result as Record<string, unknown>).eventId)
  );
}

function dedupeCommands(items: CommandItem[]): CommandItem[] {
  const map = new Map<string, CommandItem>();

  for (const item of items) {
    const id = toText((item as Record<string, unknown>).id);
    if (!id) continue;

    const existing = map.get(id);
    if (!existing) {
      map.set(id, item);
      continue;
    }

    if (getCommandActivityTs(item) >= getCommandActivityTs(existing)) {
      map.set(id, item);
    }
  }

  return Array.from(map.values());
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

function commandSummaryLine(command: CommandItem): string {
  return [
    getCommandStatus(command).toUpperCase(),
    getCommandCapability(command),
    getCommandWorkspace(command),
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ---------------- UI blocks ---------------- */

function StatCard({
  label,
  value,
  toneClass,
  helper,
  className = "",
}: {
  label: string;
  value: number;
  toneClass: string;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={`${statCardClassName()} ${className}`}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight md:text-4xl ${toneClass}`}>
        {formatNumber(value)}
      </div>
      {helper ? <div className="mt-2 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function SectionBlock({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className={sectionLabelClassName()}>{eyebrow}</div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            {title}
          </h2>
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
    <Link href={href} className={compactRowCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            BOSAI Lane
          </div>
          <div className="mt-2 text-[1.45rem] font-semibold leading-none tracking-tight text-white md:text-[1.65rem]">
            {title}
          </div>
          <div className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</div>
        </div>
        <div className="shrink-0">{badge}</div>
      </div>
    </Link>
  );
}

function AttentionIncidentCard({
  incident,
  activeWorkspaceId,
}: {
  incident: IncidentItem;
  activeWorkspaceId: string;
}) {
  const incidentTitle = getIncidentTitle(incident);
  const incidentSeverity = getIncidentSeverity(incident);
  const incidentStatus = getIncidentStatus(incident);
  const incidentWorkspace = getIncidentWorkspace(incident);
  const incidentFlow =
    getIncidentFlowId(incident) || getIncidentRootEventId(incident) || "—";

  const detailHref = buildHref(
    `/incidents/${encodeURIComponent(String((incident as Record<string, unknown>).id || ""))}`,
    {
      workspace_id: activeWorkspaceId || getIncidentWorkspaceScope(incident) || undefined,
      flow_id: getIncidentFlowId(incident) || undefined,
      root_event_id: getIncidentRootEventId(incident) || undefined,
      source_record_id: getIncidentSourceRecordId(incident) || undefined,
      command_id: getIncidentCommandId(incident) || undefined,
      from: "overview",
    }
  );

  return (
    <Link href={detailHref} className={rowCardClassName()}>
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
            <div className="mt-2 text-sm text-zinc-500">
              Activité : {getIncidentActivityLabel(incident)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className={statusTone(incidentStatus)}>
              {incidentStatus.toUpperCase() || "—"}
            </span>
            <span className={severityTone(String(incidentSeverity))}>
              {incidentSeverity || "—"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AttentionCommandCard({
  command,
  activeWorkspaceId,
}: {
  command: CommandItem;
  activeWorkspaceId: string;
}) {
  const status = getCommandStatus(command);
  const title = getCommandTitle(command);
  const flowId = getCommandFlowId(command);

  const detailHref = buildHref(
    `/commands/${encodeURIComponent(String((command as Record<string, unknown>).id || ""))}`,
    {
      workspace_id: activeWorkspaceId || getCommandWorkspaceScope(command) || undefined,
      flow_id: getCommandFlowId(command) || undefined,
      root_event_id: getCommandRootEventId(command) || undefined,
      source_event_id: getCommandSourceEventId(command) || undefined,
      from: "overview",
    }
  );

  return (
    <Link href={detailHref} className={rowCardClassName()}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className={metaLabelClassName()}>Command prioritaire</div>
            <div className="mt-2 break-words text-lg font-semibold tracking-tight text-white">
              {title}
            </div>
            <div className="mt-2 text-sm text-zinc-400">{commandSummaryLine(command)}</div>
            <div className="mt-2 text-sm text-zinc-500">
              Activité : {getCommandActivityLabel(command)}
            </div>
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

function RecentCommandCard({
  command,
  activeWorkspaceId,
}: {
  command: CommandItem;
  activeWorkspaceId: string;
}) {
  const detailHref = buildHref(
    `/commands/${encodeURIComponent(String((command as Record<string, unknown>).id || ""))}`,
    {
      workspace_id: activeWorkspaceId || getCommandWorkspaceScope(command) || undefined,
      flow_id: getCommandFlowId(command) || undefined,
      root_event_id: getCommandRootEventId(command) || undefined,
      source_event_id: getCommandSourceEventId(command) || undefined,
      from: "overview",
    }
  );

  return (
    <Link href={detailHref} className={compactRowCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Command récente
          </div>
          <div className="mt-2 break-words text-base font-semibold tracking-tight text-white md:text-lg">
            {getCommandTitle(command)}
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">
            Dernière activité : {getCommandActivityLabel(command)}
          </div>
        </div>
        <div className="shrink-0">
          <span className={commandTone(getCommandStatus(command))}>
            {getCommandStatus(command).toUpperCase()}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SnapshotMetricCell({
  label,
  value,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={`mt-2 text-lg font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function SnapshotCard({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    value: string;
    toneClass?: string;
  }>;
}) {
  return (
    <div className={compactCardClassName()}>
      <div className="mb-4 text-xl font-medium text-white">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <SnapshotMetricCell
            key={`${title}-${item.label}`}
            label={item.label}
            value={item.value}
            toneClass={item.toneClass}
          />
        ))}
      </div>
    </div>
  );
}

function SlaCompactCard({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function HeroActionCard({
  href,
  title,
  description,
  tone = "default",
}: {
  href: string;
  title: string;
  description: string;
  tone?: "default" | "danger" | "primary";
}) {
  const className =
    tone === "danger"
      ? "rounded-[22px] border border-rose-500/20 bg-rose-500/8 p-4 transition hover:bg-rose-500/12"
      : tone === "primary"
        ? "rounded-[22px] border border-emerald-500/20 bg-emerald-500/8 p-4 transition hover:bg-emerald-500/12"
        : "rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.04]";

  return (
    <Link href={href} className={className}>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{description}</div>
    </Link>
  );
}

function SignalMiniStat({
  label,
  value,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const cookieStore = await cookies();

  const fallbackWorkspaceId = safeResolveOverviewActiveWorkspaceId({
    searchParams: resolvedSearchParams,
    cookieValues: {
      bosai_active_workspace_id:
        cookieStore.get("bosai_active_workspace_id")?.value,
      bosai_workspace_id: cookieStore.get("bosai_workspace_id")?.value,
      workspace_id: cookieStore.get("workspace_id")?.value,
      bosai_allowed_workspace_ids:
        cookieStore.get("bosai_allowed_workspace_ids")?.value,
      allowed_workspace_ids:
        cookieStore.get("allowed_workspace_ids")?.value,
    },
  });

  const activeWorkspaceId =
    firstParam(resolvedSearchParams.workspace_id).trim() ||
    firstParam((resolvedSearchParams as Record<string, string | string[] | undefined>).workspaceId).trim() ||
    fallbackWorkspaceId ||
    "";

  let health: HealthScoreResponse | null = null;
  let runs: RunsResponse | null = null;
  let commands: CommandsResponse | null = null;
  let events: EventsResponse | null = null;
  let incidents: IncidentsResponse | null = null;
  let sla: SlaResponse | null = null;

  try {
    health = await fetchHealthScore({
      workspaceId: activeWorkspaceId || undefined,
    });
  } catch {}

  try {
    runs = await fetchRuns({
      workspaceId: activeWorkspaceId || undefined,
      limit: 100,
    });
  } catch {}

  try {
    commands = await fetchCommands({
      workspaceId: activeWorkspaceId || undefined,
      limit: 300,
    });
  } catch {}

  try {
    events = await fetchEvents({
      workspaceId: activeWorkspaceId || undefined,
      limit: 300,
    });
  } catch {}

  try {
    incidents = await fetchIncidents({
      workspaceId: activeWorkspaceId || undefined,
      limit: 300,
    });
  } catch {}

  try {
    sla = await fetchSla({
      workspaceId: activeWorkspaceId || undefined,
      limit: 100,
    });
  } catch {}

  const healthScore = health?.score ?? 0;
  const healthStatus = health?.status ?? "";
  const coreHealthState = healthLabel(healthScore, healthStatus);

  const totalRuns = runs?.count ?? 0;
  const runningRuns = runs?.stats?.running ?? 0;
  const doneRuns = runs?.stats?.done ?? 0;
  const errorRuns = runs?.stats?.error ?? 0;

  const rawCommandItems = extractCommandItems(commands);

  const scopedCommandItems = rawCommandItems.filter((item) =>
    workspaceMatchesOrUnscoped(getCommandWorkspaceScope(item), activeWorkspaceId)
  );

  const commandItems = dedupeCommands(scopedCommandItems);

  const queuedCommandItems = commandItems.filter((item) =>
    ["queued", "pending", "new"].includes(getCommandStatus(item))
  );

  const runningCommandItems = commandItems.filter((item) =>
    ["running", "processing"].includes(getCommandStatus(item))
  );

  const retryCommandItems = commandItems.filter((item) =>
    ["retry", "retriable"].includes(getCommandStatus(item))
  );

  const failedCommandItems = commandItems.filter((item) =>
    ["error", "failed", "dead", "blocked"].includes(getCommandStatus(item))
  );

  const doneCommandItems = commandItems.filter((item) =>
    ["processed", "done", "success", "completed", "resolved"].includes(
      getCommandStatus(item)
    )
  );

  const queuedCommands = queuedCommandItems.length;
  const runningCommands = runningCommandItems.length;
  const retryCommands = retryCommandItems.length;
  const failedCommands = failedCommandItems.length;
  const doneCommands = doneCommandItems.length;
  const totalCommands = commandItems.length;
  const activeCommands = queuedCommands + runningCommands + retryCommands;

  const recentCommands = [...commandItems]
    .sort((a, b) => getCommandActivityTs(b) - getCommandActivityTs(a))
    .slice(0, 4);

  const eventItems = extractEventItems(events);
  const newEvents = events?.stats?.new ?? 0;
  const queuedEvents = events?.stats?.queued ?? 0;
  const processedEvents = events?.stats?.processed ?? 0;
  const eventErrors = events?.stats?.error ?? 0;
  const totalEvents =
    eventItems.length > 0
      ? eventItems.length
      : newEvents + queuedEvents + processedEvents + eventErrors;

  const rawIncidentItems = extractIncidentItems(incidents);

  const scopedIncidentItems = rawIncidentItems.filter((item) =>
    workspaceMatchesOrUnscoped(getIncidentWorkspaceScope(item), activeWorkspaceId)
  );

  const incidentItems = dedupeIncidents(
    scopedIncidentItems.filter((item) => !isLegacyNoiseIncident(item))
  );

  const openIncidentItems = incidentItems.filter((item) => isOpenIncident(item));
  const escalatedIncidentItems = incidentItems.filter((item) =>
    isEscalatedIncident(item)
  );
  const criticalIncidentItems = incidentItems.filter((item) =>
    isCriticalIncident(item)
  );

  const openIncidents = openIncidentItems.length;
  const escalatedIncidents = escalatedIncidentItems.length;
  const criticalIncidents = criticalIncidentItems.length;

  const activeIncidentItems = [...openIncidentItems, ...escalatedIncidentItems].sort(
    (a, b) => {
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
      return getIncidentUpdatedTs(b) - getIncidentUpdatedTs(a);
    }
  );

  const attentionCommands = [...commandItems]
    .filter((command) => {
      const status = getCommandStatus(command);
      return ["running", "retry", "error", "failed", "dead", "blocked"].includes(
        status
      );
    })
    .sort((a, b) => getCommandActivityTs(b) - getCommandActivityTs(a));

  const activeFlowIds = new Set<string>(
    uniq([
      ...activeIncidentItems.map(getIncidentFlowKey),
      ...runningCommandItems.map(getCommandFlowKey),
      ...retryCommandItems.map(getCommandFlowKey),
      ...failedCommandItems.map(getCommandFlowKey),
    ])
  );

  const flowsUnderAttention = activeFlowIds.size;

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

  const postureTone = overviewPostureTone({
    criticalSlaSignals,
    escalatedIncidents,
    openIncidents,
    failedCommands,
    retryCommands,
    activeCommands,
    flowsUnderAttention,
    healthScore,
  });

  const postureLabel = overviewPostureLabel({
    criticalSlaSignals,
    escalatedIncidents,
    openIncidents,
    failedCommands,
    retryCommands,
    activeCommands,
    flowsUnderAttention,
    healthScore,
  });

  const postureSummary = overviewPostureSummary({
    criticalSlaSignals,
    escalatedIncidents,
    openIncidents,
    failedCommands,
    retryCommands,
    activeCommands,
    flowsUnderAttention,
    healthScore,
  });

  const flowsHref = appendWorkspaceIdToHref("/flows", activeWorkspaceId);
  const incidentsHref = appendWorkspaceIdToHref("/incidents", activeWorkspaceId);
  const commandsHref = appendWorkspaceIdToHref("/commands", activeWorkspaceId);
  const eventsHref = appendWorkspaceIdToHref("/events", activeWorkspaceId);
  const runsHref = appendWorkspaceIdToHref("/runs", activeWorkspaceId);
  const slaHref = appendWorkspaceIdToHref("/sla", activeWorkspaceId);

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>BOSAI Control Plane</div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={badgeClassName(postureTone)}>{postureLabel}</span>
            <span className={badgeClassName("success")}>
              {coreHealthBadgeLabel(coreHealthState)}
            </span>
            <span className={badgeClassName("info")}>
              {formatNumber(flowsUnderAttention)} flow(s) sous attention
            </span>
            <span className={badgeClassName("default")}>
              Workspace {activeWorkspaceId || "all"}
            </span>
          </div>

          <div className="mt-5">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[3.5rem]">
              Overview
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-400">
              Point d’entrée cockpit BOSAI pour lire la posture opérationnelle et
              ouvrir rapidement les lanes utiles.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
              {postureSummary}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <HeroActionCard
              href={flowsHref}
              title="Ouvrir Flows"
              description="Lire les chaînes d’exécution et les flows sous attention."
            />
            <HeroActionCard
              href={incidentsHref}
              title="Voir Incidents"
              description="Ouvrir les incidents actifs, escaladés et prioritaires."
              tone="danger"
            />
            <div className="sm:col-span-2">
              <HeroActionCard
                href={commandsHref}
                title="Voir Commands"
                description="Contrôler l’activité récente et les commands critiques."
                tone="primary"
              />
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>Signal summary</div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold tracking-tight text-white">
                {postureLabel}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Vue compacte de la pression opérationnelle.
              </div>
            </div>

            <span className={badgeClassName(postureTone)}>{postureLabel}</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SignalMiniStat
              label="Core"
              value={coreHealthState}
              toneClass={healthTone(healthScore)}
            />
            <SignalMiniStat label="Flows" value={formatNumber(flowsUnderAttention)} />
            <SignalMiniStat label="Incidents" value={formatNumber(openIncidents)} />
            <SignalMiniStat label="Failed" value={formatNumber(failedCommands)} />
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3.5">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-400">
              {criticalSlaSignals > 0 || escalatedIncidents > 0
                ? "Priorité immédiate : ouvrir Incidents puis SLA."
                : openIncidents > 0 || failedCommands > 0 || retryCommands > 0
                  ? "Priorité : vérifier Incidents puis Commands."
                  : "Priorité : confirmer Flows et Commands sans urgence forte."}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          label="Health score"
          value={healthScore}
          toneClass={healthTone(healthScore)}
          helper={coreHealthState}
          className="col-span-2 xl:col-span-1"
        />
        <StatCard
          label="Flows sous attention"
          value={flowsUnderAttention}
          toneClass="text-sky-300"
          helper="Incidents ou commands actives"
        />
        <StatCard
          label="Commands actives"
          value={activeCommands}
          toneClass="text-violet-300"
          helper={`Total: ${formatNumber(totalCommands)}`}
        />
        <StatCard
          label="Incidents ouverts"
          value={openIncidents}
          toneClass="text-red-300"
          helper={`Escaladés: ${formatNumber(escalatedIncidents)}`}
        />
        <StatCard
          label="SLA critiques"
          value={criticalSlaSignals}
          toneClass="text-rose-300"
          helper={`Total SLA: ${formatNumber(totalSlaSignals)}`}
          className="col-span-2 xl:col-span-1"
        />
      </section>

      <SectionBlock
        eyebrow="Needs attention"
        title="Priorités opérationnelles"
        description="Ce qui demande une action maintenant : incidents ouverts ou escaladés, commands encore actives ou en échec."
        action={
          <div className="text-sm text-zinc-500">
            {formatNumber(activeIncidentItems.length + attentionCommands.length)} élément(s)
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

              <Link href={incidentsHref} className={ctaCompactClassName()}>
                Voir tout
              </Link>
            </div>

            <div className="space-y-3">
              {activeIncidentItems.slice(0, 2).map((incident) => (
                <AttentionIncidentCard
                  key={String((incident as Record<string, unknown>).id)}
                  incident={incident}
                  activeWorkspaceId={activeWorkspaceId}
                />
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

              <Link href={commandsHref} className={ctaCompactClassName()}>
                Voir tout
              </Link>
            </div>

            <div className="space-y-3">
              {attentionCommands.slice(0, 2).map((command) => (
                <AttentionCommandCard
                  key={String((command as Record<string, unknown>).id)}
                  command={command}
                  activeWorkspaceId={activeWorkspaceId}
                />
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
        eyebrow="Operational lanes"
        title="Accès rapides"
        description="Accès rapide aux vues principales du control plane BOSAI."
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          <QuickLinkCard
            title="Flows"
            subtitle={`${formatNumber(flowsUnderAttention)} flow(s) sous attention`}
            href={flowsHref}
            badge={<span className={badgeClassName("info")}>Flows</span>}
          />
          <QuickLinkCard
            title="Incidents"
            subtitle={`${formatNumber(openIncidents)} ouverts · ${formatNumber(
              criticalIncidents
            )} critiques`}
            href={incidentsHref}
            badge={<span className={badgeClassName("danger")}>Incidents</span>}
          />
          <QuickLinkCard
            title="Commands"
            subtitle={`${formatNumber(activeCommands)} actives · ${formatNumber(
              doneCommands
            )} terminées`}
            href={commandsHref}
            badge={<span className={badgeClassName("violet")}>Commands</span>}
          />
          <QuickLinkCard
            title="Events"
            subtitle={`${formatNumber(processedEvents)} traités · ${formatNumber(
              eventErrors
            )} erreurs`}
            href={eventsHref}
            badge={<span className={badgeClassName("warning")}>Events</span>}
          />
          <QuickLinkCard
            title="Runs"
            subtitle={`${formatNumber(runningRuns)} running · ${formatNumber(
              errorRuns
            )} error`}
            href={runsHref}
            badge={<span className={badgeClassName("info")}>Runs</span>}
          />
          <QuickLinkCard
            title="SLA"
            subtitle={`${formatNumber(slaBreached)} breached · ${formatNumber(
              slaEscalated
            )} escalated`}
            href={slaHref}
            badge={<span className={badgeClassName("danger")}>SLA</span>}
          />
        </div>
      </SectionBlock>

      <SectionBlock
        eyebrow="System snapshot"
        title="Lecture synthétique"
        description="État synthétique des exécutions, commands, events et SLA."
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          <SnapshotCard
            title="System health"
            items={[
              {
                label: "Health",
                value: healthLabel(healthScore, healthStatus),
                toneClass: systemStatusTone(healthLabel(healthScore, healthStatus)),
              },
              {
                label: "Worker",
                value: "Healthy",
                toneClass: systemStatusTone("healthy"),
              },
              {
                label: "Airtable",
                value: "OK",
                toneClass: systemStatusTone("ok"),
              },
              {
                label: "Policies",
                value: "Loaded",
                toneClass: systemStatusTone("loaded"),
              },
            ]}
          />

          <SnapshotCard
            title="Runs snapshot"
            items={[
              { label: "Running", value: formatNumber(runningRuns) },
              { label: "Done", value: formatNumber(doneRuns) },
              { label: "Error", value: formatNumber(errorRuns) },
              { label: "Total", value: formatNumber(totalRuns) },
            ]}
          />

          <SnapshotCard
            title="Commands snapshot"
            items={[
              { label: "Queued", value: formatNumber(queuedCommands) },
              { label: "Running", value: formatNumber(runningCommands) },
              { label: "Retry", value: formatNumber(retryCommands) },
              { label: "Done", value: formatNumber(doneCommands) },
              { label: "Failed", value: formatNumber(failedCommands) },
              { label: "Total", value: formatNumber(totalCommands) },
            ]}
          />

          <SnapshotCard
            title="Events snapshot"
            items={[
              { label: "New", value: formatNumber(newEvents) },
              { label: "Queued", value: formatNumber(queuedEvents) },
              { label: "Processed", value: formatNumber(processedEvents) },
              { label: "Errors", value: formatNumber(eventErrors) },
              { label: "Total", value: formatNumber(totalEvents) },
            ]}
          />
        </div>
      </SectionBlock>

      <SectionBlock
        eyebrow="SLA snapshot"
        title="Répartition SLA"
        description="Répartition actuelle des signaux SLA."
        action={
          <Link href={slaHref} className={ctaCompactClassName()}>
            Ouvrir la vue SLA
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <SlaCompactCard
            label="OK"
            value={formatNumber(slaOk)}
            toneClass="text-emerald-300"
          />
          <SlaCompactCard
            label="Warning"
            value={formatNumber(slaWarning)}
            toneClass="text-amber-300"
          />
          <SlaCompactCard
            label="Breached"
            value={formatNumber(slaBreached)}
            toneClass="text-red-300"
          />
          <SlaCompactCard
            label="Escalated"
            value={formatNumber(slaEscalated)}
            toneClass="text-rose-300"
          />
          <SlaCompactCard
            label="Queued"
            value={formatNumber(slaQueued)}
            toneClass="text-violet-300"
          />
          <SlaCompactCard
            label="Unknown"
            value={formatNumber(slaUnknown)}
            toneClass="text-zinc-300"
          />
        </div>
      </SectionBlock>

      <SectionBlock
        eyebrow="Recent activity"
        title="Dernières commands"
        description="Dernières commands observées par BOSAI."
        action={
          <Link href={commandsHref} className={ctaCompactClassName()}>
            Voir toutes les commands
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {recentCommands.map((command) => (
            <RecentCommandCard
              key={String((command as Record<string, unknown>).id)}
              command={command}
              activeWorkspaceId={activeWorkspaceId}
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
