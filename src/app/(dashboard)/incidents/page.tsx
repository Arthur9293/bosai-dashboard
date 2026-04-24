import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import {
  fetchIncidents,
  type IncidentItem,
} from "@/lib/api";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
  SectionCountPill,
  EmptyStatePanel,
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

export const dynamic = "force-dynamic";

type SearchParams = {
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_record_id?: string | string[];
  source_event_id?: string | string[];
  command_id?: string | string[];
  from?: string | string[];
  workspace_id?: string | string[];
  workspaceId?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type FlexibleIncidentsResponse = {
  incidents?: IncidentItem[];
  items?: IncidentItem[];
  results?: IncidentItem[];
  records?: IncidentItem[];
  data?: unknown;
};

type SignalTone = "default" | "info" | "success" | "warning" | "danger";

type ControlAction = {
  key: "flow" | "command" | "event";
  label: string;
  shortLabel: string;
  href: string;
};

type InvestigationPrimaryAction = {
  key: "detail" | "flow" | "command" | "event";
  label: string;
  href: string;
};

type ModuleState = "available" | "partial" | "unavailable";

type ModuleCard = {
  key: string;
  title: string;
  state: ModuleState;
  summary: string;
  href?: string;
  ctaLabel: string;
};

type FocusPriorityBucket =
  | "escalated-critical"
  | "escalated"
  | "critical-open"
  | "high-open"
  | "sla-breached"
  | "open-standard"
  | "resolved-recent"
  | "resolved";

type PrimaryRoute =
  | "Detail-first"
  | "Flow-first"
  | "Command-first"
  | "Event-first";

type PrimarySurface =
  | "Incident detail"
  | "Flow"
  | "Command"
  | "Event";

type CoverageLabel =
  | "Couverture partielle"
  | "Couverture reliée"
  | "Couverture enrichie"
  | "Lecture locale";

type IncidentRouteLock = {
  key: InvestigationPrimaryAction["key"];
  primaryRoute: PrimaryRoute;
  primarySurface: PrimarySurface;
  coverage: CoverageLabel;
  controlNote: string;
  primaryAction: InvestigationPrimaryAction;
  tone: SignalTone;
};

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function chipClassName(): string {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName(): string {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function signalRingClassName(tone: SignalTone): string {
  if (tone === "danger") return "ring-1 ring-inset ring-rose-500/20";
  if (tone === "warning") return "ring-1 ring-inset ring-amber-500/20";
  if (tone === "success") return "ring-1 ring-inset ring-emerald-500/20";
  if (tone === "info") return "ring-1 ring-inset ring-sky-500/20";
  return "ring-1 ring-inset ring-white/5";
}

function signalDotClassName(tone: SignalTone): string {
  if (tone === "danger") return "bg-rose-300";
  if (tone === "warning") return "bg-amber-300";
  if (tone === "success") return "bg-emerald-300";
  if (tone === "info") return "bg-sky-300";
  return "bg-zinc-400";
}

function toneTextClassName(tone: SignalTone): string {
  if (tone === "danger") return "text-rose-300";
  if (tone === "warning") return "text-amber-300";
  if (tone === "success") return "text-emerald-300";
  if (tone === "info") return "text-sky-300";
  return "text-zinc-200";
}

function coverageTextClassName(coverage: string): string {
  if (coverage === "Couverture enrichie") return "text-emerald-300";
  if (coverage === "Couverture reliée") return "text-sky-300";
  if (coverage === "Couverture partielle") return "text-amber-300";
  return "text-zinc-300";
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function toText(value: unknown, fallback = "—"): string {
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

function toTextOrEmpty(value: unknown): string {
  return toText(value, "");
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function safeUpper(text: string): string {
  return text.trim() ? text.trim().toUpperCase() : "—";
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

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function safeResolveIncidentsActiveWorkspaceId(args: {
  searchParams: SearchParams;
  cookieValues: Record<string, string | undefined>;
}): string {
  try {
    return resolveWorkspaceContext(args).activeWorkspaceId || "";
  } catch {
    return "";
  }
}

function normalizeDisplayText(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleLooksGeneric(value: string): boolean {
  const clean = value.trim().toLowerCase();
  return clean === "" || clean === "incident" || clean === "untitled incident";
}

function extractIncidentItems(payload: unknown): IncidentItem[] {
  const normalizeIncidentArray = (value: unknown): IncidentItem[] => {
    if (!Array.isArray(value)) return [];

    return value.filter(
      (item): item is IncidentItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  };

  const extractFromContainer = (container: unknown): IncidentItem[] => {
    if (!container) return [];

    if (Array.isArray(container)) {
      return normalizeIncidentArray(container);
    }

    if (typeof container !== "object") {
      return [];
    }

    const record = container as Record<string, unknown>;

    const candidates: unknown[] = [
      record.incidents,
      record.items,
      record.results,
      record.records,
      record.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return normalizeIncidentArray(candidate);
      }

      if (
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
      ) {
        const nested = candidate as Record<string, unknown>;

        for (const key of ["incidents", "items", "results", "records", "data"]) {
          const inner = nested[key];

          if (Array.isArray(inner)) {
            return normalizeIncidentArray(inner);
          }
        }
      }
    }

    return [];
  };

  if (!payload) return [];

  const directItems = extractFromContainer(payload);
  if (directItems.length > 0) return directItems;

  if (typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const raw = payload as Record<string, unknown>;

  const sourceItems = extractFromContainer(raw.source);
  if (sourceItems.length > 0) return sourceItems;

  const dataItems = extractFromContainer(raw.data);
  if (dataItems.length > 0) return dataItems;

  return [];
}

function getIncidentTitle(incident: IncidentItem): string {
  return (
    incident.title || incident.name || incident.error_id || "Untitled incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem): string {
  return (incident.status || incident.statut_incident || "").trim();
}

function getIncidentSeverityRaw(incident: IncidentItem): string {
  return (incident.severity || "").trim();
}

function getIncidentWorkspaceId(incident: IncidentItem): string {
  return incident.workspace_id || incident.workspace || "";
}

function getIncidentStatusNormalized(incident: IncidentItem): string {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = (incident.sla_status || "").trim().toLowerCase();
  const hasResolvedAt = Boolean(incident.resolved_at);

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
    if ((incident.sla_status || "").toLowerCase() === "breached") {
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

function getIncidentSeverityDisplayLabel(incident: IncidentItem): string {
  const normalized = getIncidentSeverityNormalized(incident);

  if (normalized === "critical") return "CRITICAL";
  if (normalized === "high") return "HIGH";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "low") return "LOW";

  return "UNCLASSIFIED";
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

function getSlaLabel(incident: IncidentItem): string {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "RESOLVED";

  const sla = (incident.sla_status || "").trim();
  if (sla) return sla.toUpperCase();

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "BREACHED";
  }

  return "—";
}

function getSlaDisplayLabel(incident: IncidentItem): string {
  const label = getSlaLabel(incident).trim();
  return label && label !== "—" ? label : "NO SLA SIGNAL";
}

function getOpenedAt(incident: IncidentItem): string | undefined {
  return incident.opened_at || incident.created_at;
}

function getUpdatedAt(incident: IncidentItem): string | undefined {
  return incident.updated_at || incident.created_at;
}

function getResolvedAt(incident: IncidentItem): string | undefined {
  if (incident.resolved_at) return incident.resolved_at;

  if (getIncidentStatusNormalized(incident) === "resolved") {
    return incident.updated_at || incident.created_at;
  }

  return undefined;
}

function getWorkspace(incident: IncidentItem): string {
  return incident.workspace_id || incident.workspace || "—";
}

function getWorkspaceDisplay(incident: IncidentItem): string {
  const workspace = getIncidentWorkspaceId(incident).trim();
  return workspace || "UNSCOPED";
}

function getRunRecord(incident: IncidentItem): string {
  return incident.run_record_id || incident.linked_run || incident.run_id || "—";
}

function getCommandRecord(incident: IncidentItem): string {
  return incident.command_id || incident.linked_command || "—";
}

function getFlowId(incident: IncidentItem): string {
  return toTextOrEmpty(incident.flow_id);
}

function getRootEventId(incident: IncidentItem): string {
  return toTextOrEmpty(incident.root_event_id);
}

function getSourceRecordId(incident: IncidentItem): string {
  return toTextOrEmpty(
    (incident as Record<string, unknown>).source_record_id,
  );
}

function getCategory(incident: IncidentItem): string {
  return incident.category || "—";
}

function getCategoryDisplay(incident: IncidentItem): string {
  const category = getCategory(incident).trim();
  return category && category !== "—"
    ? normalizeDisplayText(category)
    : "UNCATEGORIZED";
}

function getReason(incident: IncidentItem): string {
  return incident.reason || "—";
}

function getReasonDisplay(incident: IncidentItem): string {
  const reason = getReason(incident).trim();
  return reason && reason !== "—"
    ? normalizeDisplayText(reason)
    : "NO REASON SIGNAL";
}

function getDecisionStatusDisplay(incident: IncidentItem): string {
  const decision = getDecisionStatus(incident).trim();
  return decision
    ? normalizeDisplayText(decision).toUpperCase()
    : "NO DECISION YET";
}

function getDecisionReasonDisplay(incident: IncidentItem): string {
  const reason = getDecisionReason(incident).trim();
  return reason
    ? normalizeDisplayText(reason)
    : "NO DECISION REASON";
}

function getNextActionDisplay(incident: IncidentItem): string {
  const action = getNextAction(incident).trim();
  return action
    ? normalizeDisplayText(action)
    : "NO NEXT ACTION";
}

function getIncidentDisplayTitle(incident: IncidentItem): string {
  const rawTitle = getIncidentTitle(incident).trim();

  if (!titleLooksGeneric(rawTitle)) return rawTitle;

  const errorId = toTextOrEmpty(incident.error_id);
  if (errorId) return `Incident · ${compactTechnicalId(errorId, 42)}`;

  const category = getCategory(incident).trim();
  if (category && category !== "—") {
    return `Incident · ${normalizeDisplayText(category)}`;
  }

  const reason = getReason(incident).trim();
  if (reason && reason !== "—") {
    return `Incident · ${normalizeDisplayText(reason)}`;
  }

  if (getFlowId(incident)) return "Incident linked to flow";
  if (getCommandRecord(incident) !== "—") return "Incident linked to command";
  if (getRootEventId(incident)) return "Incident linked to event";

  return "Incident with partial signal";
}

function getSuggestedAction(incident: IncidentItem): string {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated") return "Review escalated incident";
  if (severity === "critical") return "Prioritize immediate review";
  if ((incident.sla_status || "").toLowerCase() === "breached") {
    return "Review SLA breach";
  }
  if (status === "resolved") return "Verify final resolution state";

  return "Monitor flow and resolution";
}

function getSummaryLine(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);

  return `${safeUpper(status)} · ${getIncidentSeverityDisplayLabel(
    incident,
  )} · ${getWorkspaceDisplay(incident)} · ${getCategoryDisplay(incident)}`;
}

function isIncidentResolved(incident: IncidentItem): boolean {
  return getIncidentStatusNormalized(incident) === "resolved";
}

function isIncidentEscalated(incident: IncidentItem): boolean {
  return getIncidentStatusNormalized(incident) === "escalated";
}

function isIncidentOpen(incident: IncidentItem): boolean {
  return getIncidentStatusNormalized(incident) === "open";
}

function isIncidentCritical(incident: IncidentItem): boolean {
  return getIncidentSeverityNormalized(incident) === "critical";
}

function isIncidentHigh(incident: IncidentItem): boolean {
  return getIncidentSeverityNormalized(incident) === "high";
}

function isIncidentSlaBreached(incident: IncidentItem): boolean {
  return getSlaLabel(incident) === "BREACHED";
}

function isRecentResolvedIncident(incident: IncidentItem): boolean {
  if (!isIncidentResolved(incident)) return false;

  const timestamp =
    new Date(getResolvedAt(incident) || getUpdatedAt(incident) || 0).getTime();

  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;

  return Date.now() - timestamp <= 72 * 60 * 60 * 1000;
}

function getIncidentFocusBucket(incident: IncidentItem): FocusPriorityBucket {
  if (isIncidentEscalated(incident) && isIncidentCritical(incident)) {
    return "escalated-critical";
  }

  if (isIncidentEscalated(incident)) {
    return "escalated";
  }

  if (!isIncidentResolved(incident) && isIncidentCritical(incident)) {
    return "critical-open";
  }

  if (!isIncidentResolved(incident) && isIncidentHigh(incident)) {
    return "high-open";
  }

  if (!isIncidentResolved(incident) && isIncidentSlaBreached(incident)) {
    return "sla-breached";
  }

  if (!isIncidentResolved(incident)) {
    return "open-standard";
  }

  if (isRecentResolvedIncident(incident)) {
    return "resolved-recent";
  }

  return "resolved";
}

function getIncidentFocusPriority(incident: IncidentItem): number {
  const bucket = getIncidentFocusBucket(incident);

  if (bucket === "escalated-critical") return 0;
  if (bucket === "escalated") return 1;
  if (bucket === "critical-open") return 2;
  if (bucket === "high-open") return 3;
  if (bucket === "sla-breached") return 4;
  if (bucket === "open-standard") return 5;
  if (bucket === "resolved-recent") return 6;
  return 7;
}

function getIncidentHasPartialControlSignal(incident: IncidentItem): boolean {
  return isSignalGapIncident(incident) || getIncidentLinkCoverageCount(incident) === 0;
}

function getIncidentPrimaryRouteKey(args: {
  incident: IncidentItem;
  flowHref: string;
  commandHref: string;
  eventHref: string;
}): InvestigationPrimaryAction["key"] {
  const { incident, flowHref, commandHref, eventHref } = args;
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  const explicitFlowId = getFlowId(incident).trim();

  const hasExplicitFlowRoute = Boolean(explicitFlowId && flowHref);
  const hasCommandRoute = Boolean(commandHref);
  const hasEventRoute = Boolean(eventHref);

  if (!hasExplicitFlowRoute && !hasCommandRoute && !hasEventRoute) {
    return "detail";
  }

  if (status === "escalated" && severity === "critical") {
    if (hasCommandRoute) return "command";
    if (hasExplicitFlowRoute) return "flow";
    if (hasEventRoute) return "event";
    return "detail";
  }

  if (status === "escalated") {
    if (hasCommandRoute) return "command";
    if (hasExplicitFlowRoute) return "flow";
    if (hasEventRoute) return "event";
    return "detail";
  }

  if (status === "open" && severity === "critical") {
    if (hasCommandRoute) return "command";
    if (hasExplicitFlowRoute) return "flow";
    if (hasEventRoute) return "event";
    return "detail";
  }

  if (status === "open" && severity === "high") {
    if (hasExplicitFlowRoute) return "flow";
    if (hasCommandRoute) return "command";
    if (hasEventRoute) return "event";
    return "detail";
  }

  if (status === "open" && isIncidentSlaBreached(incident)) {
    if (hasCommandRoute) return "command";
    if (hasExplicitFlowRoute) return "flow";
    if (hasEventRoute) return "event";
    return "detail";
  }

  if (status === "open") {
    if (hasExplicitFlowRoute) return "flow";
    if (hasCommandRoute) return "command";
    if (hasEventRoute) return "event";
    return "detail";
  }

  if (hasEventRoute && !hasExplicitFlowRoute && !hasCommandRoute) {
    return "event";
  }

  if (hasExplicitFlowRoute) return "flow";
  if (hasCommandRoute) return "command";
  if (hasEventRoute) return "event";

  return "detail";
}

function getRouteShortLabel(
  key: InvestigationPrimaryAction["key"],
): string {
  if (key === "command") return "Command";
  if (key === "flow") return "Flow";
  if (key === "event") return "Event";
  return "Detail";
}

function getPrimarySurfaceLabel(
  key: InvestigationPrimaryAction["key"],
): PrimarySurface {
  if (key === "command") return "Command";
  if (key === "flow") return "Flow";
  if (key === "event") return "Event";
  return "Incident detail";
}

function getRoutePriorityLabel(
  key: InvestigationPrimaryAction["key"],
): PrimaryRoute {
  if (key === "command") return "Command-first";
  if (key === "flow") return "Flow-first";
  if (key === "event") return "Event-first";
  return "Detail-first";
}

function getRouteActionLabel(
  key: InvestigationPrimaryAction["key"],
): string {
  if (key === "command") return "Ouvrir la command prioritaire";
  if (key === "flow") return "Ouvrir le flow prioritaire";
  if (key === "event") return "Ouvrir l’event prioritaire";
  return "Ouvrir le détail prioritaire";
}

function getIncidentRouteCoverageLabel(args: {
  incident: IncidentItem;
  key: InvestigationPrimaryAction["key"];
}): CoverageLabel {
  const { incident, key } = args;
  const count = getIncidentLinkCoverageCount(incident);

  if (key === "detail") {
    return "Couverture partielle";
  }

  if (key === "event") {
    return count >= 2 ? "Couverture reliée" : "Lecture locale";
  }

  if (key === "command" || key === "flow") {
    return count >= 3 ? "Couverture enrichie" : "Couverture reliée";
  }

  return "Lecture locale";
}

function getIncidentRouteNote(args: {
  incident: IncidentItem;
  key: InvestigationPrimaryAction["key"];
}): string {
  const { incident, key } = args;

  if (key === "command") {
    return "Command-first : la command prioritaire concentre le pilotage de résolution.";
  }

  if (key === "flow") {
    return "Flow-first : le flow prioritaire concentre la lecture métier et la chaîne causale principale.";
  }

  if (key === "event") {
    return "Event-first : l’event prioritaire concentre la lecture du signal source exploitable.";
  }

  if (getIncidentHasPartialControlSignal(incident)) {
    return "Detail-first : signal partiel, le détail incident reste la surface prioritaire de lecture.";
  }

  return "Detail-first : le détail incident reste la surface prioritaire de lecture.";
}

function getActivePriority(incident: IncidentItem): number {
  const bucket = getIncidentFocusBucket(incident);

  if (bucket === "escalated-critical") return 0;
  if (bucket === "escalated") return 1;
  if (bucket === "critical-open") return 2;
  if (bucket === "high-open") return 3;
  if (bucket === "sla-breached") return 4;
  if (bucket === "open-standard") return 5;

  return 6;
}

function getIncidentTimestampForSort(incident: IncidentItem): number {
  return new Date(
    getUpdatedAt(incident) || getOpenedAt(incident) || getResolvedAt(incident) || 0,
  ).getTime();
}

function sortActiveIncidents(items: IncidentItem[]): IncidentItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = getActivePriority(a) - getActivePriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return getIncidentTimestampForSort(b) - getIncidentTimestampForSort(a);
  });
}

function sortResolvedIncidents(items: IncidentItem[]): IncidentItem[] {
  return [...items].sort((a, b) => {
    const aTs = new Date(
      getResolvedAt(a) || getUpdatedAt(a) || getOpenedAt(a) || 0,
    ).getTime();
    const bTs = new Date(
      getResolvedAt(b) || getUpdatedAt(b) || getOpenedAt(b) || 0,
    ).getTime();

    return bTs - aTs;
  });
}

function sortVisibleIncidentsForFocus(items: IncidentItem[]): IncidentItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = getIncidentFocusPriority(a) - getIncidentFocusPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return getIncidentTimestampForSort(b) - getIncidentTimestampForSort(a);
  });
}

function latestIncidentByStatus(
  items: IncidentItem[],
  status: "open" | "escalated" | "resolved",
): IncidentItem | null {
  const filtered = items.filter(
    (item) => getIncidentStatusNormalized(item) === status,
  );
  const sorted =
    status === "resolved"
      ? sortResolvedIncidents(filtered)
      : sortActiveIncidents(filtered);

  return sorted[0] || null;
}

function isLegacyNoiseIncident(incident: IncidentItem): boolean {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = getCategory(incident).trim().toLowerCase();
  const reason = getReason(incident).trim().toLowerCase();
  const errorId = (incident.error_id || "").trim();
  const resolutionNote = (incident.resolution_note || "").trim();
  const lastAction = (incident.last_action || "").trim();
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

function incidentMatchesFilters(
  incident: IncidentItem,
  filters: {
    flowId: string;
    rootEventId: string;
    sourceRecordId: string;
    commandId: string;
  },
): boolean {
  const filterValues = [
    filters.flowId,
    filters.rootEventId,
    filters.sourceRecordId,
    filters.commandId,
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (filterValues.length === 0) return true;

  const incidentValues = [
    getFlowId(incident),
    getRootEventId(incident),
    getSourceRecordId(incident),
    getCommandRecord(incident),
    getRunRecord(incident),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  return filterValues.some((filterValue) => incidentValues.includes(filterValue));
}

function getBestFlowTargetFromIncident(incident: IncidentItem): string {
  return (
    getFlowId(incident) ||
    getSourceRecordId(incident) ||
    getRootEventId(incident) ||
    ""
  );
}

function getBestFlowTargetFromFilters(filters: {
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
}): string {
  return filters.flowId || filters.sourceRecordId || filters.rootEventId || "";
}

function getBackToFlowsHref(
  filters: {
    flowId: string;
    rootEventId: string;
    sourceRecordId: string;
  },
  activeWorkspaceId?: string,
): string {
  const target = getBestFlowTargetFromFilters(filters);
  const baseHref = target ? `/flows/${encodeURIComponent(target)}` : "/flows";
  return appendWorkspaceIdToHref(baseHref, activeWorkspaceId);
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

function getIncidentSlaBadgeKind(
  incident: IncidentItem,
): DashboardStatusKind {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "success";

  const sla = (incident.sla_status || "").toLowerCase();

  if (sla === "breached") return "failed";
  if (sla === "warning") return "retry";
  if (sla === "ok") return "success";

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "failed";
  }

  return "unknown";
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

function getEventTargetFromIncident(incident: IncidentItem): string {
  const sourceRecordId = getSourceRecordId(incident);
  if (sourceRecordId && isRecordIdLike(sourceRecordId)) return sourceRecordId;

  const rootEventId = getRootEventId(incident);
  if (rootEventId && isRecordIdLike(rootEventId)) return rootEventId;

  return "";
}

function getIncidentHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
  context?: {
    flowId?: string;
    rootEventId?: string;
    sourceRecordId?: string;
    commandId?: string;
    from?: string;
  },
): string {
  return buildHref(`/incidents/${encodeURIComponent(incident.id)}`, {
    workspace_id: activeWorkspaceId || getIncidentWorkspaceId(incident) || undefined,
    flow_id: context?.flowId || getFlowId(incident) || undefined,
    root_event_id: context?.rootEventId || getRootEventId(incident) || undefined,
    source_record_id:
      context?.sourceRecordId || getSourceRecordId(incident) || undefined,
    command_id: context?.commandId || getCommandRecord(incident) || undefined,
    from: context?.from || "incidents",
  });
}

function getFlowHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const flowTarget = getBestFlowTargetFromIncident(incident);
  return flowTarget
    ? appendWorkspaceIdToHref(
        `/flows/${encodeURIComponent(flowTarget)}`,
        activeWorkspaceId || getIncidentWorkspaceId(incident),
      )
    : "";
}

function getCommandHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const commandRecord = getCommandRecord(incident);
  if (!commandRecord || commandRecord === "—") return "";

  return buildHref(`/commands/${encodeURIComponent(commandRecord)}`, {
    workspace_id: activeWorkspaceId || getIncidentWorkspaceId(incident) || undefined,
    flow_id: getFlowId(incident) || undefined,
    root_event_id: getRootEventId(incident) || undefined,
    source_event_id: getSourceRecordId(incident) || undefined,
    from: "incidents",
  });
}

function getEventHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const eventTarget = getEventTargetFromIncident(incident);
  if (!eventTarget) return "";

  return buildHref(`/events/${encodeURIComponent(eventTarget)}`, {
    workspace_id: activeWorkspaceId || getIncidentWorkspaceId(incident) || undefined,
    flow_id: getFlowId(incident) || undefined,
    root_event_id: getRootEventId(incident) || undefined,
    source_event_id: getSourceRecordId(incident) || undefined,
    from: "incidents",
  });
}

function getStatusSignalTone(incident: IncidentItem): SignalTone {
  const status = getIncidentStatusNormalized(incident);
  if (status === "resolved") return "success";
  if (status === "escalated") return "warning";
  if (status === "open") return "info";
  return "default";
}

function getSeveritySignalTone(incident: IncidentItem): SignalTone {
  const severity = getIncidentSeverityNormalized(incident);
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "low") return "success";
  return "default";
}

function getSlaSignalTone(incident: IncidentItem): SignalTone {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "success";

  const sla = (incident.sla_status || "").toLowerCase();

  if (sla === "breached") return "danger";
  if (sla === "warning") return "warning";
  if (sla === "ok") return "success";

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "danger";
  }

  return "default";
}

function getWorkspaceSignalTone(incident: IncidentItem): SignalTone {
  return getIncidentWorkspaceId(incident) ? "info" : "default";
}

function isSignalGapIncident(incident: IncidentItem): boolean {
  const missingSignals = [
    titleLooksGeneric(getIncidentTitle(incident)),
    getIncidentSeverityNormalized(incident) === "unknown",
    getWorkspace(incident) === "—",
    getCategory(incident) === "—",
    getReason(incident) === "—",
  ].filter(Boolean).length;

  return missingSignals >= 2;
}

function getSignalTruthLabel(incident: IncidentItem): string {
  return isSignalGapIncident(incident) ? "PARTIAL SIGNAL" : "SIGNAL READY";
}

function getMostRecentIncident(items: IncidentItem[]): IncidentItem | null {
  if (items.length === 0) return null;

  const sorted = [...items].sort(
    (a, b) => getIncidentTimestampForSort(b) - getIncidentTimestampForSort(a),
  );

  return sorted[0] || null;
}

function getExecutivePosture(args: {
  activeCount: number;
  escalatedCount: number;
  criticalActiveCount: number;
  resolvedCount: number;
  visibleCount: number;
  signalGapCount: number;
}): {
  label: string;
  summary: string;
  tone: SignalTone;
  countTone: "default" | "info" | "success" | "warning" | "danger" | "muted";
} {
  if (args.escalatedCount > 0) {
    return {
      label: "Escalation pressure",
      summary:
        "Des incidents escaladés restent visibles. La surface demande une attention dirigeant immédiate.",
      tone: "warning",
      countTone: "warning",
    };
  }

  if (args.criticalActiveCount > 0) {
    return {
      label: "Critical pressure",
      summary:
        "Des incidents critiques actifs restent visibles. La priorité doit rester sur la réduction du risque.",
      tone: "danger",
      countTone: "danger",
    };
  }

  if (args.activeCount > 0) {
    return {
      label: "Active watch",
      summary:
        "La surface reste active mais non escaladée. Le cockpit doit surveiller cadence, SLA et résolution.",
      tone: "info",
      countTone: "info",
    };
  }

  if (args.visibleCount > 0 && args.signalGapCount > 0) {
    return {
      label: "Low signal confidence",
      summary:
        "La surface visible reste calme mais la qualité du signal n’est pas parfaite. La lecture dirigeant doit garder cette réserve.",
      tone: "warning",
      countTone: "warning",
    };
  }

  if (args.resolvedCount > 0) {
    return {
      label: "Stabilized",
      summary:
        "La surface visible est principalement stabilisée. Les incidents présents sont majoritairement résolus.",
      tone: "success",
      countTone: "success",
    };
  }

  return {
    label: "Quiet surface",
    summary:
      "Aucune pression notable n’est visible. La surface semble calme sur le scope actuel.",
    tone: "default",
    countTone: "default",
  };
}

function getIncidentLinkCoverageCount(incident: IncidentItem): number {
  return [
    getBestFlowTargetFromIncident(incident),
    getCommandRecord(incident) !== "—" ? getCommandRecord(incident) : "",
    getEventTargetFromIncident(incident),
    getRunRecord(incident) !== "—" ? getRunRecord(incident) : "",
  ].filter(Boolean).length;
}

function getInvestigationCoverageLabel(incident: IncidentItem): CoverageLabel {
  if (getIncidentHasPartialControlSignal(incident)) {
    return "Couverture partielle";
  }

  const count = getIncidentLinkCoverageCount(incident);

  if (count >= 4) return "Couverture enrichie";
  if (count >= 2) return "Couverture reliée";
  if (count >= 1) return "Couverture partielle";
  return "Lecture locale";
}

function getInvestigationFocusLabel(incident: IncidentItem): string {
  const nextAction = getNextAction(incident).trim();
  if (nextAction) return nextAction;

  const decision = getDecisionStatus(incident).trim();
  if (decision) return `Decision ${normalizeDisplayText(decision)}`;

  const reason = getReason(incident).trim();
  if (reason && reason !== "—") return normalizeDisplayText(reason);

  return getSuggestedAction(incident);
}

function getInvestigationRouteLabel(args: {
  incident: IncidentItem;
  flowHref: string;
  commandHref: string;
  eventHref: string;
}): string {
  const routeKey = getIncidentPrimaryRouteKey(args);
  return getRoutePriorityLabel(routeKey);
}

function getInvestigationPrimaryAction(args: {
  incident: IncidentItem;
  detailHref: string;
  flowHref: string;
  commandHref: string;
  eventHref: string;
}): InvestigationPrimaryAction {
  const { incident, detailHref, flowHref, commandHref, eventHref } = args;
  const routeKey = getIncidentPrimaryRouteKey({
    incident,
    flowHref,
    commandHref,
    eventHref,
  });

  if (routeKey === "command" && commandHref) {
    return {
      key: "command",
      label: getRouteActionLabel("command"),
      href: commandHref,
    };
  }

  if (routeKey === "flow" && flowHref) {
    return {
      key: "flow",
      label: getRouteActionLabel("flow"),
      href: flowHref,
    };
  }

  if (routeKey === "event" && eventHref) {
    return {
      key: "event",
      label: getRouteActionLabel("event"),
      href: eventHref,
    };
  }

  return {
    key: "detail",
    label: getRouteActionLabel("detail"),
    href: detailHref,
  };
}

function getIncidentRouteLock(args: {
  incident: IncidentItem;
  detailHref: string;
  flowHref: string;
  commandHref: string;
  eventHref: string;
}): IncidentRouteLock {
  const { incident, detailHref, flowHref, commandHref, eventHref } = args;

  const routeKey = getIncidentPrimaryRouteKey({
    incident,
    flowHref,
    commandHref,
    eventHref,
  });

  const primaryAction = getInvestigationPrimaryAction({
    incident,
    detailHref,
    flowHref,
    commandHref,
    eventHref,
  });

  const tone: SignalTone =
    routeKey === "detail" && getIncidentHasPartialControlSignal(incident)
      ? "warning"
      : routeKey !== "detail"
        ? "info"
        : "default";

  return {
    key: routeKey,
    primaryRoute: getRoutePriorityLabel(routeKey),
    primarySurface: getPrimarySurfaceLabel(routeKey),
    coverage: getIncidentRouteCoverageLabel({ incident, key: routeKey }),
    controlNote: getIncidentRouteNote({ incident, key: routeKey }),
    primaryAction,
    tone,
  };
}

function countDistinctSurfaces(values: string[]): number {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).length;
}

function getControlRouteLabel(args: {
  hasFilters: boolean;
  primaryAction: InvestigationPrimaryAction | null;
}): PrimaryRoute {
  return getRoutePriorityLabel(args.primaryAction?.key || "detail");
}

function getControlReturnLabel(hasFilters: boolean): string {
  return hasFilters ? "Retour aux flows" : "Liste incidents";
}

function getControlPrimaryAction(args: {
  primaryAction: InvestigationPrimaryAction | null;
  allIncidentsHref: string;
}): InvestigationPrimaryAction | null {
  if (args.primaryAction) return args.primaryAction;

  if (args.allIncidentsHref) {
    return {
      key: "detail",
      label: "Voir tous les incidents",
      href: args.allIncidentsHref,
    };
  }

  return null;
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
          <span className={actionLinkClassName("soft") + " opacity-60 pointer-events-none"}>
            {ctaLabel}
          </span>
        ) : (
          <Link href={href} className={actionLinkClassName("soft")}>
            {ctaLabel}
          </Link>
        )}
      </div>
    </article>
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
    <div className={breakAll ? "break-all" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function IncidentMiniStat({
  label,
  value,
  toneClass,
  panelTone = "default",
}: {
  label: string;
  value: number | string;
  toneClass: string;
  panelTone?: SignalTone;
}) {
  return (
    <div className={`${statCardClassName()} ${signalRingClassName(panelTone)}`}>
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${signalDotClassName(panelTone)}`}
          aria-hidden="true"
        />
        <div className="text-sm text-zinc-400">{label}</div>
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function SignalMetaPill({
  label,
  value,
  tone = "default",
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  tone?: SignalTone;
  breakAll?: boolean;
}) {
  return (
    <div
      className={`${metaBoxClassName()} ${signalRingClassName(tone)} ${
        breakAll ? "break-all" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${signalDotClassName(tone)}`}
          aria-hidden="true"
        />
        <div className={metaLabelClassName()}>{label}</div>
      </div>
      <div className="mt-2 text-zinc-100">{value}</div>
    </div>
  );
}

function InvestigationField({
  label,
  value,
  valueClassName = "text-zinc-200",
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  breakAll?: boolean;
}) {
  return (
    <div
      className={`rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-3.5 ${
        breakAll ? "break-all" : ""
      }`}
    >
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-sm leading-6 ${valueClassName}`}>{value}</div>
    </div>
  );
}

function IncidentListCard({
  incident,
  activeWorkspaceId,
}: {
  incident: IncidentItem;
  activeWorkspaceId?: string;
}) {
  const title = getIncidentDisplayTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityDisplayLabel(incident);
  const slaLabel = getSlaDisplayLabel(incident);
  const decisionStatus = getDecisionStatusDisplay(incident);
  const decisionReason = getDecisionReasonDisplay(incident);
  const nextAction = getNextActionDisplay(incident);
  const flowTarget = getBestFlowTargetFromIncident(incident);
  const commandRecord = getCommandRecord(incident);
  const rootEventId = getRootEventId(incident);
  const runRecord = getRunRecord(incident);
  const suggestedAction = getSuggestedAction(incident);
  const flowHref = getFlowHref(incident, activeWorkspaceId);
  const commandHref = getCommandHref(incident, activeWorkspaceId);
  const eventHref = getEventHref(incident, activeWorkspaceId);
  const detailHref = getIncidentHref(incident, activeWorkspaceId);
  const hasSignalGap = isSignalGapIncident(incident);

  const linkedActions: ControlAction[] = [
    flowHref
      ? {
          key: "flow",
          label: "Ouvrir le flow lié",
          shortLabel: "Flow",
          href: flowHref,
        }
      : null,
    commandHref
      ? {
          key: "command",
          label: "Ouvrir la command liée",
          shortLabel: "Command",
          href: commandHref,
        }
      : null,
    eventHref
      ? {
          key: "event",
          label: "Ouvrir l’event lié",
          shortLabel: "Event",
          href: eventHref,
        }
      : null,
  ].filter(Boolean) as ControlAction[];

  const routeLock = getIncidentRouteLock({
    incident,
    detailHref,
    flowHref,
    commandHref,
    eventHref,
  });

  const secondaryLinkedActions = linkedActions.filter(
    (action) => action.key !== routeLock.primaryAction.key,
  );

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            BOSAI Incident
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <SignalMetaPill
              label="Status signal"
              value={statusLabel}
              tone={getStatusSignalTone(incident)}
            />
            <SignalMetaPill
              label="Severity signal"
              value={severityLabel}
              tone={getSeveritySignalTone(incident)}
            />
            <SignalMetaPill
              label="SLA signal"
              value={slaLabel}
              tone={getSlaSignalTone(incident)}
            />
            <SignalMetaPill
              label="Workspace signal"
              value={getWorkspaceDisplay(incident)}
              tone={getWorkspaceSignalTone(incident)}
            />
          </div>

          <div className="space-y-3">
            <Link
              href={detailHref}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {title}
            </Link>

            <div className="text-sm text-zinc-400">{getSummaryLine(incident)}</div>

            <div className="flex flex-wrap items-center gap-2">
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

              {hasSignalGap ? (
                <DashboardStatusBadge
                  kind="unknown"
                  label={getSignalTruthLabel(incident)}
                />
              ) : null}

              {getDecisionStatus(incident) ? (
                <DashboardStatusBadge
                  kind={getDecisionBadgeKind(incident)}
                  label={`DECISION ${decisionStatus}`}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-300" aria-hidden="true" />
            <div className={metaLabelClassName()}>Investigation Layer</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InvestigationField label="Category" value={getCategoryDisplay(incident)} />
            <InvestigationField
              label="Reason"
              value={getReasonDisplay(incident)}
              breakAll
            />
            <InvestigationField
              label="Suggested action"
              value={suggestedAction}
            />
            <InvestigationField
              label="Decision"
              value={decisionStatus}
              valueClassName={getDecisionStatus(incident) ? "text-purple-300" : "text-zinc-400"}
            />
            <InvestigationField
              label="Decision reason"
              value={decisionReason}
            />
            <InvestigationField
              label="Next action"
              value={nextAction}
            />
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
            <div className={metaLabelClassName()}>Control Layer</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InvestigationField
              label="Primary route"
              value={routeLock.primaryRoute}
              valueClassName={toneTextClassName(routeLock.tone)}
            />
            <InvestigationField
              label="Primary surface"
              value={routeLock.primarySurface}
              valueClassName={toneTextClassName(routeLock.tone)}
            />
            <InvestigationField
              label="Coverage"
              value={routeLock.coverage}
              valueClassName={coverageTextClassName(routeLock.coverage)}
            />
            <InvestigationField
              label="Control note"
              value={routeLock.controlNote}
            />
          </div>
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Opened</div>
            <div className="mt-2 text-zinc-100">{formatDate(getOpenedAt(incident))}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Updated</div>
            <div className="mt-2 text-zinc-100">{formatDate(getUpdatedAt(incident))}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Workspace</div>
            <div className="mt-2 text-zinc-100">{getWorkspaceDisplay(incident)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Category</div>
            <div className="mt-2 text-zinc-100">{getCategoryDisplay(incident)}</div>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Flow"
            value={
              flowTarget && flowHref ? (
                <Link
                  href={flowHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowTarget}
                </Link>
              ) : (
                "No linked flow"
              )
            }
            breakAll
          />

          <MetaItem label="Root event" value={toText(rootEventId, "No root event")} breakAll />
          <MetaItem label="Run record" value={toText(runRecord, "No run record")} breakAll />

          <MetaItem
            label="Command"
            value={
              commandRecord !== "—" && commandHref ? (
                <Link
                  href={commandHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {commandRecord}
                </Link>
              ) : (
                "No linked command"
              )
            }
            breakAll
          />

          <MetaItem
            label="Event"
            value={
              eventHref ? (
                <Link
                  href={eventHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {getEventTargetFromIncident(incident)}
                </Link>
              ) : (
                "No linked event"
              )
            }
            breakAll
          />

          <MetaItem
            label="Resolved"
            value={formatDate(getResolvedAt(incident)) === "—" ? "Not resolved yet" : formatDate(getResolvedAt(incident))}
          />

          <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Priority score</div>
            <div className="mt-1 text-zinc-200">{getPriorityScore(incident)}</div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          <Link
            href={routeLock.primaryAction.href}
            className={actionLinkClassName("primary")}
          >
            {routeLock.primaryAction.label}
          </Link>

          {routeLock.primaryAction.key !== "detail" ? (
            <Link href={detailHref} className={actionLinkClassName("soft")}>
              Ouvrir le détail
            </Link>
          ) : null}

          {secondaryLinkedActions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {secondaryLinkedActions.map((action) => (
                <Link
                  key={action.key}
                  href={action.href}
                  className={actionLinkClassName("soft")}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  title,
  description,
  count,
  countTone = "default",
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  count: number;
  countTone?: "default" | "info" | "success" | "warning" | "danger" | "muted";
  tone?: "default" | "attention" | "neutral";
  children: ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      tone={tone}
      action={<SectionCountPill value={count} tone={countTone} />}
    >
      {children}
    </SectionCard>
  );
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const cookieStore = await cookies();

  const fallbackWorkspaceId = safeResolveIncidentsActiveWorkspaceId({
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
    firstParam(resolvedSearchParams.workspaceId).trim() ||
    fallbackWorkspaceId ||
    "";

  const flowId = firstParam(resolvedSearchParams.flow_id).trim();
  const rootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const sourceRecordId =
    firstParam(resolvedSearchParams.source_record_id).trim() ||
    firstParam(resolvedSearchParams.source_event_id).trim();
  const commandId = firstParam(resolvedSearchParams.command_id).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  let incidentsUnfiltered: IncidentItem[] = [];
  let fetchFailed = false;

  try {
    const raw = (await fetchIncidents({
      workspaceId: activeWorkspaceId || undefined,
      limit: 500,
    })) as unknown as FlexibleIncidentsResponse | unknown;

    incidentsUnfiltered = extractIncidentItems(raw);
  } catch {
    incidentsUnfiltered = [];
    fetchFailed = true;
  }

  const workspaceScoped = incidentsUnfiltered.filter((item) =>
    workspaceMatchesOrUnscoped(getIncidentWorkspaceId(item), activeWorkspaceId),
  );

  const cleanNormalized = workspaceScoped.filter(
    (item) => !isLegacyNoiseIncident(item),
  );

  const hasFilters = Boolean(flowId || rootEventId || sourceRecordId || commandId);

  const visibleIncidents = hasFilters
    ? cleanNormalized.filter((incident) =>
        incidentMatchesFilters(incident, {
          flowId,
          rootEventId,
          sourceRecordId,
          commandId,
        }),
      )
    : cleanNormalized;

  const openIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "open",
  );
  const escalatedIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "escalated",
  );
  const resolvedIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "resolved",
  );
  const criticalIncidents = visibleIncidents.filter(
    (item) => getIncidentSeverityNormalized(item) === "critical",
  );

  const activeIncidents = sortActiveIncidents([
    ...openIncidents,
    ...escalatedIncidents,
  ]);

  const sortedResolvedIncidents = sortResolvedIncidents(resolvedIncidents);

  const latestOpenIncident = latestIncidentByStatus(visibleIncidents, "open");
  const latestEscalatedIncident = latestIncidentByStatus(
    visibleIncidents,
    "escalated",
  );
  const latestResolvedIncident = latestIncidentByStatus(
    visibleIncidents,
    "resolved",
  );

  const criticalActiveIncidents = activeIncidents.filter(
    (item) => getIncidentSeverityNormalized(item) === "critical",
  );

  const escalatedOrBreachedActiveIncidents = activeIncidents.filter(
    (item) =>
      getIncidentStatusNormalized(item) === "escalated" || getSlaLabel(item) === "BREACHED",
  );

  const signalGapIncidents = visibleIncidents.filter((item) =>
    isSignalGapIncident(item),
  );

  const signalReadyCount = Math.max(
    0,
    visibleIncidents.length - signalGapIncidents.length,
  );

  const mostRecentIncident = getMostRecentIncident(visibleIncidents);

  const executivePosture = getExecutivePosture({
    activeCount: activeIncidents.length,
    escalatedCount: escalatedIncidents.length,
    criticalActiveCount: criticalActiveIncidents.length,
    resolvedCount: resolvedIncidents.length,
    visibleCount: visibleIncidents.length,
    signalGapCount: signalGapIncidents.length,
  });

  const backToFlowsHref =
    from === "flows" || from === "flow_detail"
      ? getBackToFlowsHref({ flowId, rootEventId, sourceRecordId }, activeWorkspaceId)
      : appendWorkspaceIdToHref("/flows", activeWorkspaceId);

  const commandsHref = appendWorkspaceIdToHref("/commands", activeWorkspaceId);
  const allIncidentsHref = appendWorkspaceIdToHref("/incidents", activeWorkspaceId);

  const focusIncident =
    sortVisibleIncidentsForFocus(visibleIncidents)[0] || null;

  const focusIncidentDetailHref = focusIncident
    ? getIncidentHref(focusIncident, activeWorkspaceId)
    : "";
  const focusIncidentFlowHref = focusIncident
    ? getFlowHref(focusIncident, activeWorkspaceId)
    : "";
  const focusIncidentCommandHref = focusIncident
    ? getCommandHref(focusIncident, activeWorkspaceId)
    : "";
  const focusIncidentEventHref = focusIncident
    ? getEventHref(focusIncident, activeWorkspaceId)
    : "";

  const focusRouteLock = focusIncident
    ? getIncidentRouteLock({
        incident: focusIncident,
        detailHref: focusIncidentDetailHref,
        flowHref: focusIncidentFlowHref,
        commandHref: focusIncidentCommandHref,
        eventHref: focusIncidentEventHref,
      })
    : null;

  const focusInvestigationFocus = focusIncident
    ? getInvestigationFocusLabel(focusIncident)
    : "Aucun incident focus";

  const focusPrimaryInvestigationAction =
    focusRouteLock?.primaryAction || null;

  const controlRoute =
    focusRouteLock?.primaryRoute ||
    getControlRouteLabel({
      hasFilters,
      primaryAction: focusPrimaryInvestigationAction,
    });

  const controlReturnLabel = getControlReturnLabel(hasFilters);

  const controlSurfaceCount = countDistinctSurfaces([
    backToFlowsHref,
    commandsHref,
    allIncidentsHref,
    focusIncidentDetailHref,
    focusIncidentFlowHref,
    focusIncidentCommandHref,
    focusIncidentEventHref,
  ]);

  const focusPrimaryControlAction = getControlPrimaryAction({
    primaryAction: focusPrimaryInvestigationAction,
    allIncidentsHref,
  });

  const moduleCards: ModuleCard[] = [
    {
      key: "signal",
      title: "Signal Layer",
      state: visibleIncidents.length > 0 ? "available" : "unavailable",
      summary:
        visibleIncidents.length > 0
          ? `${visibleIncidents.length} incident(s) visibles sur la surface.`
          : "Aucun incident visible sur ce scope.",
      href: visibleIncidents.length > 0 ? "#incident-list-signal-layer" : undefined,
      ctaLabel: "Ouvrir Signal",
    },
    {
      key: "investigation",
      title: "Investigation Layer",
      state: focusIncident ? "available" : "unavailable",
      summary: focusIncident
        ? `Focus actif : ${compactTechnicalId(
            getIncidentDisplayTitle(focusIncident),
            52,
          )}.`
        : "Aucun incident focus pour construire une enquête prioritaire.",
      href: focusIncident ? "#incident-list-investigation-layer" : undefined,
      ctaLabel: "Ouvrir Investigation",
    },
    {
      key: "executive",
      title: "Executive Layer",
      state: visibleIncidents.length > 0 ? "available" : "unavailable",
      summary: visibleIncidents.length > 0
        ? executivePosture.summary
        : "Aucune synthèse cockpit exploitable sans incidents visibles.",
      href: visibleIncidents.length > 0 ? "#incident-list-executive-layer" : undefined,
      ctaLabel: "Ouvrir Executive",
    },
    {
      key: "control",
      title: "Control Layer",
      state: focusPrimaryControlAction ? "available" : visibleIncidents.length > 0 ? "partial" : "unavailable",
      summary: focusPrimaryControlAction
        ? `Voie principale : ${controlRoute}.`
        : "Aucune action prioritaire globale déterminée.",
      href: visibleIncidents.length > 0 ? "#incident-list-control-layer" : undefined,
      ctaLabel: "Ouvrir Control",
    },
    {
      key: "needs-attention",
      title: "Needs Attention",
      state:
        activeIncidents.length > 0
          ? "available"
          : visibleIncidents.length > 0
            ? "partial"
            : "unavailable",
      summary:
        activeIncidents.length > 0
          ? `${activeIncidents.length} incident(s) actif(s) à traiter.`
          : visibleIncidents.length > 0
            ? "Aucun actif, mais la surface reste consultable."
            : "Aucun backlog actif visible.",
      href: visibleIncidents.length > 0 ? "#incident-list-needs-attention" : undefined,
      ctaLabel: "Ouvrir Needs Attention",
    },
    {
      key: "resolved",
      title: "Resolved",
      state:
        sortedResolvedIncidents.length > 0
          ? "available"
          : visibleIncidents.length > 0
            ? "partial"
            : "unavailable",
      summary:
        sortedResolvedIncidents.length > 0
          ? `${sortedResolvedIncidents.length} incident(s) résolu(s) visibles.`
          : visibleIncidents.length > 0
            ? "Aucun résolu sur ce scope, mais la section reste stable."
            : "Aucun historique résolu visible.",
      href: visibleIncidents.length > 0 ? "#incident-list-resolved" : undefined,
      ctaLabel: "Ouvrir Resolved",
    },
    {
      key: "flow-context",
      title: "Flow Context",
      state: hasFilters ? "available" : "partial",
      summary: hasFilters
        ? "La vue est pilotée depuis un contexte flow filtré."
        : "Aucun filtre flow actif sur la surface.",
      href: hasFilters ? "#incident-list-flow-context" : undefined,
      ctaLabel: "Ouvrir Context",
    },
    {
      key: "commands",
      title: "Commands Surface",
      state: commandsHref ? "available" : "unavailable",
      summary: commandsHref
        ? "La surface Commands reste disponible comme point de contrôle."
        : "Surface Commands indisponible.",
      href: commandsHref || undefined,
      ctaLabel: "Ouvrir Commands",
    },
  ];

  const quickRead =
    escalatedIncidents.length > 0
      ? "Priorité : ouvrir les incidents escaladés et vérifier les flows liés."
      : criticalIncidents.length > 0
        ? "Priorité : traiter les incidents critiques avant extension du backlog."
        : openIncidents.length > 0
          ? "Priorité : surveiller les incidents ouverts et leur progression SLA."
          : resolvedIncidents.length > 0
            ? "La vue visible est principalement composée d’incidents résolus."
            : "Aucune activité incident significative n’est visible pour le moment.";

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="Incidents"
      description="Vue orientée impact métier pour suivre les incidents ouverts, escaladés et résolus, avec navigation directe vers les flows BOSAI associés."
      badges={[
        { label: "Needs Attention", tone: "warning" },
        { label: "Impact métier", tone: "danger" },
        { label: "Flow-linked", tone: "info" },
      ]}
      metrics={[
        { label: "Open", value: openIncidents.length, toneClass: "text-sky-300" },
        {
          label: "Escalated",
          value: escalatedIncidents.length,
          toneClass: "text-amber-300",
        },
        {
          label: "Critical",
          value: criticalIncidents.length,
          toneClass: "text-red-300",
        },
        {
          label: "Resolved",
          value: resolvedIncidents.length,
          toneClass: "text-emerald-300",
        },
      ]}
      actions={
        <>
          {hasFilters ? (
            <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
              Retour au flow
            </Link>
          ) : (
            <Link
              href={appendWorkspaceIdToHref("/flows", activeWorkspaceId)}
              className={actionLinkClassName("soft")}
            >
              Ouvrir Flows
            </Link>
          )}

          <Link href={commandsHref} className={actionLinkClassName("primary")}>
            Voir Commands
          </Link>
        </>
      }
      aside={
        <>
          <SidePanelCard title="Lecture opérationnelle">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge kind="running" label="OPEN" />
                <DashboardStatusBadge kind="retry" label="ESCALATED" />
                <DashboardStatusBadge kind="failed" label="CRITICAL" />
                <DashboardStatusBadge kind="success" label="RESOLVED" />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Workspace :{" "}
                  <span className="text-white/90">
                    {activeWorkspaceId || "all"}
                  </span>
                </div>
                <p>
                  <span className="text-white/90">Needs Attention</span> regroupe
                  les incidents à traiter en priorité.
                </p>
                <p>
                  <span className="text-white/90">Critical</span> met l’accent sur
                  le niveau de sévérité métier.
                </p>
                <p>
                  <span className="text-white/90">SLA</span> aide à repérer les
                  risques de breach ou d’escalade.
                </p>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Quick read
                </div>
                <div className="mt-2 text-sm leading-6 text-white/70">
                  {quickRead}
                </div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Incident actif">
            {focusIncident && focusRouteLock ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Titre
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-white">
                    {getIncidentDisplayTitle(focusIncident)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DashboardStatusBadge
                    kind={getIncidentStatusBadgeKind(focusIncident)}
                    label={getIncidentStatusLabel(focusIncident)}
                  />
                  <DashboardStatusBadge
                    kind={getIncidentSeverityBadgeKind(focusIncident)}
                    label={getIncidentSeverityDisplayLabel(focusIncident)}
                  />
                  <DashboardStatusBadge
                    kind={getIncidentSlaBadgeKind(focusIncident)}
                    label={`SLA ${getSlaDisplayLabel(focusIncident)}`}
                  />
                  {isSignalGapIncident(focusIncident) ? (
                    <DashboardStatusBadge kind="unknown" label="PARTIAL SIGNAL" />
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <InvestigationField
                    label="Primary route"
                    value={focusRouteLock.primaryRoute}
                    valueClassName={toneTextClassName(focusRouteLock.tone)}
                  />
                  <InvestigationField
                    label="Primary surface"
                    value={focusRouteLock.primarySurface}
                    valueClassName={toneTextClassName(focusRouteLock.tone)}
                  />
                  <InvestigationField
                    label="Coverage"
                    value={focusRouteLock.coverage}
                    valueClassName={coverageTextClassName(focusRouteLock.coverage)}
                  />
                  <InvestigationField
                    label="CTA principal"
                    value={focusRouteLock.primaryAction.label}
                    valueClassName="text-emerald-300"
                  />
                </div>

                <div className="space-y-2 text-sm leading-6 text-white/65">
                  <div>
                    Workspace :{" "}
                    <span className="text-white/90">
                      {activeWorkspaceId || getWorkspaceDisplay(focusIncident)}
                    </span>
                  </div>
                  <div>
                    Activité :{" "}
                    <span className="text-white/90">
                      {formatDate(
                        getUpdatedAt(focusIncident) || getOpenedAt(focusIncident),
                      )}
                    </span>
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                  <div className={metaLabelClassName()}>Control note</div>
                  <div className="mt-2 text-sm leading-6 text-zinc-300">
                    {focusRouteLock.controlNote}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={focusRouteLock.primaryAction.href}
                    className={actionLinkClassName("primary")}
                  >
                    {focusRouteLock.primaryAction.label}
                  </Link>

                  {focusRouteLock.primaryAction.key !== "detail" &&
                  focusIncidentDetailHref ? (
                    <Link
                      href={focusIncidentDetailHref}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir le détail
                    </Link>
                  ) : null}

                  {focusRouteLock.primaryAction.key !== "flow" &&
                  focusIncidentFlowHref ? (
                    <Link
                      href={focusIncidentFlowHref}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir le flow lié
                    </Link>
                  ) : null}

                  {focusRouteLock.primaryAction.key !== "command" &&
                  focusIncidentCommandHref ? (
                    <Link
                      href={focusIncidentCommandHref}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir la command liée
                    </Link>
                  ) : null}

                  {focusRouteLock.primaryAction.key !== "event" &&
                  focusIncidentEventHref ? (
                    <Link
                      href={focusIncidentEventHref}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir l’event lié
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/55">Aucun incident sélectionné.</div>
            )}
          </SidePanelCard>
        </>
      }
    >
      {hasFilters ? (
        <div id="incident-list-flow-context">
          <SectionCard
            title="Filtré depuis Flows"
            description="Cette vue est limitée au contexte du flow sélectionné."
            tone="attention"
            action={<SectionCountPill value={visibleIncidents.length} tone="warning" />}
          >
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3">
                {flowId ? <span className={chipClassName()}>flow_id: {flowId}</span> : null}
                {rootEventId ? (
                  <span className={chipClassName()}>root_event_id: {rootEventId}</span>
                ) : null}
                {sourceRecordId ? (
                  <span className={chipClassName()}>
                    source_record_id: {sourceRecordId}
                  </span>
                ) : null}
                {commandId ? (
                  <span className={chipClassName()}>
                    command_id: {commandId}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
                  Retour aux flows
                </Link>

                <Link href={allIncidentsHref} className={actionLinkClassName("primary")}>
                  Voir tous les incidents
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {fetchFailed ? (
        <EmptyStatePanel
          title="Lecture Incidents indisponible"
          description="Le Dashboard n’a pas pu charger la surface Incidents. La vue est protégée, mais il faut vérifier la lecture API côté worker / helper."
        />
      ) : visibleIncidents.length === 0 ? (
        <div className="space-y-4">
          <EmptyStatePanel
            title={
              hasFilters
                ? "Aucun incident visible sur ce filtre"
                : "Aucun incident visible"
            }
            description={
              hasFilters
                ? `Le Dashboard a chargé ${cleanNormalized.length} incident(s) sur le scope courant, mais aucun ne correspond au filtre actif. Retire les paramètres flow_id, root_event_id, source_record_id, source_event_id ou command_id pour revoir tous les incidents.`
                : "Le Dashboard n’a remonté aucun incident sur la vue actuelle."
            }
          />

          {hasFilters ? (
            <SectionCard
              title="Filtre actif sans résultat"
              description="Les incidents existent peut-être encore sur le workspace, mais le filtre actuel ne matche aucun enregistrement."
              tone="attention"
              action={<SectionCountPill value={cleanNormalized.length} tone="warning" />}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={allIncidentsHref} className={actionLinkClassName("primary")}>
                  Voir tous les incidents
                </Link>

                <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
                  Retour aux flows
                </Link>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : (
        <>
          <div id="incident-list-signal-layer">
            <SectionCard
              title="Signal Layer"
              description="Lecture primaire de la surface Incidents : statut, sévérité, SLA et activité récente."
              action={<SectionCountPill value={visibleIncidents.length} tone="info" />}
            >
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                <IncidentMiniStat
                  label="Open"
                  value={openIncidents.length}
                  toneClass="text-sky-300"
                  panelTone="info"
                />
                <IncidentMiniStat
                  label="Escalated"
                  value={escalatedIncidents.length}
                  toneClass="text-amber-300"
                  panelTone="warning"
                />
                <IncidentMiniStat
                  label="Critical"
                  value={criticalIncidents.length}
                  toneClass="text-red-300"
                  panelTone="danger"
                />
                <IncidentMiniStat
                  label="Resolved"
                  value={resolvedIncidents.length}
                  toneClass="text-emerald-300"
                  panelTone="success"
                />
                <IncidentMiniStat
                  label="Visible"
                  value={visibleIncidents.length}
                  toneClass="text-white"
                  panelTone="default"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Latest open</div>
                  <div className="mt-2 text-zinc-100">
                    {formatDate(
                      latestOpenIncident
                        ? getUpdatedAt(latestOpenIncident) || getOpenedAt(latestOpenIncident)
                        : undefined,
                    )}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Latest escalated</div>
                  <div className="mt-2 text-zinc-100">
                    {formatDate(
                      latestEscalatedIncident
                        ? getUpdatedAt(latestEscalatedIncident) ||
                            getOpenedAt(latestEscalatedIncident)
                        : undefined,
                    )}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Latest resolved</div>
                  <div className="mt-2 text-zinc-100">
                    {formatDate(
                      latestResolvedIncident
                        ? getResolvedAt(latestResolvedIncident) ||
                            getUpdatedAt(latestResolvedIncident)
                        : undefined,
                    )}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Critical ratio</div>
                  <div className="mt-2 text-zinc-100">
                    {visibleIncidents.length > 0
                      ? `${criticalIncidents.length}/${visibleIncidents.length}`
                      : "0/0"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className={metaLabelClassName()}>Quick read</div>
                <div className="mt-2 text-sm leading-6 text-zinc-300">
                  {quickRead}
                </div>
              </div>
            </SectionCard>
          </div>

          <div id="incident-list-investigation-layer">
            <SectionCard
              title="Investigation Layer"
              description="Couche d’enquête globale pour identifier l’incident focus, la route primaire, la surface primaire et la couverture réelle."
              action={
                <SectionCountPill
                  value={focusIncident ? getIncidentLinkCoverageCount(focusIncident) : 0}
                  tone="info"
                />
              }
            >
              {focusIncident && focusRouteLock ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <DashboardStatusBadge
                      kind={getIncidentStatusBadgeKind(focusIncident)}
                      label={getIncidentStatusLabel(focusIncident)}
                    />
                    <DashboardStatusBadge
                      kind={getIncidentSeverityBadgeKind(focusIncident)}
                      label={getIncidentSeverityDisplayLabel(focusIncident)}
                    />
                    <DashboardStatusBadge
                      kind={getIncidentSlaBadgeKind(focusIncident)}
                      label={`SLA ${getSlaDisplayLabel(focusIncident)}`}
                    />
                    {isSignalGapIncident(focusIncident) ? (
                      <DashboardStatusBadge kind="unknown" label="PARTIAL SIGNAL" />
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InvestigationField
                      label="Incident focus"
                      value={getIncidentDisplayTitle(focusIncident)}
                      valueClassName="text-white"
                    />
                    <InvestigationField
                      label="Primary surface"
                      value={focusRouteLock.primarySurface}
                      valueClassName={toneTextClassName(focusRouteLock.tone)}
                    />
                    <InvestigationField
                      label="Primary route"
                      value={focusRouteLock.primaryRoute}
                      valueClassName={toneTextClassName(focusRouteLock.tone)}
                    />
                    <InvestigationField
                      label="Coverage"
                      value={focusRouteLock.coverage}
                      valueClassName={coverageTextClassName(focusRouteLock.coverage)}
                    />
                  </div>

                  <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                    <div className={metaLabelClassName()}>Focus actif</div>
                    <div className="mt-2 text-sm leading-6 text-zinc-300">
                      {focusInvestigationFocus}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Link
                      href={focusRouteLock.primaryAction.href}
                      className={actionLinkClassName("primary")}
                    >
                      {focusRouteLock.primaryAction.label}
                    </Link>

                    {focusRouteLock.primaryAction.key !== "detail" &&
                    focusIncidentDetailHref ? (
                      <Link
                        href={focusIncidentDetailHref}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir le détail
                      </Link>
                    ) : null}

                    {focusRouteLock.primaryAction.key !== "flow" &&
                    focusIncidentFlowHref ? (
                      <Link
                        href={focusIncidentFlowHref}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir le flow lié
                      </Link>
                    ) : null}

                    {focusRouteLock.primaryAction.key !== "command" &&
                    focusIncidentCommandHref ? (
                      <Link
                        href={focusIncidentCommandHref}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir la command liée
                      </Link>
                    ) : null}

                    {focusRouteLock.primaryAction.key !== "event" &&
                    focusIncidentEventHref ? (
                      <Link
                        href={focusIncidentEventHref}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir l’event lié
                      </Link>
                    ) : null}

                    <Link href={allIncidentsHref} className={actionLinkClassName("danger")}>
                      Voir tous les incidents
                    </Link>
                  </div>
                </>
              ) : (
                <EmptyStatePanel
                  title="Aucun incident focus"
                  description="Aucun incident n’est disponible pour construire une route d’enquête globale."
                />
              )}
            </SectionCard>
          </div>

          <div id="incident-list-executive-layer">
            <SectionCard
              title="Executive Layer"
              description="Lecture dirigeant / cockpit : posture, backlog, activité récente, criticité réelle et qualité du signal visible."
              action={
                <SectionCountPill
                  value={activeIncidents.length}
                  tone={executivePosture.countTone}
                />
              }
            >
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <IncidentMiniStat
                  label="Active backlog"
                  value={activeIncidents.length}
                  toneClass="text-white"
                  panelTone={
                    activeIncidents.length > 0 ? executivePosture.tone : "success"
                  }
                />
                <IncidentMiniStat
                  label="Critical active"
                  value={criticalActiveIncidents.length}
                  toneClass="text-red-300"
                  panelTone={
                    criticalActiveIncidents.length > 0 ? "danger" : "default"
                  }
                />
                <IncidentMiniStat
                  label="Signal ready"
                  value={signalReadyCount}
                  toneClass="text-emerald-300"
                  panelTone={signalReadyCount > 0 ? "success" : "default"}
                />
                <IncidentMiniStat
                  label="Signal gaps"
                  value={signalGapIncidents.length}
                  toneClass="text-amber-300"
                  panelTone={signalGapIncidents.length > 0 ? "warning" : "default"}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InvestigationField
                  label="Executive posture"
                  value={executivePosture.label}
                  valueClassName={toneTextClassName(executivePosture.tone)}
                />

                <InvestigationField
                  label="Posture note"
                  value={executivePosture.summary}
                />

                <InvestigationField
                  label="Recent activity"
                  value={
                    mostRecentIncident
                      ? `${formatDate(
                          getUpdatedAt(mostRecentIncident) ||
                            getOpenedAt(mostRecentIncident) ||
                            getResolvedAt(mostRecentIncident),
                        )} · ${compactTechnicalId(
                          getIncidentDisplayTitle(mostRecentIncident),
                          56,
                        )}`
                      : "—"
                  }
                />

                <InvestigationField
                  label="Backlog focus"
                  value={
                    activeIncidents.length > 0
                      ? `${activeIncidents.length} active · ${escalatedIncidents.length} escalated`
                      : "No active backlog visible"
                  }
                />

                <InvestigationField
                  label="Criticality real"
                  value={`${criticalActiveIncidents.length} critical active · ${escalatedOrBreachedActiveIncidents.length} escalated/breached`}
                />

                <InvestigationField
                  label="Signal quality"
                  value={
                    visibleIncidents.length > 0
                      ? `${signalReadyCount}/${visibleIncidents.length} ready · ${signalGapIncidents.length} gaps`
                      : "—"
                  }
                />
              </div>
            </SectionCard>
          </div>

          <div id="incident-list-control-layer">
            <SectionCard
              title="Control Layer"
              description="Couche de pilotage global pour décider comment agir maintenant sur la surface Incidents, sans quitter le cadre cockpit validé."
              action={<SectionCountPill value={controlSurfaceCount} tone="info" />}
            >
              {focusIncident && focusRouteLock ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <DashboardStatusBadge
                      kind={getIncidentStatusBadgeKind(focusIncident)}
                      label={getIncidentStatusLabel(focusIncident)}
                    />
                    <DashboardStatusBadge
                      kind="queued"
                      label={focusRouteLock.primaryRoute.toUpperCase()}
                    />
                    <DashboardStatusBadge
                      kind={getIncidentSlaBadgeKind(focusIncident)}
                      label={`SLA ${getSlaDisplayLabel(focusIncident)}`}
                    />
                    {focusPrimaryControlAction ? (
                      <DashboardStatusBadge kind="success" label="CONTROL READY" />
                    ) : (
                      <DashboardStatusBadge kind="unknown" label="CONTROL LIMITED" />
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InvestigationField
                      label="Primary route"
                      value={focusRouteLock.primaryRoute}
                      valueClassName={toneTextClassName(focusRouteLock.tone)}
                    />
                    <InvestigationField
                      label="Primary surface"
                      value={focusRouteLock.primarySurface}
                      valueClassName={toneTextClassName(focusRouteLock.tone)}
                    />
                    <InvestigationField
                      label="Coverage"
                      value={focusRouteLock.coverage}
                      valueClassName={coverageTextClassName(focusRouteLock.coverage)}
                    />
                    <InvestigationField
                      label="Control note"
                      value={focusRouteLock.controlNote}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Link
                      href={focusRouteLock.primaryAction.href}
                      className={actionLinkClassName("primary")}
                    >
                      {focusRouteLock.primaryAction.label}
                    </Link>

                    <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
                      {controlReturnLabel}
                    </Link>

                    <Link href={allIncidentsHref} className={actionLinkClassName("soft")}>
                      Voir tous les incidents
                    </Link>

                    <Link href={commandsHref} className={actionLinkClassName("soft")}>
                      Ouvrir Commands
                    </Link>

                    {focusIncidentDetailHref &&
                    focusRouteLock.primaryAction.href !== focusIncidentDetailHref ? (
                      <Link
                        href={focusIncidentDetailHref}
                        className={actionLinkClassName("danger")}
                      >
                        Ouvrir le détail
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : (
                <EmptyStatePanel
                  title="Aucune voie de contrôle"
                  description="Aucun incident focus n’est disponible pour construire un pilotage global prioritaire."
                />
              )}
            </SectionCard>
          </div>

          <div id="incident-list-module-extensions">
            <SectionCard
              title="Module Extensions"
              description="Vue modulaire globale de la surface Incidents pour savoir quelles couches et quelles surfaces sont disponibles, partielles ou indisponibles."
              action={<SectionCountPill value={moduleCards.length} tone="info" />}
            >
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

          <div id="incident-list-needs-attention">
            <SectionBlock
              title="Needs Attention"
              description="Incidents à surveiller en priorité : ouverts, escaladés, critiques ou encore non résolus."
              count={activeIncidents.length}
              countTone="warning"
              tone="attention"
            >
              {activeIncidents.length === 0 ? (
                <EmptyStatePanel
                  title="Aucun incident actif"
                  description="Aucun incident ouvert ou escaladé n’est visible pour le moment."
                />
              ) : (
                <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                  {activeIncidents.map((incident) => (
                    <IncidentListCard
                      key={incident.id}
                      incident={incident}
                      activeWorkspaceId={activeWorkspaceId}
                    />
                  ))}
                </div>
              )}
            </SectionBlock>
          </div>

          <div id="incident-list-resolved">
            <SectionBlock
              title="Resolved incidents"
              description="Historique des incidents déjà résolus, triés du plus récent au plus ancien."
              count={sortedResolvedIncidents.length}
              countTone="success"
              tone="neutral"
            >
              {sortedResolvedIncidents.length === 0 ? (
                <EmptyStatePanel
                  title="Aucun incident résolu"
                  description="Aucun incident résolu n’est visible sur cette vue pour le moment."
                />
              ) : (
                <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                  {sortedResolvedIncidents.map((incident) => (
                    <IncidentListCard
                      key={incident.id}
                      incident={incident}
                      activeWorkspaceId={activeWorkspaceId}
                    />
                  ))}
                </div>
              )}
            </SectionBlock>
          </div>
        </>
      )}
    </ControlPlaneShell>
  );
}
