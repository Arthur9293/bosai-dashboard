import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
import {
  appendWorkspaceIdToHref,
  resolveWorkspaceContext,
  workspaceMatchesOrUnscoped,
} from "@/lib/workspace";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
  searchParams?: Promise<SearchParams> | SearchParams;
};

type ShellBadgeTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

type ExecutiveRiskLevel = "critical" | "elevated" | "watch" | "stable";
type ModuleState = "available" | "partial" | "unavailable";

function sectionFrameClassName(
  tone: "default" | "attention" | "neutral" = "default",
): string {
  if (tone === "attention") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  if (tone === "neutral") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.06),transparent_46%),linear-gradient(180deg,rgba(7,18,43,0.68)_0%,rgba(3,8,22,0.54)_100%)]";
  }

  return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function sidePanelClassName(): string {
  return "bg-[radial-gradient(100%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_52%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false,
): string {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/25 bg-rose-500/12 text-rose-200 hover:bg-rose-500/18`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-white/35";
}

function metaBoxClassName(): string {
  return "min-w-0 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function wideBoxClassName(): string {
  return "min-w-0 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function makeWrapFriendly(value: string): string {
  return value.replace(/([/_\-.|:])/g, "$1\u200B");
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function firstText(values: unknown[], fallback = ""): string {
  for (const value of values) {
    const text = toText(value, "");
    if (text) return text;
  }
  return fallback;
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = String(value || "").trim();
    if (text) search.set(key, text);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function appendWorkspaceAndParams(
  pathname: string,
  workspaceId?: string,
  params?: Record<string, string | undefined>,
): string {
  return buildHref(pathname, {
    workspace_id: workspaceId || undefined,
    ...(params || {}),
  });
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return typeof value === "string" ? value : "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function safeUpper(text: string): string {
  return text.trim() ? text.trim().toUpperCase() : "—";
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getIncidentTitle(incident: IncidentItem): string {
  return firstText(
    [incident.title, incident.name, incident.error_id],
    "Untitled incident",
  );
}

function getIncidentStatusRaw(incident: IncidentItem): string {
  return firstText([incident.status, incident.statut_incident], "");
}

function getIncidentSeverityRaw(incident: IncidentItem): string {
  return firstText([incident.severity], "");
}

function getIncidentStatusNormalized(incident: IncidentItem): string {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = toText(incident.sla_status, "").toLowerCase();
  const hasResolvedAt = Boolean(toText(incident.resolved_at, ""));

  if (hasResolvedAt) return "resolved";

  if (!raw) {
    if (sla === "breached") return "open";
    return "open";
  }

  if (["open", "opened", "new", "active", "en cours"].includes(raw)) {
    return "open";
  }

  if (["escalated", "escalade", "escaladé"].includes(raw)) {
    return "escalated";
  }

  if (["resolved", "closed", "done", "résolu", "resolve"].includes(raw)) {
    return "resolved";
  }

  return raw;
}

function getIncidentStatusLabel(incident: IncidentItem): string {
  const normalized = getIncidentStatusNormalized(incident);

  if (normalized === "open") return "OPEN";
  if (normalized === "escalated") return "ESCALATED";
  if (normalized === "resolved") return "RESOLVED";

  const raw = getIncidentStatusRaw(incident);
  return raw ? raw.toUpperCase() : "OPEN";
}

function getIncidentSeverityNormalized(incident: IncidentItem): string {
  const raw = getIncidentSeverityRaw(incident).toLowerCase();

  if (!raw) {
    if (toText(incident.sla_status, "").toLowerCase() === "breached") {
      return "critical";
    }
    return "unknown";
  }

  if (["critical", "critique"].includes(raw)) return "critical";
  if (["high", "élevé", "eleve"].includes(raw)) return "high";
  if (["warning", "warn", "medium", "moyen"].includes(raw)) return "medium";
  if (["low", "faible"].includes(raw)) return "low";

  return raw;
}

function getIncidentSeverityLabel(incident: IncidentItem): string {
  const normalized = getIncidentSeverityNormalized(incident);

  if (normalized === "critical") return "CRITICAL";
  if (normalized === "high") return "HIGH";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "low") return "LOW";

  const raw = getIncidentSeverityRaw(incident);
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

function getIncidentStatusBadgeKind(
  incident: IncidentItem,
): DashboardStatusKind {
  const status = getIncidentStatusNormalized(incident);

  if (status === "resolved") return "success";
  if (status === "escalated") return "retry";
  if (status === "open") return "running";
  return "unknown";
}

function getIncidentSeverityBadgeKind(
  incident: IncidentItem,
): DashboardStatusKind {
  const severity = getIncidentSeverityNormalized(incident);

  if (severity === "critical") return "failed";
  if (severity === "high") return "failed";
  if (severity === "medium") return "retry";
  if (severity === "low") return "success";
  return "unknown";
}

function getDecisionStatus(incident: IncidentItem): string {
  return toText(incident.decision_status, "");
}

function getDecisionReason(incident: IncidentItem): string {
  return toText(incident.decision_reason, "");
}

function getNextAction(incident: IncidentItem): string {
  return toText(incident.next_action, "");
}

function getPriorityScore(incident: IncidentItem): number {
  return toNumber(incident.priority_score, 0);
}

function getDecisionBadgeKind(
  incident: IncidentItem,
): DashboardStatusKind {
  const decision = getDecisionStatus(incident).toLowerCase();

  if (["escalate", "escalated"].includes(decision)) return "incident";
  if (["resolve", "resolved"].includes(decision)) return "success";
  if (["retry", "retriable"].includes(decision)) return "retry";
  if (decision) return "queued";
  return "unknown";
}

function getSlaLabel(incident: IncidentItem): string {
  const resolvedLike =
    Boolean(toText(incident.resolved_at, "")) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "RESOLVED";

  const sla = toText(incident.sla_status, "");
  if (sla) return sla.toUpperCase();

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) {
    return "BREACHED";
  }

  return "—";
}

function getIncidentSlaBadgeKind(
  incident: IncidentItem,
): DashboardStatusKind {
  const resolvedLike =
    Boolean(toText(incident.resolved_at, "")) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "success";

  const sla = toText(incident.sla_status, "").toLowerCase();

  if (sla === "breached") return "failed";
  if (sla === "warning") return "retry";
  if (sla === "ok") return "success";

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) return "failed";

  return "unknown";
}

function getOpenedAt(incident: IncidentItem): string {
  return firstText([incident.opened_at, incident.created_at], "");
}

function getUpdatedAt(incident: IncidentItem): string {
  return firstText([incident.updated_at, incident.created_at], "");
}

function getResolvedAt(incident: IncidentItem): string {
  const resolvedAt = toText(incident.resolved_at, "");
  if (resolvedAt) return resolvedAt;

  if (getIncidentStatusNormalized(incident) === "resolved") {
    return firstText([incident.updated_at, incident.created_at], "");
  }

  return "";
}

function getWorkspace(incident: IncidentItem): string {
  return firstText([incident.workspace_id, incident.workspace], "—");
}

function getRunRecord(incident: IncidentItem): string {
  return firstText(
    [incident.run_record_id, incident.linked_run, incident.run_id],
    "—",
  );
}

function getCommandRecord(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;

  return firstText(
    [
      incident.linked_command,
      record.linked_command,
      record.Linked_Command,
      incident.command_id,
      record.command_id,
      record.Command_ID,
    ],
    "—",
  );
}

function getCommandRouteTargetFromIncident(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;

  const candidates = uniq([
    toText(incident.linked_command, ""),
    toText(record.linked_command, ""),
    toText(record.Linked_Command, ""),
    toText(incident.command_id, ""),
    toText(record.command_id, ""),
    toText(record.Command_ID, ""),
  ]);

  const recordLike = candidates.find((value) => isRecordIdLike(value));
  if (recordLike) return recordLike;

  return candidates[0] || "";
}

function getFlowId(incident: IncidentItem): string {
  return toText(incident.flow_id, "");
}

function getRootEventId(incident: IncidentItem): string {
  return toText(incident.root_event_id, "");
}

function getSourceRecordId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).source_record_id, "");
}

function getCategory(incident: IncidentItem): string {
  return firstText([incident.category], "—");
}

function getReason(incident: IncidentItem): string {
  return firstText([incident.reason], "—");
}

function getSuggestedAction(incident: IncidentItem): string {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated") return "Review escalated incident";
  if (severity === "critical") return "Prioritize immediate review";
  if (toText(incident.sla_status, "").toLowerCase() === "breached") {
    return "Review SLA breach";
  }
  if (status === "resolved") return "Verify final resolution state";

  return "Monitor flow and resolution";
}

function getResolutionNote(incident: IncidentItem): string {
  return toText(incident.resolution_note, "—");
}

function getLastAction(incident: IncidentItem): string {
  return toText(incident.last_action, "—");
}

function getBestFlowTargetFromIncident(incident: IncidentItem): string {
  return (
    getFlowId(incident) ||
    getSourceRecordId(incident) ||
    getRootEventId(incident) ||
    ""
  );
}

function getEventTargetFromIncident(incident: IncidentItem): string {
  const sourceRecordId = getSourceRecordId(incident);
  if (sourceRecordId && isRecordIdLike(sourceRecordId)) return sourceRecordId;

  const rootEventId = getRootEventId(incident);
  if (rootEventId && isRecordIdLike(rootEventId)) return rootEventId;

  return "";
}

function getIncidentRouteCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toText(incident.id, ""),
    toText(record.record_id, ""),
    toText(record.Record_ID, ""),
    toText(record.incident_id, ""),
    toText(record.Incident_ID, ""),
    toText(incident.error_id, ""),
  ]);
}

function matchesIncidentRouteId(incident: IncidentItem, id: string): boolean {
  const needle = id.trim();
  if (!needle) return false;
  return getIncidentRouteCandidates(incident).includes(needle);
}

function getCanonicalWorkspaceForIncidentLinks(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const incidentWorkspace = getWorkspace(incident).trim();
  if (incidentWorkspace && incidentWorkspace !== "—") return incidentWorkspace;
  return (activeWorkspaceId || "").trim();
}

function getFlowHref(incident: IncidentItem, activeWorkspaceId?: string): string {
  const target = getBestFlowTargetFromIncident(incident);
  if (!target) return "";

  const linkWorkspaceId = getCanonicalWorkspaceForIncidentLinks(
    incident,
    activeWorkspaceId,
  );

  return appendWorkspaceIdToHref(
    `/flows/${encodeURIComponent(target)}`,
    linkWorkspaceId || undefined,
  );
}

function getCommandHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const commandTarget = getCommandRouteTargetFromIncident(incident);
  if (!commandTarget) return "";

  const linkWorkspaceId = getCanonicalWorkspaceForIncidentLinks(
    incident,
    activeWorkspaceId,
  );

  return appendWorkspaceIdToHref(
    `/commands/${encodeURIComponent(commandTarget)}`,
    linkWorkspaceId || undefined,
  );
}

function getEventHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const eventTarget = getEventTargetFromIncident(incident);
  if (!eventTarget) return "";

  const linkWorkspaceId = getCanonicalWorkspaceForIncidentLinks(
    incident,
    activeWorkspaceId,
  );

  return appendWorkspaceIdToHref(
    `/events/${encodeURIComponent(eventTarget)}`,
    linkWorkspaceId || undefined,
  );
}

function getIncidentHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const canonicalIncidentId = String(incident.id || "").trim();
  if (!canonicalIncidentId) return "";

  const linkWorkspaceId = getCanonicalWorkspaceForIncidentLinks(
    incident,
    activeWorkspaceId,
  );

  return appendWorkspaceIdToHref(
    `/incidents/${encodeURIComponent(canonicalIncidentId)}`,
    linkWorkspaceId || undefined,
  );
}

function getSummaryLine(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);

  return `${safeUpper(status)} · ${safeUpper(severity)} · ${workspace} · ${category}`;
}

function isLegacyNoiseIncident(incident: IncidentItem): boolean {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = getCategory(incident).trim().toLowerCase();
  const reason = getReason(incident).trim().toLowerCase();
  const errorId = toText(incident.error_id, "");
  const resolutionNote = toText(incident.resolution_note, "");
  const lastAction = toText(incident.last_action, "");
  const flowId = getFlowId(incident);
  const rootEventId = getRootEventId(incident);
  const sourceRecordId = getSourceRecordId(incident);
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);

  const isGenericTitle = title === "incident" || title === "untitled incident";
  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";
  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const hasNoLinking =
    flowId === "" &&
    rootEventId === "" &&
    sourceRecordId === "" &&
    (commandRecord === "" || commandRecord === "—") &&
    (runRecord === "" || runRecord === "—");

  const hasStrongBusinessSignal =
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
    !hasStrongBusinessSignal
  );
}

function getShellBadgeToneFromStatus(incident: IncidentItem): ShellBadgeTone {
  const status = getIncidentStatusNormalized(incident);
  if (status === "resolved") return "success";
  if (status === "escalated") return "warning";
  if (status === "open") return "info";
  return "muted";
}

function getShellBadgeToneFromSeverity(incident: IncidentItem): ShellBadgeTone {
  const severity = getIncidentSeverityNormalized(incident);
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "low") return "success";
  return "muted";
}

function getShellBadgeToneFromSla(incident: IncidentItem): ShellBadgeTone {
  const sla = getSlaLabel(incident).toLowerCase();
  if (sla === "resolved" || sla === "ok") return "success";
  if (sla === "warning") return "warning";
  if (sla === "breached") return "danger";
  return "muted";
}

function getIncidentSignalPressureLabel(incident: IncidentItem): string {
  const severity = getIncidentSeverityNormalized(incident);
  const status = getIncidentStatusNormalized(incident);
  const sla = getSlaLabel(incident).toLowerCase();

  if (status === "resolved") return "Sous contrôle";
  if (status === "escalated" || severity === "critical" || sla === "breached") {
    return "Pression critique";
  }
  if (severity === "high" || sla === "warning") {
    return "Pression élevée";
  }
  return "À surveiller";
}

function getIncidentSignalPressureTone(
  incident: IncidentItem,
): "default" | "danger" | "success" | "warning" | "info" {
  const severity = getIncidentSeverityNormalized(incident);
  const status = getIncidentStatusNormalized(incident);
  const sla = getSlaLabel(incident).toLowerCase();

  if (status === "resolved") return "success";
  if (status === "escalated" || severity === "critical" || sla === "breached") {
    return "danger";
  }
  if (severity === "high" || sla === "warning") return "warning";
  return "info";
}

function getIncidentSignalEntryLabel(incident: IncidentItem): string {
  const command = getCommandRouteTargetFromIncident(incident);
  const flow = getBestFlowTargetFromIncident(incident);
  const event = getEventTargetFromIncident(incident);

  if (command) return "Entrée par command";
  if (flow) return "Entrée par flow";
  if (event) return "Entrée par event";
  return "Entrée incident";
}

function getIncidentSignalObservabilityLabel(incident: IncidentItem): string {
  const signals = [
    getBestFlowTargetFromIncident(incident),
    getCommandRouteTargetFromIncident(incident),
    getEventTargetFromIncident(incident),
    getRunRecord(incident) !== "—" ? getRunRecord(incident) : "",
  ].filter(Boolean).length;

  if (signals >= 4) return "Contexte enrichi";
  if (signals >= 2) return "Contexte relié";
  if (signals >= 1) return "Contexte partiel";
  return "Incident isolé";
}

function getIncidentSignalObservabilityTone(
  incident: IncidentItem,
): "default" | "danger" | "success" | "warning" | "info" {
  const label = getIncidentSignalObservabilityLabel(incident);
  if (label === "Contexte enrichi") return "success";
  if (label === "Contexte relié") return "info";
  if (label === "Contexte partiel") return "warning";
  return "default";
}

function getIncidentSignalNextMove(incident: IncidentItem): string {
  return getNextAction(incident) || getSuggestedAction(incident);
}

function getInvestigationEntryLabel(incident: IncidentItem): string {
  const commandTarget = getCommandRouteTargetFromIncident(incident);
  if (commandTarget) {
    return `Command ${compactTechnicalId(commandTarget)}`;
  }

  const flowTarget = getBestFlowTargetFromIncident(incident);
  if (flowTarget) {
    return `Flow ${compactTechnicalId(flowTarget)}`;
  }

  const eventTarget = getEventTargetFromIncident(incident);
  if (eventTarget) {
    return `Event ${compactTechnicalId(eventTarget)}`;
  }

  return `Incident ${compactTechnicalId(String(incident.id || ""))}`;
}

function getInvestigationModeLabel(incident: IncidentItem): string {
  const hasCommand = Boolean(getCommandRouteTargetFromIncident(incident));
  const hasFlow = Boolean(getBestFlowTargetFromIncident(incident));
  const hasEvent = Boolean(getEventTargetFromIncident(incident));

  if (hasCommand && hasFlow && hasEvent) return "Flow + command + event";
  if (hasCommand && hasFlow) return "Flow + command";
  if (hasFlow && hasEvent) return "Flow + event";
  if (hasCommand) return "Command-linked";
  if (hasFlow) return "Flow-linked";
  if (hasEvent) return "Event-linked";
  return "Record-only";
}

function getInvestigationFocusLabel(incident: IncidentItem): string {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const decision = getDecisionStatus(incident);
  if (decision) return `Decision ${decision.toUpperCase()}`;

  const reason = getReason(incident);
  if (reason && reason !== "—") return reason;

  return getSuggestedAction(incident);
}

function getInvestigationRouteLabel(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const sla = getSlaLabel(incident).toLowerCase();

  if (status === "resolved") return "Vérifier résolution";
  if (status === "escalated") return "Contrôler escalade";
  if (sla === "breached") return "Priorité SLA";
  if (severity === "critical" || severity === "high") return "Priorité sévérité";
  if (getCommandRouteTargetFromIncident(incident)) return "Commencer par la command";
  if (getBestFlowTargetFromIncident(incident)) return "Commencer par le flow";
  return "Lecture locale";
}

function getIncidentLinkCoverageCount(incident: IncidentItem): number {
  return [
    getBestFlowTargetFromIncident(incident),
    getCommandRouteTargetFromIncident(incident),
    getEventTargetFromIncident(incident),
    getRunRecord(incident) !== "—" ? getRunRecord(incident) : "",
  ].filter(Boolean).length;
}

function getExecutiveRiskLevel(incident: IncidentItem): ExecutiveRiskLevel {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const sla = getSlaLabel(incident).toLowerCase();
  const priorityScore = getPriorityScore(incident);

  if (status === "resolved") return "stable";
  if (status === "escalated" || severity === "critical" || sla === "breached") {
    return "critical";
  }
  if (severity === "high" || sla === "warning" || priorityScore >= 80) {
    return "elevated";
  }
  if (severity === "medium" || status === "open") {
    return "watch";
  }
  return "stable";
}

function getExecutiveRiskLabel(level: ExecutiveRiskLevel): string {
  if (level === "critical") return "Risque critique";
  if (level === "elevated") return "Risque élevé";
  if (level === "watch") return "À surveiller";
  return "Stable";
}

function getExecutiveRiskBadgeKind(level: ExecutiveRiskLevel): DashboardStatusKind {
  if (level === "critical") return "incident";
  if (level === "elevated") return "retry";
  if (level === "watch") return "queued";
  return "success";
}

function getExecutiveImpactLabel(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const sla = getSlaLabel(incident).toLowerCase();
  const coverage = getIncidentLinkCoverageCount(incident);

  if (status === "resolved") return "Impact contenu";
  if (status === "escalated") return "Escalade active";
  if (sla === "breached") return "Impact SLA réel";
  if (severity === "critical" || severity === "high") {
    return "Impact opérationnel probable";
  }
  if (coverage === 0) return "Contexte encore limité";
  return "Impact localisé";
}

function getExecutiveCoverageLabel(incident: IncidentItem): string {
  const coverage = getIncidentLinkCoverageCount(incident);

  if (coverage >= 4) return "Couverture enrichie";
  if (coverage >= 2) return "Couverture reliée";
  if (coverage >= 1) return "Couverture partielle";
  return "Couverture minimale";
}

function getExecutiveRecommendationLabel(incident: IncidentItem): string {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const decisionReason = getDecisionReason(incident);
  if (decisionReason) return decisionReason;

  const decisionStatus = getDecisionStatus(incident);
  if (decisionStatus) return `Confirmer ${decisionStatus.toLowerCase()}`;

  return getSuggestedAction(incident);
}

function getIncidentControlRouteLabel(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const hasCommand = Boolean(getCommandRouteTargetFromIncident(incident));
  const hasFlow = Boolean(getBestFlowTargetFromIncident(incident));

  if (status === "resolved") return "Pilotage de vérification";
  if (hasCommand) return "Pilotage par command";
  if (hasFlow) return "Pilotage par flow";
  return "Pilotage par incident";
}

function getIncidentControlActionLabel(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const sla = getSlaLabel(incident).toLowerCase();
  const decision = getDecisionStatus(incident).toLowerCase();
  const hasCommand = Boolean(getCommandRouteTargetFromIncident(incident));
  const hasFlow = Boolean(getBestFlowTargetFromIncident(incident));

  if (status === "resolved") {
    return "Vérifier la résolution puis clôturer la lecture";
  }
  if (decision === "escalate" || decision === "escalated") {
    return "Confirmer l’escalade puis revalider l’incident";
  }
  if (sla === "breached") {
    return "Contrôler l’incident puis confirmer l’état SLA";
  }
  if (hasCommand) {
    return "Ouvrir la command puis confirmer l’impact";
  }
  if (hasFlow) {
    return "Ouvrir le flow puis confirmer l’état";
  }
  return "Ouvrir l’incident puis confirmer l’état";
}

function getIncidentControlBadgeLabel(incident: IncidentItem): string {
  return getIncidentControlRouteLabel(incident).toUpperCase();
}

function countAvailableControlSurfaces(values: string[]): number {
  return uniq(values.filter(Boolean)).length;
}

function getModuleStateLabel(state: ModuleState): string {
  if (state === "available") return "AVAILABLE";
  if (state === "partial") return "PARTIAL";
  return "UNAVAILABLE";
}

function getModuleStateBadgeKind(state: ModuleState): DashboardStatusKind {
  if (state === "available") return "success";
  if (state === "partial") return "retry";
  return "unknown";
}

function getContextModuleState(incident: IncidentItem): ModuleState {
  const signals = [
    getCategory(incident) !== "—",
    getReason(incident) !== "—",
    getWorkspace(incident) !== "—",
    toText(incident.source, "") !== "",
    toText(incident.worker, "") !== "",
    toText(incident.error_id, "") !== "",
  ].filter(Boolean).length;

  if (signals >= 3) return "available";
  if (signals >= 1) return "partial";
  return "unavailable";
}

function getOrchestrationModuleState(incident: IncidentItem): ModuleState {
  const signals = [
    getDecisionStatus(incident),
    getDecisionReason(incident),
    getNextAction(incident),
    getSlaLabel(incident) !== "—" ? getSlaLabel(incident) : "",
    getPriorityScore(incident) > 0 ? String(getPriorityScore(incident)) : "",
  ].filter(Boolean).length;

  if (signals >= 3) return "available";
  if (signals >= 1) return "partial";
  return "unavailable";
}

function ModuleExtensionCard({
  title,
  state,
  summary,
  href,
  ctaLabel,
}: {
  title: string;
  state: ModuleState;
  summary: string;
  href?: string;
  ctaLabel: string;
}) {
  const disabled = !href || state === "unavailable";

  return (
    <article className="rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
      <div className={metaLabelClassName()}>{title}</div>

      <div className="mt-3">
        <DashboardStatusBadge
          kind={getModuleStateBadgeKind(state)}
          label={getModuleStateLabel(state)}
        />
      </div>

      <div className="mt-4 text-base leading-7 text-zinc-300 [overflow-wrap:anywhere]">
        {summary}
      </div>

      <div className="mt-5">
        {disabled ? (
          <span className={actionLinkClassName("soft", true)}>{ctaLabel}</span>
        ) : (
          <Link href={href} className={actionLinkClassName("soft")}>
            {ctaLabel}
          </Link>
        )}
      </div>
    </article>
  );
}

function MetaValueLink({
  href,
  value,
}: {
  href: string;
  value: string;
}) {
  if (!href || !value || value === "—") {
    return <span className="text-zinc-200">{value || "—"}</span>;
  }

  return (
    <Link
      href={href}
      className="break-all text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
    >
      {value}
    </Link>
  );
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "min-w-0 break-all" : "min-w-0"}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 min-w-0 text-zinc-200 [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success" | "warning" | "info";
}) {
  const valueTone =
    tone === "danger"
      ? "text-rose-200"
      : tone === "success"
        ? "text-emerald-200"
        : tone === "warning"
          ? "text-amber-200"
          : tone === "info"
            ? "text-sky-200"
            : "text-white";

  return (
    <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
      <div className={metaLabelClassName()}>{label}</div>
      <div
        className={`mt-2 min-w-0 text-base font-medium ${valueTone} [overflow-wrap:anywhere]`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function findIncidentInList(items: IncidentItem[], id: string): IncidentItem | null {
  const cleanItems = items.filter((item) => !isLegacyNoiseIncident(item));

  return (
    cleanItems.find((item) => matchesIncidentRouteId(item, id)) ||
    items.find((item) => matchesIncidentRouteId(item, id)) ||
    null
  );
}



/* Incident Detail V3.0-operator-action-console */
type IncidentDetailOperatorConsoleRecord = Record<string, unknown>;

function getIncidentDetailConsoleRecord(value: unknown): IncidentDetailOperatorConsoleRecord {
  if (!value || typeof value !== "object") return {};
  return value as IncidentDetailOperatorConsoleRecord;
}

function getIncidentDetailConsoleString(
  source: unknown,
  keys: string[],
  fallback = "UNKNOWN",
): string {
  const record = getIncidentDetailConsoleRecord(source);
  const nestedCandidates = [
    record,
    getIncidentDetailConsoleRecord(record.fields),
    getIncidentDetailConsoleRecord(record.payload),
    getIncidentDetailConsoleRecord(record.raw),
  ];

  for (const candidate of nestedCandidates) {
    for (const key of keys) {
      const value = candidate[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }

      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
    }
  }

  return fallback;
}

function getIncidentDetailConsoleStatus(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "status",
    "Status",
    "status_select",
    "Status_select",
    "incident_status",
    "Incident_Status",
  ], "UNKNOWN");
}

function getIncidentDetailConsoleSeverity(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "severity",
    "Severity",
    "risk",
    "Risk",
    "priority",
    "Priority",
  ], "UNKNOWN");
}

function getIncidentDetailConsoleWorkspace(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "workspaceId",
    "workspace_id",
    "Workspace_ID",
    "workspace",
    "Workspace",
  ], "default");
}

function getIncidentDetailConsoleCommandId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "commandId",
    "command_id",
    "Command_ID",
    "linkedCommand",
    "linked_command",
    "Linked_Command",
    "commandRecordId",
    "Command_Record_ID",
  ], "");
}

function getIncidentDetailConsoleRunId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "runId",
    "run_id",
    "Run_ID",
    "runRecordId",
    "run_record_id",
    "Run_Record_ID",
    "linkedRun",
    "Linked_Run",
  ], "");
}

function getIncidentDetailConsoleFlowId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "flowId",
    "flow_id",
    "Flow_ID",
  ], "");
}

function getIncidentDetailConsoleEventId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "eventId",
    "event_id",
    "Event_ID",
    "rootEventId",
    "root_event_id",
    "Root_Event_ID",
    "sourceEventId",
    "source_event_id",
    "Source_Event_ID",
  ], "");
}

function getIncidentDetailConsoleId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "id",
    "recordId",
    "record_id",
    "Record_ID",
    "incidentId",
    "incident_id",
    "Incident_ID",
  ], "incident");
}

function getIncidentDetailReadiness(args: {
  status: string;
  severity: string;
  commandId: string;
}): "READY TO ACT" | "NEEDS CONTEXT" | "WATCH ONLY" {
  const status = args.status.toLowerCase();
  const severity = args.severity.toLowerCase();

  if (
    status.includes("resolved") ||
    status.includes("closed") ||
    severity.includes("low")
  ) {
    return "WATCH ONLY";
  }

  if (!args.commandId) {
    return "NEEDS CONTEXT";
  }

  if (
    status.includes("escalated") ||
    status.includes("open") ||
    severity.includes("high") ||
    severity.includes("critical")
  ) {
    return "READY TO ACT";
  }

  return "NEEDS CONTEXT";
}

function getIncidentDetailConfidence(args: {
  commandId: string;
  flowId: string;
  runId: string;
}): "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE" {
  if (args.commandId && args.flowId) return "HIGH CONFIDENCE";
  if (args.commandId || args.runId || args.flowId) return "MEDIUM CONFIDENCE";
  return "LOW CONFIDENCE";
}

function getIncidentDetailTargetSurface(args: {
  commandId: string;
  flowId: string;
  runId: string;
}): string {
  if (args.commandId) return "OPEN COMMAND";
  if (args.flowId) return "OPEN FLOW";
  if (args.runId) return "OPEN RUN";
  return "INCIDENT CONTEXT";
}

function getIncidentDetailDecision(readiness: "READY TO ACT" | "NEEDS CONTEXT" | "WATCH ONLY"): string {
  if (readiness === "READY TO ACT") return "Intervenir via la surface liée";
  if (readiness === "NEEDS CONTEXT") return "Compléter le contexte avant action";
  return "Surveiller sans exécution";
}

function getIncidentDetailPrimaryAction(readiness: "READY TO ACT" | "NEEDS CONTEXT" | "WATCH ONLY"): string {
  if (readiness === "READY TO ACT") return "Ouvrir la command liée";
  if (readiness === "NEEDS CONTEXT") return "Vérifier les liens d’exécution";
  return "Surveiller l’incident";
}

function buildIncidentDetailHref(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "UNKNOWN") search.set(key, value);
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function IncidentDetailOperatorActionConsole({
  incident,
  queueFilter,
}: {
  incident: unknown;
  queueFilter?: string | null;
}) {
  const incidentId = getIncidentDetailConsoleId(incident);
  const status = getIncidentDetailConsoleStatus(incident);
  const severity = getIncidentDetailConsoleSeverity(incident);
  const workspaceId = getIncidentDetailConsoleWorkspace(incident);
  const commandId = getIncidentDetailConsoleCommandId(incident);
  const runId = getIncidentDetailConsoleRunId(incident);
  const flowId = getIncidentDetailConsoleFlowId(incident);
  const eventId = getIncidentDetailConsoleEventId(incident);

  const readiness = getIncidentDetailReadiness({
    status,
    severity,
    commandId,
  });

  const confidence = getIncidentDetailConfidence({
    commandId,
    flowId,
    runId,
  });

  const targetSurface = getIncidentDetailTargetSurface({
    commandId,
    flowId,
    runId,
  });

  const decision = getIncidentDetailDecision(readiness);
  const primaryAction = getIncidentDetailPrimaryAction(readiness);

  const incidentsHref = buildIncidentDetailHref("/incidents", {
    workspace_id: workspaceId,
  });

  const queueHref = buildIncidentDetailHref("/incidents", {
    workspace_id: workspaceId,
    queue: queueFilter || "now",
  });

  const allQueuesHref = buildIncidentDetailHref("/incidents", {
    workspace_id: workspaceId,
    queue: "all",
  });

  const commandHref = commandId
    ? buildIncidentDetailHref(`/commands/${encodeURIComponent(commandId)}`, {
        workspace_id: workspaceId,
        flow_id: flowId,
        root_event_id: eventId,
      })
    : "";

  const flowHref = flowId
    ? buildIncidentDetailHref(`/flows/${encodeURIComponent(flowId)}`, {
        workspace_id: workspaceId,
        root_event_id: eventId,
      })
    : "";

  const runHref = runId
    ? buildIncidentDetailHref(`/runs/${encodeURIComponent(runId)}`, {
        workspace_id: workspaceId,
        flow_id: flowId,
      })
    : "";

  const actionHref = commandHref || flowHref || runHref || incidentsHref;

  {/* Incident Detail V3.1-execution-path-polish */}
  const hasCommandPath = Boolean(commandId);
  const hasRunPath = Boolean(runId);
  const hasFlowPath = Boolean(flowId);
  const hasEventPath = Boolean(eventId);

  const executionPathAvailableCount = [
    hasCommandPath,
    hasRunPath,
    hasFlowPath,
    hasEventPath,
  ].filter(Boolean).length;

  const executionPathHealth =
    hasCommandPath && hasRunPath && hasFlowPath && hasEventPath
      ? "COMPLETE PATH"
      : hasCommandPath || hasFlowPath
        ? "ACTIONABLE PATH"
        : executionPathAvailableCount > 0
          ? "PARTIAL PATH"
          : "MISSING PATH";

  const executionPathRecommendation =
    executionPathHealth === "COMPLETE PATH"
      ? "Le chemin d’exécution est complet et navigable."
      : executionPathHealth === "ACTIONABLE PATH"
        ? "Une surface d’action est disponible pour continuer l’investigation."
        : executionPathHealth === "PARTIAL PATH"
          ? "Le chemin est partiel : utiliser la meilleure surface disponible."
          : "Aucune surface d’exécution liée n’est détectée pour cet incident.";

  const executionPathHealthClassName =
    executionPathHealth === "COMPLETE PATH"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
      : executionPathHealth === "ACTIONABLE PATH"
        ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
        : executionPathHealth === "PARTIAL PATH"
          ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";

  const getExecutionPathStepState = (
    hasValue: boolean,
  ): "AVAILABLE" | "MISSING" | "PARTIAL" => {
    if (hasValue) return "AVAILABLE";
    if (executionPathAvailableCount > 0) return "PARTIAL";
    return "MISSING";
  };

  const getExecutionPathStepClassName = (
    state: "AVAILABLE" | "MISSING" | "PARTIAL",
  ): string => {
    if (state === "AVAILABLE") {
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    }

    if (state === "PARTIAL") {
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    }

    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  };

  const executionPathSteps = [
    {
      label: "Incident",
      value: incidentId,
      state: "AVAILABLE" as const,
      href: "",
    },
    {
      label: "Command",
      value: commandId || "No linked command",
      state: getExecutionPathStepState(hasCommandPath),
      href: commandHref,
    },
    {
      label: "Run",
      value: runId || "No linked run",
      state: getExecutionPathStepState(hasRunPath),
      href: runHref,
    },
    {
      label: "Flow",
      value: flowId || "No linked flow",
      state: getExecutionPathStepState(hasFlowPath),
      href: flowHref,
    },
    {
      label: "Event",
      value: eventId || "No linked event",
      state: getExecutionPathStepState(hasEventPath),
      href: "",
    },
  ];


  const readinessClassName =
    readiness === "READY TO ACT"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : readiness === "NEEDS CONTEXT"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-sky-400/25 bg-sky-500/10 text-sky-200";


  const previewSurfaceTarget =
    commandId ? "Command" : flowId ? "Flow" : runId ? "Run" : "Incident context";

  const previewRiskLevel = (() => {
    const riskSource = `${status} ${severity}`.toLowerCase();

    if (
      riskSource.includes("critical") ||
      riskSource.includes("high") ||
      riskSource.includes("escalated")
    ) {
      return "HIGH RISK";
    }

    if (riskSource.includes("medium")) return "MEDIUM RISK";

    if (
      riskSource.includes("low") ||
      riskSource.includes("resolved") ||
      riskSource.includes("closed")
    ) {
      return "LOW RISK";
    }

    return "UNKNOWN RISK";
  })();

  const previewConfidenceLevel =
    commandId && flowId
      ? "HIGH CONFIDENCE"
      : commandId || flowId
        ? "MEDIUM CONFIDENCE"
        : "LOW CONFIDENCE";

  const previewPrimaryHref = commandHref || flowHref || runHref || incidentsHref;

  const previewPrimaryAction =
    commandId
      ? "Prévisualiser la command liée"
      : flowId
        ? "Prévisualiser le flow lié"
        : runId
          ? "Prévisualiser le run lié"
          : "Prévisualiser le contexte incident";

  const currentIncidentHref = buildIncidentDetailHref(
    `/incidents/${encodeURIComponent(incidentId)}`,
    {
      workspace_id: workspaceId,
      queue: queueFilter || "",
    },
  );

  const previewModeClassName =
    "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";

  const previewRiskClassName =
    previewRiskLevel === "HIGH RISK"
      ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
      : previewRiskLevel === "MEDIUM RISK"
        ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
        : previewRiskLevel === "LOW RISK"
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";

  const previewWhatWillHappen = [
    "BOSAI ouvrira la meilleure surface liée disponible.",
    "L’opérateur pourra inspecter Command / Run / Flow.",
    "Aucune exécution automatique ne sera déclenchée.",
    "Aucune donnée Airtable ne sera modifiée.",
  ];

  const previewWhatWillNotHappen = [
    "Aucun appel worker.",
    "Aucun POST /run.",
    "Aucune mutation Airtable.",
    "Aucun changement de statut incident.",
    "Aucun retry déclenché.",
    "Aucune escalade automatique.",
  ];

  const previewTargetCards = [
    ["Action prévue", previewPrimaryAction],
    ["Surface cible", previewSurfaceTarget],
    ["Command cible", commandId || "No linked command"],
    ["Run cible", runId || "No linked run"],
    ["Flow cible", flowId || "No linked flow"],
    ["Workspace", workspaceId],
    ["Risque", previewRiskLevel],
    ["Confiance", previewConfidenceLevel],
    ["Readiness", readiness],
  ];


  const safeIntentStatus = (() => {
    const statusSource = `${status} ${severity}`.toLowerCase();

    if (
      statusSource.includes("resolved") ||
      statusSource.includes("closed") ||
      statusSource.includes("low")
    ) {
      return "WATCH ONLY";
    }

    if ((commandId || flowId) && readiness === "READY TO ACT") {
      return "READY TO PREPARE";
    }

    if (!commandId && !flowId) {
      return "NEEDS CONTEXT";
    }

    return "NOT ARMED";
  })();

  const safeExecutionMode = "INTENT ONLY";
  const safeArmState = "NOT ARMED";

  const safeIntentStatusClassName =
    safeIntentStatus === "READY TO PREPARE"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
      : safeIntentStatus === "NEEDS CONTEXT"
        ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
        : safeIntentStatus === "WATCH ONLY"
          ? "border-sky-400/30 bg-sky-500/15 text-sky-100"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";

  const safeExecutionIntentCards = [
    ["Intent Status", safeIntentStatus],
    ["Target Surface", previewSurfaceTarget],
    ["Target Command", commandId || "No linked command"],
    ["Target Flow", flowId || "No linked flow"],
    ["Workspace", workspaceId],
    ["Risk Level", previewRiskLevel],
    ["Confidence", previewConfidenceLevel],
    ["Readiness", readiness],
    ["Execution Mode", safeExecutionMode],
  ];

  const safeExecutionPreconditions = [
    {
      label: "Workspace identifié",
      state: workspaceId ? "OK" : "MISSING",
      detail: workspaceId || "Aucun workspace détecté.",
    },
    {
      label: "Incident identifié",
      state: incidentId ? "OK" : "MISSING",
      detail: incidentId || "Aucun incident détecté.",
    },
    {
      label: "Surface cible détectée",
      state: commandId || flowId || runId ? "OK" : "MISSING",
      detail: previewSurfaceTarget,
    },
    {
      label: "Command liée disponible si présente",
      state: commandId ? "OK" : "MISSING",
      detail: commandId || "Aucune command liée.",
    },
    {
      label: "Flow lié disponible si présent",
      state: flowId ? "OK" : "MISSING",
      detail: flowId || "Aucun flow lié.",
    },
    {
      label: "Preview validée visuellement",
      state: "REQUIRED",
      detail: "Validation opérateur requise avant toute future exécution.",
    },
    {
      label: "Confirmation opérateur requise",
      state: "REQUIRED",
      detail: "Aucune exécution ne peut être lancée sans confirmation humaine.",
    },
  ] as const;

  const getPreconditionClassName = (state: "OK" | "MISSING" | "REQUIRED") => {
    if (state === "OK") {
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
    }

    if (state === "REQUIRED") {
      return "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";
    }

    return "border-amber-400/30 bg-amber-500/15 text-amber-100";
  };

  const safeExecutionGuardrails = [
    "Aucun POST /run.",
    "Aucun appel worker.",
    "Aucune mutation Airtable.",
    "Aucun changement de statut incident.",
    "Aucun retry déclenché.",
    "Aucune escalade automatique.",
    "Confirmation humaine requise.",
    "Future exécution devra passer par une couche dédiée.",
  ];

  return (
    <section className="w-full rounded-[2rem] border border-cyan-400/20 bg-cyan-950/15 p-4 shadow-[0_0_80px_rgba(34,211,238,0.08)] sm:p-6">
      {/* Incident Detail V3.0-operator-action-console */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/60">
            Operator Action Console
          </p>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Console opérateur incident
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Lecture décisionnelle locale : aucune action exécutée, aucune écriture base, aucun appel worker.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Incident
            </p>
            <p className="mt-3 break-words text-base font-semibold text-white">
              {incidentId}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Statut / sévérité
            </p>
            <p className="mt-3 text-base font-semibold text-white">
              {status} · {severity}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Workspace
            </p>
            <p className="mt-3 break-words text-base font-semibold text-white">
              {workspaceId}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
              Décision opérateur
            </p>
            <p className="mt-3 text-xl font-semibold text-white">
              {decision}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                {targetSurface}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
                {confidence}
              </span>
            </div>
          </div>

          <div className={`rounded-3xl border p-4 ${readinessClassName}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">
              Action Readiness
            </p>
            <p className="mt-3 text-xl font-semibold text-white">
              {readiness}
            </p>
            <p className="mt-3 text-sm leading-6 opacity-80">
              {primaryAction}
            </p>
          </div>
        </div>

                        <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-950/20 p-4 shadow-[0_0_80px_rgba(34,211,238,0.07)] sm:p-5">
          {/* Incident Detail V3.2-execution-preview */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                Execution Preview
              </p>
              <h3 className="text-xl font-semibold text-white">
                Prévisualisation avant exécution
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                Cette section décrit ce qui serait ouvert ou inspecté. Elle ne déclenche aucune action réelle.
              </p>
            </div>

            <span
              className={`inline-flex max-w-full rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${previewModeClassName}`}
            >
              PREVIEW ONLY
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {previewTargetCards.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-2 break-words text-sm font-semibold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                What will happen
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                {previewWhatWillHappen.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                What will NOT happen
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                {previewWhatWillNotHappen.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] border-cyan-400/30 bg-cyan-500/15 text-cyan-100">
              {previewSurfaceTarget}
            </span>

            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${previewRiskClassName}`}>
              {previewRiskLevel}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
              {previewConfidenceLevel}
            </span>

            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              {readiness}
            </span>

            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              NO EXECUTION
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <a
              href={previewPrimaryHref}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              {previewPrimaryAction}
            </a>

            {commandHref ? (
              <a
                href={commandHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Prévisualiser la command liée
              </a>
            ) : null}

            {flowHref ? (
              <a
                href={flowHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Prévisualiser le flow lié
              </a>
            ) : null}

            <a
              href={currentIncidentHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Retour Incident
            </a>

            {queueFilter ? (
              <a
                href={queueHref}
                className="inline-flex items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15"
              >
                Retour file active
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-950/20 p-4 shadow-[0_0_80px_rgba(16,185,129,0.07)] sm:p-5">
          {/* Incident Detail V3.3-safe-execution-intent */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                Safe Execution Intent
              </p>
              <h3 className="text-xl font-semibold text-white">
                Intention d’exécution sécurisée
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                Cette couche prépare l’intention opérateur sans armer ni exécuter une action réelle.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex max-w-full rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                INTENT ONLY
              </span>
              <span className="inline-flex max-w-full rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                NOT ARMED
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {safeExecutionIntentCards.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-2 break-words text-sm font-semibold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${safeIntentStatusClassName}`}>
              {safeIntentStatus}
            </span>

            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {safeExecutionMode}
            </span>

            <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
              {safeArmState}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                Execution Preconditions
              </p>

              <div className="mt-4 space-y-3">
                {safeExecutionPreconditions.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getPreconditionClassName(item.state)}`}
                      >
                        {item.state}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-xs leading-5 text-zinc-400">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                Safety Guardrails
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                {safeExecutionGuardrails.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Execution Mode
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  L’intention est préparée mais non armée. La future exécution devra passer par une couche dédiée.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 opacity-70"
              >
                Execution intent prepared
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {commandHref ? (
              <a
                href={commandHref}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Ouvrir la command liée
              </a>
            ) : null}

            {flowHref ? (
              <a
                href={flowHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Ouvrir le flow lié
              </a>
            ) : null}

            <a
              href={incidentsHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Retour Incidents
            </a>

            {queueFilter ? (
              <a
                href={queueHref}
                className="inline-flex items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15"
              >
                Retour file active
              </a>
            ) : null}
          </div>
        </div>

<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="rounded-[2rem] border border-amber-400/20 bg-amber-950/20 p-4 shadow-[0_0_80px_rgba(245,158,11,0.06)] sm:p-5">
          {/* Incident Detail V3.4-minimal-safe-run-draft-anchor */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/70">
                Safe Run Draft
              </p>
              <h3 className="text-xl font-semibold text-white">
                Brouillon sécurisé non armé
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                Point d’ancrage visuel pour le futur dry run. Cette carte ne lit aucune donnée dynamique,
                ne déclenche aucune action et ne modifie aucun système.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                DRAFT ONLY
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                NOT ARMED
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Endpoint
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-white">
                POST /run
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Affichage informatif uniquement.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Worker Call
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Disabled
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Aucun appel worker.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Airtable Mutation
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Disabled
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Aucune écriture base.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Execution State
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Safe Draft
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Préparation visuelle seulement.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
              Safety Lock
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                No POST /run
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                No Worker Call
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                No Airtable Mutation
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                Human Confirmation Required
              </span>
            </div>
          </div>
        </div>
        {(() => {
          {/* Incident Detail V3.5-dry-run-readiness-review */}
          const dryRunReadinessStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "READY FOR DRY RUN"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "PARTIAL READINESS"
                : executionPathHealth === "MISSING PATH"
                  ? "BLOCKED"
                  : "NOT EXECUTABLE";

          const dryRunRecommendation =
            dryRunReadinessStatus === "READY FOR DRY RUN"
              ? "Le contexte est suffisant pour préparer un futur dry run contrôlé."
              : dryRunReadinessStatus === "PARTIAL READINESS"
                ? "Le contexte est partiel : vérifier la meilleure surface disponible avant toute simulation future."
                : dryRunReadinessStatus === "BLOCKED"
                  ? "Le contexte est incomplet : impossible de préparer un dry run fiable."
                  : "Sécurité par défaut : aucune exécution ne peut être préparée depuis cet état.";

          const dryRunReadinessItems = [
            {
              label: "Workspace identifié",
              status: dryRunReadinessStatus === "BLOCKED" || dryRunReadinessStatus === "NOT EXECUTABLE" ? "MISSING" : "OK",
              note: "Contexte workspace requis pour tout dry run futur.",
            },
            {
              label: "Incident identifié",
              status: dryRunReadinessStatus === "BLOCKED" || dryRunReadinessStatus === "NOT EXECUTABLE" ? "MISSING" : "OK",
              note: "Incident source nécessaire pour garder la traçabilité.",
            },
            {
              label: "Command liée disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : dryRunReadinessStatus === "PARTIAL READINESS" ? "MISSING" : "MISSING",
              note: "Surface d’action prioritaire pour une simulation contrôlée.",
            },
            {
              label: "Run lié disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : "MISSING",
              note: "Run utile pour relier l’exécution simulée à l’historique.",
            },
            {
              label: "Flow lié disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : dryRunReadinessStatus === "PARTIAL READINESS" ? "MISSING" : "MISSING",
              note: "Flow requis pour comprendre la chaîne complète.",
            },
            {
              label: "Root event disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : "MISSING",
              note: "Événement racine utile pour conserver la causalité.",
            },
            {
              label: "Dry run draft visible",
              status: "OK",
              note: "Le brouillon V3.4 est visible et non armé.",
            },
            {
              label: "Execution intent non armée",
              status: "LOCKED",
              note: "L’intention reste strictement non exécutable.",
            },
            {
              label: "Safety guardrails visibles",
              status: "OK",
              note: "Les garde-fous de sécurité restent affichés.",
            },
            {
              label: "Confirmation humaine requise",
              status: "REQUIRED",
              note: "Aucune future exécution sans validation opérateur.",
            },
          ];

          const dryRunBadgeClassName = (status: string) => {
            if (status === "READY FOR DRY RUN" || status === "OK") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "PARTIAL READINESS" || status === "REQUIRED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-950/15 p-4 shadow-[0_0_80px_rgba(16,185,129,0.06)] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                    Dry Run Readiness Review
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Revue de préparation dry run
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Vérification visuelle locale du contexte avant un futur dry run contrôlé.
                    Aucun appel worker, aucun POST /run et aucune mutation ne sont exécutés.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${dryRunBadgeClassName(dryRunReadinessStatus)}`}>
                    {dryRunReadinessStatus}
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NO EXECUTION
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Readiness Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {dryRunReadinessStatus}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Safety Check
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    NO EXECUTION
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Worker Call
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    NO WORKER CALL
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Airtable Mutation
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    NO AIRTABLE MUTATION
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Dry Run Recommendation
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {dryRunRecommendation}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70"
                  >
                    {dryRunReadinessStatus === "READY FOR DRY RUN"
                      ? "Dry run readiness checked"
                      : "Dry run not executable yet"}
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/70">
                  Readiness Checklist
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {dryRunReadinessItems.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {item.label}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            {item.note}
                          </p>
                        </div>

                        <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${dryRunBadgeClassName(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Safety Check
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO EXECUTION
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO WORKER CALL
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO AIRTABLE MUTATION
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    HUMAN CONFIRMATION REQUIRED
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
        {(() => {
          const dryRunPayloadStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "PAYLOAD READY"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "PAYLOAD PARTIAL"
                : executionPathHealth === "MISSING PATH"
                  ? "PAYLOAD BLOCKED"
                  : "PREVIEW ONLY";

          const dryRunPayloadCapability =
            dryRunPayloadStatus === "PAYLOAD READY"
              ? "command_orchestrator"
              : dryRunPayloadStatus === "PAYLOAD PARTIAL"
                ? "flow_context"
                : "incident_context";

          const dryRunPayloadPreview = [
            "{",
            '  "capability": "' + dryRunPayloadCapability + '",',
            '  "workspace_id": "<workspace_id>",',
            '  "incident_id": "<incident_id>",',
            '  "command_id": "<command_id>",',
            '  "run_id": "<run_id>",',
            '  "flow_id": "<flow_id>",',
            '  "root_event_id": "<root_event_id>",',
            '  "dry_run": true,',
            '  "source": "dashboard_incident_detail_v3_6"',
            "}",
          ].join("\n");

          const payloadSafetyNotes = [
            { label: "Payload affiché en lecture seule", status: "SAFE" },
            { label: "Aucun POST /run", status: "NO EXECUTION" },
            { label: "Aucun appel worker", status: "LOCKED" },
            { label: "Aucune mutation Airtable", status: "LOCKED" },
            { label: "Aucun changement de statut incident", status: "SAFE" },
            { label: "Aucun retry déclenché", status: "SAFE" },
            { label: "Aucune escalade automatique", status: "SAFE" },
            { label: "Confirmation humaine requise avant toute future exécution", status: "REQUIRED" },
          ];

          const payloadBadgeClassName = (status: string) => {
            if (status === "PAYLOAD READY" || status === "SAFE") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "PAYLOAD PARTIAL" || status === "REQUIRED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-950/15 p-4 shadow-[0_0_90px_rgba(34,211,238,0.06)] sm:p-5">
              {/* Incident Detail V3.6-dry-run-payload-preview */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                    Dry Run Payload Preview
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Aperçu payload dry run
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Payload prévisualisé en lecture seule. Cette section ne déclenche aucun POST /run,
                    aucun appel worker et aucune mutation Airtable.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${payloadBadgeClassName(dryRunPayloadStatus)}`}>
                    {dryRunPayloadStatus}
                  </span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                    PAYLOAD PREVIEW ONLY
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NO POST /run
                  </span>
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100">
                    NOT ARMED
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Payload Status", dryRunPayloadStatus],
                  ["Target Endpoint", "POST /run"],
                  ["Capability", dryRunPayloadCapability],
                  ["Dry Run Mode", "dry_run: true"],
                  ["Execution State", "PREVIEW ONLY"],
                  ["Source", "dashboard_incident_detail_v3_6"],
                  ["Worker Call", "DISABLED"],
                  ["Airtable Mutation", "DISABLED"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Read-only JSON
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Structure future du payload dry run. Affichage uniquement.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70"
                  >
                    Payload preview generated
                  </button>
                </div>

                <pre className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-cyan-400/20 bg-black/50 p-4 text-xs leading-6 text-cyan-100">
                  <code>{dryRunPayloadPreview}</code>
                </pre>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Payload Safety Notes
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {payloadSafetyNotes.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-semibold leading-6 text-white">
                          {item.label}
                        </p>

                        <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${payloadBadgeClassName(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
        {(() => {
          const confirmationGateStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "READY TO CONFIRM"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "REVIEW REQUIRED"
                : "CONFIRMATION BLOCKED";

          const confirmationGateRecommendation =
            confirmationGateStatus === "READY TO CONFIRM"
              ? "Le contexte est prêt pour une future confirmation opérateur, mais aucune exécution n’est armée."
              : confirmationGateStatus === "REVIEW REQUIRED"
                ? "Le contexte doit être revu avant toute future préparation de dry run."
                : "La confirmation reste bloquée tant que le chemin d’exécution est incomplet.";

          const confirmationGateItems = [
            { label: "Payload preview affiché", status: "OK" },
            { label: "Readiness review disponible", status: "OK" },
            { label: "Execution intent non armée", status: "LOCKED" },
            { label: "POST /run désactivé", status: "NO EXECUTION" },
            { label: "Worker call désactivé", status: "LOCKED" },
            { label: "Mutation Airtable désactivée", status: "LOCKED" },
            { label: "Confirmation humaine requise", status: "REQUIRED" },
            { label: "Future dry run non branché", status: "GATED" },
          ];

          const confirmationBadgeClassName = (status: string) => {
            if (status === "READY TO CONFIRM" || status === "OK") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "REVIEW REQUIRED" || status === "REQUIRED" || status === "GATED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-amber-400/20 bg-amber-950/15 p-4 shadow-[0_0_90px_rgba(245,158,11,0.06)] sm:p-5">
              {/* Incident Detail V3.7-dry-run-confirmation-gate */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/70">
                    Dry Run Confirmation Gate
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Porte de confirmation opérateur
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Dernière barrière visuelle avant un futur dry run. Cette section prépare la
                    confirmation humaine sans déclencher aucun appel, aucune action et aucune mutation.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${confirmationBadgeClassName(confirmationGateStatus)}`}>
                    {confirmationGateStatus}
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                    CONFIRMATION REQUIRED
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NO EXECUTION
                  </span>
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
                    GATED
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Gate Status", confirmationGateStatus],
                  ["Execution Mode", "CONFIRMATION ONLY"],
                  ["POST /run", "DISABLED"],
                  ["Worker Call", "DISABLED"],
                  ["Airtable Mutation", "DISABLED"],
                  ["Human Confirmation", "REQUIRED"],
                  ["Future Dry Run", "GATED"],
                  ["Current Action", "NO EXECUTION"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Confirmation Recommendation
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {confirmationGateRecommendation}
                </p>

                <button
                  type="button"
                  disabled
                  className="mt-4 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70 sm:w-auto"
                >
                  Confirm dry run preparation
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-100/70">
                  Final Confirmation Checklist
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {confirmationGateItems.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-semibold leading-6 text-white">
                          {item.label}
                        </p>

                        <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${confirmationBadgeClassName(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Execution Lock
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO POST /run
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO WORKER CALL
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO AIRTABLE MUTATION
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    OPERATOR CONFIRMATION REQUIRED
                  </span>
                </div>
              </div>
            </div>
          );
        })()}








            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/70">
                Linked Execution Path
              </p>
              <h3 className="text-xl font-semibold text-white">
                Execution Path Health
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                {executionPathRecommendation}
              </p>
            </div>

            <span
              className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${executionPathHealthClassName}`}
            >
              {executionPathHealth}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
            {executionPathSteps.map((step) => (
              <div
                key={step.label}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    {step.label}
                  </p>

                  <span
                    className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getExecutionPathStepClassName(step.state)}`}
                  >
                    {step.state}
                  </span>
                </div>

                <p className="mt-3 break-words text-sm font-medium text-white">
                  {step.value}
                </p>

                {step.href ? (
                  <a
                    href={step.href}
                    className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    Ouvrir
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="break-words text-sm text-zinc-300">
              Incident → Command → Run → Flow → Event
            </p>
          </div>
        </div>

<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <a
            href={actionHref}
            className="inline-flex items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            {primaryAction}
          </a>

          {commandHref ? (
            <a
              href={commandHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir la command liée
            </a>
          ) : null}

          {runHref ? (
            <a
              href={runHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir le run lié
            </a>
          ) : null}

          {flowHref ? (
            <a
              href={flowHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir le flow lié
            </a>
          ) : null}

          <a
            href={incidentsHref}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Retour Incidents
          </a>

          {queueFilter ? (
            <a
              href={queueHref}
              className="inline-flex items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15"
            >
              Retour file active
            </a>
          ) : null}

          <a
            href={allQueuesHref}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Retour All queues
          </a>
        </div>
      </div>
    </section>
  );
}

export default async function IncidentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {},
  )) as SearchParams;

  const cookieStore = await cookies();

  const workspaceContext = resolveWorkspaceContext({
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

  const activeWorkspaceId = workspaceContext.activeWorkspaceId || "";
  const id = decodeURIComponent(resolvedParams.id);

  const incomingFrom = firstParam(resolvedSearchParams.from).trim();
  const incomingFlowId = firstParam(resolvedSearchParams.flow_id).trim();
  const incomingRootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const incomingSourceRecordId =
    firstParam(resolvedSearchParams.source_record_id).trim() ||
    firstParam(resolvedSearchParams.source_event_id).trim();
  const incomingCommandId = firstParam(resolvedSearchParams.command_id).trim();

  let scopedData: IncidentsResponse | null = null;

  try {
    scopedData = await fetchIncidents({
      workspaceId: activeWorkspaceId || undefined,
      limit: 500,
    });
  } catch {
    scopedData = null;
  }

  const scopedIncidents: IncidentItem[] = Array.isArray(scopedData?.incidents)
    ? scopedData.incidents
    : [];

  const workspaceScoped = scopedIncidents.filter((item) =>
    workspaceMatchesOrUnscoped(getWorkspace(item), activeWorkspaceId),
  );

  let incident = findIncidentInList(workspaceScoped, id);

  if (!incident) {
    try {
      const fallbackData = await fetchIncidents({ limit: 500 });
      const fallbackIncidents: IncidentItem[] = Array.isArray(
        fallbackData?.incidents,
      )
        ? fallbackData.incidents
        : [];
      incident = findIncidentInList(fallbackIncidents, id);
    } catch {
      incident = null;
    }
  }

  if (!incident) {
    notFound();
  }

  const title = makeWrapFriendly(getIncidentTitle(incident));
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const openedAt = getOpenedAt(incident);
  const updatedAt = getUpdatedAt(incident);
  const resolvedAt = getResolvedAt(incident);
  const flowId = getFlowId(incident);
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);
  const rootEventId = getRootEventId(incident);
  const sourceRecordId = getSourceRecordId(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);
  const reason = getReason(incident);
  const suggestedAction = getSuggestedAction(incident);
  const slaLabel = getSlaLabel(incident);
  const resolutionNote = getResolutionNote(incident);
  const lastAction = getLastAction(incident);
  const errorId = toText(incident.error_id, "—");
  const decisionStatus = getDecisionStatus(incident);
  const decisionReason = getDecisionReason(incident);
  const nextAction = getNextAction(incident);
  const priorityScore = getPriorityScore(incident);

  const effectiveWorkspaceId =
    activeWorkspaceId || (workspace !== "—" ? workspace : "");

  const flowHref = getFlowHref(incident, effectiveWorkspaceId);
  const commandHref = getCommandHref(incident, effectiveWorkspaceId);
  const eventHref = getEventHref(incident, effectiveWorkspaceId);
  const canonicalIncidentHref = getIncidentHref(incident, effectiveWorkspaceId);

  const incidentsHref = appendWorkspaceAndParams(
    "/incidents",
    effectiveWorkspaceId,
    {
      from: incomingFrom || undefined,
      flow_id: incomingFlowId || undefined,
      root_event_id: incomingRootEventId || undefined,
      source_record_id: incomingSourceRecordId || undefined,
      command_id: incomingCommandId || undefined,
    },
  );

  const allIncidentsHref = appendWorkspaceIdToHref(
    "/incidents",
    effectiveWorkspaceId,
  );

  const remainingMinutes = toNumber(incident.sla_remaining_minutes, Number.NaN);
  const flowTarget = flowId || sourceRecordId || rootEventId || "—";

  const investigationEntry = getInvestigationEntryLabel(incident);
  const investigationMode = getInvestigationModeLabel(incident);
  const investigationFocus = getInvestigationFocusLabel(incident);
  const investigationRoute = getInvestigationRouteLabel(incident);

  const executiveRiskLevel = getExecutiveRiskLevel(incident);
  const executiveRiskLabel = getExecutiveRiskLabel(executiveRiskLevel);
  const executiveImpact = getExecutiveImpactLabel(incident);
  const executiveCoverage = getExecutiveCoverageLabel(incident);
  const executiveRecommendation = getExecutiveRecommendationLabel(incident);

  const controlRoute = getIncidentControlRouteLabel(incident);
  const controlAction = getIncidentControlActionLabel(incident);
  const controlBadgeLabel = getIncidentControlBadgeLabel(incident);
  const controlSurfacesCount = countAvailableControlSurfaces([
    incidentsHref,
    allIncidentsHref,
    canonicalIncidentHref,
    flowHref,
    commandHref,
    eventHref,
  ]);
  const controlReturnLabel = "Liste des incidents";

  const contextModuleState = getContextModuleState(incident);
  const orchestrationModuleState = getOrchestrationModuleState(incident);

  const moduleCards: Array<{
    key: string;
    title: string;
    state: ModuleState;
    summary: string;
    href?: string;
    ctaLabel: string;
  }> = [
    {
      key: "signal",
      title: "Signal",
      state: "available",
      summary: "Couche de signal visible et active.",
      href: "#incident-signal-layer",
      ctaLabel: "Ouvrir Signal",
    },
    {
      key: "investigation",
      title: "Investigation",
      state: "available",
      summary: "Point d’enquête immédiat disponible.",
      href: "#incident-investigation-layer",
      ctaLabel: "Ouvrir Investigation",
    },
    {
      key: "executive",
      title: "Executive",
      state: "available",
      summary: "Synthèse cockpit dirigeant disponible.",
      href: "#incident-executive-layer",
      ctaLabel: "Ouvrir Executive",
    },
    {
      key: "control",
      title: "Control",
      state: "available",
      summary: "Pilotage local disponible.",
      href: "#incident-control-layer",
      ctaLabel: "Ouvrir Control",
    },
    {
      key: "context",
      title: "Contexte",
      state: contextModuleState,
      summary:
        contextModuleState === "available"
          ? "Contexte incident exploitable."
          : contextModuleState === "partial"
            ? "Contexte partiel disponible."
            : "Contexte encore limité.",
      href: "#incident-context",
      ctaLabel: "Ouvrir Contexte",
    },
    {
      key: "orchestration",
      title: "Orchestration",
      state: orchestrationModuleState,
      summary:
        orchestrationModuleState === "available"
          ? "Décision et orchestration exploitables."
          : orchestrationModuleState === "partial"
            ? "Quelques signaux d’orchestration sont présents."
            : "Aucune orchestration directement exploitable.",
      href: "#incident-orchestration",
      ctaLabel: "Ouvrir Orchestration",
    },
    {
      key: "flow",
      title: "Flow lié",
      state: flowHref ? "available" : "unavailable",
      summary: flowHref
        ? `Flow ${compactTechnicalId(flowTarget)} disponible.`
        : "Aucun flow lié directement exploitable.",
      href: flowHref || undefined,
      ctaLabel: "Ouvrir Flow",
    },
    {
      key: "command",
      title: "Command liée",
      state: commandHref ? "available" : "unavailable",
      summary: commandHref
        ? `Command ${compactTechnicalId(commandRecord)} disponible.`
        : "Aucune command liée directement exploitable.",
      href: commandHref || undefined,
      ctaLabel: "Ouvrir Command",
    },
    {
      key: "event",
      title: "Event lié",
      state: eventHref ? "available" : "unavailable",
      summary: eventHref
        ? `Event ${compactTechnicalId(rootEventId || sourceRecordId)} disponible.`
        : "Aucun event lié directement exploitable.",
      href: eventHref || undefined,
      ctaLabel: "Ouvrir Event",
    },
  ];

  const shellBadges: { label: string; tone?: ShellBadgeTone }[] = [
    { label: statusLabel, tone: getShellBadgeToneFromStatus(incident) },
    { label: severityLabel, tone: getShellBadgeToneFromSeverity(incident) },
    { label: `SLA ${slaLabel}`, tone: getShellBadgeToneFromSla(incident) },
  ];

  if (decisionStatus) {
    shellBadges.push({
      label: `DECISION ${decisionStatus.toUpperCase()}`,
      tone: "muted",
    });
  }

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title={title}
      description="Lecture détaillée d’un incident BOSAI avec contexte, orchestration et navigation croisée vers les objets liés."
      badges={shellBadges}
      metrics={[
        { label: "Opened", value: formatDate(openedAt) },
        { label: "Updated", value: formatDate(updatedAt) },
        { label: "Resolved", value: formatDate(resolvedAt) },
        {
          label: "Priority",
          value: String(priorityScore),
          toneClass: "text-white",
          helper: Number.isFinite(remainingMinutes)
            ? `${remainingMinutes} min SLA`
            : undefined,
        },
      ]}
      actions={
        <>
          <Link href={incidentsHref} className={actionLinkClassName("soft")}>
            Retour aux incidents
          </Link>

          {flowHref ? (
            <Link href={flowHref} className={actionLinkClassName("soft")}>
              Ouvrir le flow lié
            </Link>
          ) : null}

          {commandHref ? (
            <Link href={commandHref} className={actionLinkClassName("primary")}>
              Ouvrir la command liée
            </Link>
          ) : null}
        </>
      }
      aside={
        <div className="space-y-6">
          <SidePanelCard
            title="Résumé incident"
            className={sidePanelClassName()}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={getIncidentStatusBadgeKind(incident)}
                  label={statusLabel}
                />
                <DashboardStatusBadge
                  kind={getIncidentSeverityBadgeKind(incident)}
                  label={severityLabel}
                />
                <DashboardStatusBadge
                  kind={getIncidentSlaBadgeKind(incident)}
                  label={`SLA ${slaLabel}`}
                />
                {decisionStatus ? (
                  <DashboardStatusBadge
                    kind={getDecisionBadgeKind(incident)}
                    label={`DECISION ${decisionStatus.toUpperCase()}`}
                  />
                ) : null}
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Workspace :{" "}
                  <span className="text-white/90">
                    {effectiveWorkspaceId || workspace}
                  </span>
                </div>
                <div>
                  Flow :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(flowTarget)}
                  </span>
                </div>
                <div>
                  Command :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(commandRecord)}
                  </span>
                </div>
                <div>
                  Activité :{" "}
                  <span className="text-white/90">
                    {formatDate(updatedAt || openedAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Action suggérée</div>
                <div className="mt-1 text-zinc-200 [overflow-wrap:anywhere]">
                  {suggestedAction}
                </div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Navigation" className={sidePanelClassName()}>
            <div className="space-y-3">
              <Link href={incidentsHref} className={actionLinkClassName("soft")}>
                Retour à la liste incidents
              </Link>

              <Link
                href={allIncidentsHref}
                className={actionLinkClassName("primary")}
              >
                Voir tous les incidents
              </Link>

              {flowHref ? (
                <Link href={flowHref} className={actionLinkClassName("soft")}>
                  Ouvrir le flow lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir le flow lié
                </span>
              )}

              {commandHref ? (
                <Link href={commandHref} className={actionLinkClassName("soft")}>
                  Ouvrir la command liée
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir la command liée
                </span>
              )}

              {eventHref ? (
                <Link href={eventHref} className={actionLinkClassName("soft")}>
                  Ouvrir l’event lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir l’event lié
                </span>
              )}
            </div>
          </SidePanelCard>
        </div>
      }
    >
      <div id="incident-signal-layer">
        
          {/* Incident Detail V3.0-operator-action-console */}
          <IncidentDetailOperatorActionConsole
            incident={incident}
            queueFilter={undefined}
          />

<SectionCard
          title="Signal Layer"
          description="Lecture immédiate de la pression opérationnelle, du point d’entrée, du niveau d’observabilité et de l’action à lancer maintenant."
          tone="attention"
          className={sectionFrameClassName("attention")}
        >
          <div className="flex flex-wrap gap-2">
            <DashboardStatusBadge
              kind={getIncidentStatusBadgeKind(incident)}
              label={statusLabel}
            />
            <DashboardStatusBadge
              kind={getIncidentSeverityBadgeKind(incident)}
              label={severityLabel}
            />
            <DashboardStatusBadge
              kind={getIncidentSlaBadgeKind(incident)}
              label={`SLA ${slaLabel}`}
            />
            {decisionStatus ? (
              <DashboardStatusBadge
                kind={getDecisionBadgeKind(incident)}
                label={`DECISION ${decisionStatus.toUpperCase()}`}
              />
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SignalCard
              label="Pression"
              value={getIncidentSignalPressureLabel(incident)}
              tone={getIncidentSignalPressureTone(incident)}
            />
            <SignalCard
              label="Point d’entrée"
              value={getIncidentSignalEntryLabel(incident)}
              tone="info"
            />
            <SignalCard
              label="Observabilité"
              value={getIncidentSignalObservabilityLabel(incident)}
              tone={getIncidentSignalObservabilityTone(incident)}
            />
            <SignalCard
              label="Action immédiate"
              value={getIncidentSignalNextMove(incident)}
              tone="warning"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SignalCard label="Statut" value={statusLabel} tone="warning" />
            <SignalCard label="Sévérité" value={severityLabel} tone="danger" />
            <SignalCard label="SLA" value={slaLabel} tone="info" />
            <SignalCard
              label="Priorité"
              value={String(priorityScore)}
              tone="default"
            />
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Résumé</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300 [overflow-wrap:anywhere]">
              {getSummaryLine(incident)}
            </div>
          </div>
        </SectionCard>
      </div>

      <div id="incident-investigation-layer">
        <SectionCard
          title="Investigation Layer"
          description="Couche d’enquête immédiate pour identifier le meilleur point d’entrée, le focus actif et la route de lecture prioritaire."
          tone="neutral"
          className={sectionFrameClassName("neutral")}
        >
          <div className="flex flex-wrap gap-2">
            <DashboardStatusBadge
              kind={getIncidentStatusBadgeKind(incident)}
              label={statusLabel}
            />
            <DashboardStatusBadge
              kind={getIncidentSeverityBadgeKind(incident)}
              label={severityLabel}
            />
            <DashboardStatusBadge
              kind={getIncidentSlaBadgeKind(incident)}
              label={`SLA ${slaLabel}`}
            />
            {decisionStatus ? (
              <DashboardStatusBadge
                kind={getDecisionBadgeKind(incident)}
                label={`DECISION ${decisionStatus.toUpperCase()}`}
              />
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-zinc-300 sm:grid-cols-2 xl:grid-cols-4">
            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Point d’entrée</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {investigationEntry}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Premier objet recommandé pour démarrer l’enquête.
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Mode</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {investigationMode}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Niveau de liaison disponible sur cet incident.
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Focus</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {investigationFocus}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Élément le plus utile à vérifier maintenant.
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Route d’enquête</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {investigationRoute}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Stratégie d’investigation prioritaire.
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {flowHref ? (
              <Link href={flowHref} className={actionLinkClassName("soft")}>
                Ouvrir le flow lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir le flow lié
              </span>
            )}

            {commandHref ? (
              <Link href={commandHref} className={actionLinkClassName("primary")}>
                Ouvrir la command liée
              </Link>
            ) : (
              <span className={actionLinkClassName("primary", true)}>
                Ouvrir la command liée
              </span>
            )}

            {eventHref ? (
              <Link href={eventHref} className={actionLinkClassName("soft")}>
                Ouvrir l’event lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir l’event lié
              </span>
            )}

            <Link href={allIncidentsHref} className={actionLinkClassName("danger")}>
              Voir tous les incidents
            </Link>
          </div>
        </SectionCard>
      </div>

      <div id="incident-executive-layer">
        <SectionCard
          title="Executive Layer"
          description="Synthèse cockpit pour lire immédiatement le niveau de risque, l’impact probable, la couverture disponible et la recommandation prioritaire."
          tone="neutral"
          className={sectionFrameClassName("neutral")}
        >
          <div className="flex flex-wrap gap-2">
            <DashboardStatusBadge
              kind={getExecutiveRiskBadgeKind(executiveRiskLevel)}
              label={executiveRiskLabel.toUpperCase()}
            />
            <DashboardStatusBadge
              kind={getIncidentStatusBadgeKind(incident)}
              label={statusLabel}
            />
            <DashboardStatusBadge
              kind={getIncidentSlaBadgeKind(incident)}
              label={`SLA ${slaLabel}`}
            />
            {decisionStatus ? (
              <DashboardStatusBadge
                kind={getDecisionBadgeKind(incident)}
                label={`DECISION ${decisionStatus.toUpperCase()}`}
              />
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SignalCard
              label="Risque"
              value={executiveRiskLabel}
              tone={
                executiveRiskLevel === "critical"
                  ? "danger"
                  : executiveRiskLevel === "elevated"
                    ? "warning"
                    : executiveRiskLevel === "watch"
                      ? "info"
                      : "success"
              }
            />
            <SignalCard label="Impact" value={executiveImpact} tone="warning" />
            <SignalCard
              label="Couverture"
              value={executiveCoverage}
              tone="info"
            />
            <SignalCard
              label="Recommandation"
              value={executiveRecommendation}
              tone="success"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Link href={incidentsHref} className={actionLinkClassName("soft")}>
              Retour aux incidents
            </Link>

            {flowHref ? (
              <Link href={flowHref} className={actionLinkClassName("soft")}>
                Ouvrir le flow lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir le flow lié
              </span>
            )}

            {commandHref ? (
              <Link href={commandHref} className={actionLinkClassName("primary")}>
                Ouvrir la command liée
              </Link>
            ) : (
              <span className={actionLinkClassName("primary", true)}>
                Ouvrir la command liée
              </span>
            )}

            <Link href={allIncidentsHref} className={actionLinkClassName("danger")}>
              Voir tous les incidents
            </Link>
          </div>
        </SectionCard>
      </div>

      <div id="incident-control-layer">
        <SectionCard
          title="Control Layer"
          description="Couche de pilotage locale pour savoir quelle voie de contrôle suivre et quelle action ouvrir ensuite selon l’état réel de l’incident."
          tone="neutral"
          className={sectionFrameClassName("neutral")}
        >
          <div className="flex flex-wrap gap-2">
            <DashboardStatusBadge
              kind={getIncidentStatusBadgeKind(incident)}
              label={statusLabel}
            />
            <DashboardStatusBadge kind="queued" label={controlBadgeLabel} />
            <DashboardStatusBadge
              kind={getIncidentSlaBadgeKind(incident)}
              label={`SLA ${slaLabel}`}
            />
            {decisionStatus ? (
              <DashboardStatusBadge
                kind={getDecisionBadgeKind(incident)}
                label={`DECISION ${decisionStatus.toUpperCase()}`}
              />
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-zinc-300 sm:grid-cols-2 xl:grid-cols-4">
            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Voie de contrôle</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {controlRoute}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Surface principale à utiliser pour piloter cet incident.
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Action suivante</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {controlAction}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Action de contrôle prioritaire recommandée.
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Surfaces disponibles</div>
              <div className="mt-2 text-zinc-100">{controlSurfacesCount}</div>
              <div className="mt-2 text-sm text-zinc-400">
                Nombre de points d’accès de pilotage visibles ici.
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Retour de contrôle</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {controlReturnLabel}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Point de retour stable pour reprendre le pilotage global.
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Link href={incidentsHref} className={actionLinkClassName("soft")}>
              Revenir aux incidents
            </Link>

            {flowHref ? (
              <Link href={flowHref} className={actionLinkClassName("soft")}>
                Ouvrir le flow lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir le flow lié
              </span>
            )}

            {commandHref ? (
              <Link href={commandHref} className={actionLinkClassName("primary")}>
                Ouvrir la command liée
              </Link>
            ) : (
              <span className={actionLinkClassName("primary", true)}>
                Ouvrir la command liée
              </span>
            )}

            {eventHref ? (
              <Link href={eventHref} className={actionLinkClassName("soft")}>
                Ouvrir l’event lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir l’event lié
              </span>
            )}

            <Link href={allIncidentsHref} className={actionLinkClassName("danger")}>
              Voir tous les incidents
            </Link>
          </div>
        </SectionCard>
      </div>

      <div id="incident-module-extensions">
        <SectionCard
          title="Module Extensions"
          description="Vue modulaire de l’incident pour exposer clairement quelles surfaces et quelles liaisons sont disponibles, partielles ou indisponibles."
          tone="neutral"
          className={sectionFrameClassName("neutral")}
        >
          <div className="mb-5 inline-flex h-11 min-w-[56px] items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 px-4 text-lg font-semibold text-sky-300">
            {moduleCards.length}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {moduleCards.map((moduleCard) => (
              <ModuleExtensionCard
                key={moduleCard.key}
                title={moduleCard.title}
                state={moduleCard.state}
                summary={moduleCard.summary}
                href={moduleCard.href}
                ctaLabel={moduleCard.ctaLabel}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <div id="incident-context">
        <SectionCard
          title="Contexte incident"
          description="Contexte opérationnel, source et informations utiles pour comprendre l’incident."
          className={sectionFrameClassName("default")}
        >
          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 sm:grid-cols-2 xl:grid-cols-3">
            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Catégorie</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {category}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Raison</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {reason}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Workspace</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {effectiveWorkspaceId || workspace}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Source</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {toText(incident.source, "Incidents")}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Worker</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {toText(incident.worker, "—")}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Error ID</div>
              <div className="mt-2 break-all text-zinc-100">{errorId}</div>
            </div>

            <div className={`${wideBoxClassName()} sm:col-span-2 xl:col-span-3`}>
              <div className={metaLabelClassName()}>Action suggérée</div>
              <div className="mt-1 text-zinc-200 [overflow-wrap:anywhere]">
                {suggestedAction}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Dernière action</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {lastAction}
              </div>
            </div>

            <div className={`${wideBoxClassName()} sm:col-span-2`}>
              <div className={metaLabelClassName()}>Note de résolution</div>
              <div className="mt-1 text-zinc-200 [overflow-wrap:anywhere]">
                {resolutionNote}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div id="incident-orchestration">
        <SectionCard
          title="Décision & orchestration"
          description="Éléments de pilotage utilisés pour l’escalade, la résolution ou l’action suivante."
          tone="neutral"
          className={sectionFrameClassName("neutral")}
        >
          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 sm:grid-cols-2 xl:grid-cols-4">
            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Décision</div>
              <div className="mt-2 text-zinc-100 [overflow-wrap:anywhere]">
                {decisionStatus || "—"}
              </div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>Priority score</div>
              <div className="mt-2 text-zinc-100">{priorityScore}</div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>SLA</div>
              <div className="mt-2 text-zinc-100">{slaLabel}</div>
            </div>

            <div className={metaBoxClassName()}>
              <div className={metaLabelClassName()}>SLA restant</div>
              <div className="mt-2 text-zinc-100">
                {Number.isFinite(remainingMinutes) ? `${remainingMinutes} min` : "—"}
              </div>
            </div>

            <div className={`${wideBoxClassName()} sm:col-span-2 xl:col-span-2`}>
              <div className={metaLabelClassName()}>Raison décision</div>
              <div className="mt-1 text-zinc-200 [overflow-wrap:anywhere]">
                {decisionReason || "—"}
              </div>
            </div>

            <div className={`${wideBoxClassName()} sm:col-span-2 xl:col-span-2`}>
              <div className={metaLabelClassName()}>Next action</div>
              <div className="mt-1 text-zinc-200 [overflow-wrap:anywhere]">
                {nextAction || "—"}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div id="incident-links">
        <SectionCard
          title="Liens BOSAI"
          description="Objets liés pour naviguer entre l’incident, le flow, la command, l’event et les identifiants techniques."
          tone="neutral"
          className={sectionFrameClassName("neutral")}
        >
          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 sm:grid-cols-2 xl:grid-cols-3">
            <MetaItem
              label="Flow"
              value={<MetaValueLink href={flowHref} value={flowTarget} />}
              breakAll
            />

            <MetaItem
              label="Root event"
              value={<MetaValueLink href={eventHref} value={rootEventId || "—"} />}
              breakAll
            />

            <MetaItem
              label="Source record"
              value={<MetaValueLink href={eventHref} value={sourceRecordId || "—"} />}
              breakAll
            />

            <MetaItem label="Run record" value={runRecord} breakAll />

            <MetaItem
              label="Command"
              value={<MetaValueLink href={commandHref} value={commandRecord} />}
              breakAll
            />

            <MetaItem
              label="Record ID"
              value={
                <MetaValueLink
                  href={canonicalIncidentHref}
                  value={String(incident.id || "") || "—"}
                />
              }
              breakAll
            />
          </div>
        </SectionCard>
      </div>
    </ControlPlaneShell>
  );
}
