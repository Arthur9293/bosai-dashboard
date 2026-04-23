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
            <DashboardStatusBadge
              kind="queued"
              label={controlBadgeLabel}
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
    </ControlPlaneShell>
  );
}
