import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { fetchIncidents, type IncidentItem } from "@/lib/api";
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

// {/* V2.38-incident-card-layout-repair */}

// {/* V2.37-global-visual-harmonization */}

// {/* V2.35-operator-summary-mobile-polish */}

type SearchParams = {
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_record_id?: string | string[];
  source_event_id?: string | string[];
  command_id?: string | string[];
  from?: string | string[];
  queue?: string | string[];
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

type SignalConfidenceLabel =
  | "SIGNAL READY"
  | "PARTIAL SIGNAL"
  | "LOW SIGNAL";

type ActionReadinessLabel =
  | "ACTION READY"
  | "NEEDS CONTEXT"
  | "WATCH ONLY";

type NextMoveLabel =
  | "OPEN COMMAND"
  | "OPEN FLOW"
  | "OPEN EVENT"
  | "OPEN DETAIL"
  | "REVIEW RESOLUTION"
  | "WATCH";

type TriagePriorityLabel =
  | "DO NOW"
  | "DO NEXT"
  | "NEEDS CONTEXT"
  | "WATCH";

type OperatorQueueBucket =
  | "NOW QUEUE"
  | "NEXT QUEUE"
  | "CONTEXT QUEUE"
  | "WATCH QUEUE";

type OperatorQueueFilter = "all" | "now" | "next" | "context" | "watch";

const OPERATOR_QUEUE_BUCKET_ORDER: OperatorQueueBucket[] = [
  "NOW QUEUE",
  "NEXT QUEUE",
  "CONTEXT QUEUE",
  "WATCH QUEUE",
];

type OperatorSummaryBadgeLabel =
  | "OPERATOR READY"
  | "ACTION FOCUS"
  | "CONTEXT NEEDED"
  | "ESCALATION FOCUS"
  | "QUIET SURFACE";

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
  return "rounded-[22px] sm:rounded-[28px] border border-white/10 bg-white/[0.04] p-3.5 md:p-4 xl:p-5 md:p-4 md:p-5 xl:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
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
  return "rounded-[20px] sm:rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-3.5 md:p-4 xl:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
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
  return incident.title || incident.name || incident.error_id || "Untitled incident";
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
  const raw = getIncidentStatusRaw(incident).trim().toLowerCase();
  const sla = (incident.sla_status || "").trim().toLowerCase();
  const hasResolvedAt = Boolean(incident.resolved_at);

  if (hasResolvedAt) return "resolved";

  const rawIsMissingOrUnknown =
    !raw ||
    raw === "unknown" ||
    raw === "—" ||
    raw === "-" ||
    raw === "n/a" ||
    raw === "null" ||
    raw === "undefined";

  if (rawIsMissingOrUnknown) {
    if (["open", "warning", "breached"].includes(sla)) return "open";
    if (["resolved", "closed", "done"].includes(sla)) return "resolved";
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

  if (["open", "warning", "breached"].includes(sla)) {
    return "open";
  }

  if (["resolved", "closed", "done"].includes(sla)) {
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
  return toTextOrEmpty((incident as Record<string, unknown>).source_record_id);
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
  return reason ? normalizeDisplayText(reason) : "NO DECISION REASON";
}

function getNextActionDisplay(incident: IncidentItem): string {
  const action = getNextAction(incident).trim();
  return action ? normalizeDisplayText(action) : "NO NEXT ACTION";
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

  const timestamp = new Date(
    getResolvedAt(incident) || getUpdatedAt(incident) || 0,
  ).getTime();

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
  return (
    isSignalGapIncident(incident) || getIncidentLinkCoverageCount(incident) === 0
  );
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

function getRouteActionLabel(key: InvestigationPrimaryAction["key"]): string {
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

  if (key === "detail") return "Couverture partielle";
  if (key === "event") return count >= 2 ? "Couverture reliée" : "Lecture locale";
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

function getIncidentSlaBadgeKind(incident: IncidentItem): DashboardStatusKind {
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

function getDecisionBadgeKind(incident: IncidentItem): DashboardStatusKind {
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

function getFlowHref(incident: IncidentItem, activeWorkspaceId?: string): string {
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

function isMissingSignalValue(value: string): boolean {
  const clean = value.trim().toLowerCase();

  return (
    !clean ||
    clean === "—" ||
    clean === "-" ||
    clean === "unknown" ||
    clean === "unclassified" ||
    clean === "undefined" ||
    clean === "null" ||
    clean === "n/a" ||
    clean === "na" ||
    clean === "no reason signal" ||
    clean === "no decision yet" ||
    clean === "no decision reason" ||
    clean === "no next action" ||
    clean === "uncategorized" ||
    clean === "unscoped"
  );
}

function titleLooksWeakForSignal(value: string): boolean {
  const clean = value.trim().toLowerCase();

  return (
    titleLooksGeneric(value) ||
    clean === "incident détecté" ||
    clean === "incident detecte" ||
    clean === "new incident" ||
    clean === "unknown incident" ||
    clean === "unclassified incident" ||
    clean === "sans titre"
  );
}

function getSignalGapReasons(incident: IncidentItem): string[] {
  const reasons: string[] = [];

  const rawTitle = getIncidentTitle(incident);
  const rawSeverity = getIncidentSeverityRaw(incident);
  const normalizedSeverity = getIncidentSeverityNormalized(incident);
  const workspaceId = getIncidentWorkspaceId(incident);
  const category = getCategory(incident);
  const reason = getReason(incident);
  const rawStatus = getIncidentStatusRaw(incident).trim().toLowerCase();
  const slaStatus = (incident.sla_status || "").trim().toLowerCase();

  const rawStatusIsMissingOrUnknown =
    !rawStatus ||
    rawStatus === "unknown" ||
    rawStatus === "—" ||
    rawStatus === "-" ||
    rawStatus === "n/a" ||
    rawStatus === "null" ||
    rawStatus === "undefined";

  if (titleLooksWeakForSignal(rawTitle)) reasons.push("Titre générique ou manquant");

  if (
    normalizedSeverity === "unknown" ||
    isMissingSignalValue(rawSeverity) ||
    getIncidentSeverityDisplayLabel(incident) === "UNCLASSIFIED"
  ) {
    reasons.push("Sévérité inconnue");
  }

  if (isMissingSignalValue(workspaceId)) reasons.push("Workspace absent");
  if (isMissingSignalValue(category)) reasons.push("Catégorie absente");
  if (isMissingSignalValue(reason)) reasons.push("Raison absente");

  if (getIncidentLinkCoverageCount(incident) === 0) {
    reasons.push("Aucun lien flow / command / event / run");
  }

  if (
    rawStatusIsMissingOrUnknown &&
    ["open", "warning", "breached"].includes(slaStatus)
  ) {
    reasons.push("Statut reconstruit depuis le SLA");
  }

  return reasons;
}

function getSignalConfidenceLabel(incident: IncidentItem): SignalConfidenceLabel {
  const reasons = getSignalGapReasons(incident);

  if (reasons.length === 0) return "SIGNAL READY";
  if (reasons.length >= 4) return "LOW SIGNAL";

  return "PARTIAL SIGNAL";
}

function getSignalConfidenceClassName(label: SignalConfidenceLabel): string {
  if (label === "SIGNAL READY") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (label === "LOW SIGNAL") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-sky-400/25 bg-sky-400/10 text-sky-200";
}

function getSignalQualityStats(incidents: IncidentItem[]): {
  ready: number;
  partial: number;
  low: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      const label = getSignalConfidenceLabel(incident);

      if (label === "SIGNAL READY") acc.ready += 1;
      if (label === "PARTIAL SIGNAL") acc.partial += 1;
      if (label === "LOW SIGNAL") acc.low += 1;

      return acc;
    },
    { ready: 0, partial: 0, low: 0 },
  );
}

function getSignalTruthLabel(incident: IncidentItem): string {
  return getSignalConfidenceLabel(incident);
}

function hasIncidentActionSurface(incident: IncidentItem): boolean {
  const hasCommand = getCommandRecord(incident) !== "—";
  const hasFlow = Boolean(getBestFlowTargetFromIncident(incident).trim());
  const hasEvent = Boolean(getEventTargetFromIncident(incident).trim());

  return hasCommand || hasFlow || hasEvent;
}

function hasIncidentActionContext(incident: IncidentItem): boolean {
  const reason = getReason(incident).trim();
  const nextAction = getNextAction(incident).trim();
  const decision = getDecisionStatus(incident).trim();

  return (
    hasIncidentActionSurface(incident) ||
    !isMissingSignalValue(reason) ||
    Boolean(nextAction) ||
    Boolean(decision)
  );
}

function getIncidentActionReadinessLabel(
  incident: IncidentItem,
): ActionReadinessLabel {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const slaLabel = getSlaLabel(incident).trim().toLowerCase();
  const signalConfidence = getSignalConfidenceLabel(incident);
  const hasSurface = hasIncidentActionSurface(incident);
  const hasContext = hasIncidentActionContext(incident);

  if (status === "resolved") return "WATCH ONLY";
  if (status === "escalated") return hasSurface ? "ACTION READY" : "NEEDS CONTEXT";
  if (slaLabel === "breached" || slaLabel === "warning") {
    return hasContext ? "ACTION READY" : "NEEDS CONTEXT";
  }
  if (severity === "critical" || severity === "high") {
    return hasContext ? "ACTION READY" : "NEEDS CONTEXT";
  }
  if (signalConfidence === "LOW SIGNAL") return "NEEDS CONTEXT";
  if (status === "open") return hasContext ? "ACTION READY" : "NEEDS CONTEXT";

  return "WATCH ONLY";
}

function getIncidentActionReadinessReason(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const slaLabel = getSlaLabel(incident).trim().toLowerCase();
  const signalConfidence = getSignalConfidenceLabel(incident);
  const hasSurface = hasIncidentActionSurface(incident);
  const hasContext = hasIncidentActionContext(incident);

  if (status === "resolved") return "Incident résolu : surveillance uniquement.";

  if (status === "escalated") {
    return hasSurface
      ? "Incident escaladé avec surface d’action liée."
      : "Incident escaladé mais contexte de pilotage incomplet.";
  }

  if (slaLabel === "breached" || slaLabel === "warning") {
    return hasContext
      ? "SLA actif avec contexte suffisant pour agir."
      : "SLA actif mais contexte incomplet.";
  }

  if (severity === "critical" || severity === "high") {
    return hasContext
      ? "Sévérité élevée avec contexte exploitable."
      : "Sévérité élevée mais contexte incomplet.";
  }

  if (signalConfidence === "LOW SIGNAL") {
    return "Signal faible : ouvrir le détail avant action.";
  }

  if (status === "open") {
    return hasContext
      ? "Incident ouvert avec action ou contexte disponible."
      : "Incident ouvert mais contexte insuffisant.";
  }

  return "Aucune action directe détectée.";
}

function getActionReadinessClassName(label: ActionReadinessLabel): string {
  if (label === "ACTION READY") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (label === "NEEDS CONTEXT") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-zinc-400/20 bg-white/[0.04] text-zinc-300";
}

function getActionReadinessBadgeKind(
  label: ActionReadinessLabel,
): DashboardStatusKind {
  if (label === "ACTION READY") return "success";
  if (label === "NEEDS CONTEXT") return "retry";
  return "unknown";
}

function getActionReadinessStats(incidents: IncidentItem[]): {
  ready: number;
  needsContext: number;
  watchOnly: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      const label = getIncidentActionReadinessLabel(incident);

      if (label === "ACTION READY") acc.ready += 1;
      if (label === "NEEDS CONTEXT") acc.needsContext += 1;
      if (label === "WATCH ONLY") acc.watchOnly += 1;

      return acc;
    },
    { ready: 0, needsContext: 0, watchOnly: 0 },
  );
}

function getIncidentNextMoveLabel(args: {
  incident: IncidentItem;
  commandHref: string;
  flowHref: string;
  eventHref: string;
}): NextMoveLabel {
  const { incident, commandHref, flowHref, eventHref } = args;
  const readiness = getIncidentActionReadinessLabel(incident);

  if (readiness === "ACTION READY" && commandHref) return "OPEN COMMAND";
  if (readiness === "ACTION READY" && flowHref) return "OPEN FLOW";
  if (readiness === "ACTION READY" && eventHref) return "OPEN EVENT";
  if (readiness === "NEEDS CONTEXT") return "OPEN DETAIL";
  if (readiness === "WATCH ONLY" && isIncidentResolved(incident)) {
    return "REVIEW RESOLUTION";
  }

  return "WATCH";
}

function getIncidentNextMoveReason(label: NextMoveLabel): string {
  if (label === "OPEN COMMAND") {
    return "La command liée est la meilleure surface pour agir.";
  }

  if (label === "OPEN FLOW") {
    return "Le flow lié est la meilleure surface pour comprendre et agir.";
  }

  if (label === "OPEN EVENT") {
    return "L’event lié est la meilleure surface source à vérifier.";
  }

  if (label === "OPEN DETAIL") {
    return "Le contexte est incomplet : ouvrir le détail incident avant action.";
  }

  if (label === "REVIEW RESOLUTION") {
    return "Incident résolu : vérifier la clôture et l’état final.";
  }

  return "Aucune action directe prioritaire détectée.";
}

function getIncidentNextMoveHref(args: {
  label: NextMoveLabel;
  detailHref: string;
  commandHref: string;
  flowHref: string;
  eventHref: string;
}): string {
  const { label, detailHref, commandHref, flowHref, eventHref } = args;

  if (label === "OPEN COMMAND") return commandHref || detailHref;
  if (label === "OPEN FLOW") return flowHref || detailHref;
  if (label === "OPEN EVENT") return eventHref || detailHref;
  if (label === "OPEN DETAIL") return detailHref;
  if (label === "REVIEW RESOLUTION") return detailHref;

  return detailHref;
}

function getNextMoveClassName(label: NextMoveLabel): string {
  if (label === "OPEN COMMAND") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (label === "OPEN FLOW") {
    return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  }

  if (label === "OPEN EVENT") {
    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-200";
  }

  if (label === "OPEN DETAIL") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  if (label === "REVIEW RESOLUTION") {
    return "border-emerald-400/20 bg-emerald-400/5 text-emerald-300";
  }

  return "border-zinc-400/20 bg-white/[0.04] text-zinc-300";
}

function getNextMoveBadgeKind(label: NextMoveLabel): DashboardStatusKind {
  if (label === "OPEN COMMAND") return "success";
  if (label === "OPEN FLOW") return "queued";
  if (label === "OPEN EVENT") return "queued";
  if (label === "OPEN DETAIL") return "retry";
  if (label === "REVIEW RESOLUTION") return "success";

  return "unknown";
}

function getNextMoveStats(
  incidents: IncidentItem[],
  activeWorkspaceId?: string,
): {
  command: number;
  flow: number;
  event: number;
  detail: number;
  review: number;
  watch: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      const commandHref = getCommandHref(incident, activeWorkspaceId);
      const flowHref = getFlowHref(incident, activeWorkspaceId);
      const eventHref = getEventHref(incident, activeWorkspaceId);

      const label = getIncidentNextMoveLabel({
        incident,
        commandHref,
        flowHref,
        eventHref,
      });

      if (label === "OPEN COMMAND") acc.command += 1;
      if (label === "OPEN FLOW") acc.flow += 1;
      if (label === "OPEN EVENT") acc.event += 1;
      if (label === "OPEN DETAIL") acc.detail += 1;
      if (label === "REVIEW RESOLUTION") acc.review += 1;
      if (label === "WATCH") acc.watch += 1;

      return acc;
    },
    { command: 0, flow: 0, event: 0, detail: 0, review: 0, watch: 0 },
  );
}

function getIncidentTriagePriorityLabel(args: {
  incident: IncidentItem;
  nextMoveLabel: NextMoveLabel;
  actionReadinessLabel: ActionReadinessLabel;
}): TriagePriorityLabel {
  const { incident, nextMoveLabel, actionReadinessLabel } = args;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const slaLabel = getSlaLabel(incident).trim().toLowerCase();
  const signalConfidence = getSignalConfidenceLabel(incident);

  if (
    status === "resolved" ||
    actionReadinessLabel === "WATCH ONLY" ||
    nextMoveLabel === "WATCH" ||
    nextMoveLabel === "REVIEW RESOLUTION"
  ) {
    return "WATCH";
  }

  if (
    actionReadinessLabel === "NEEDS CONTEXT" ||
    nextMoveLabel === "OPEN DETAIL" ||
    signalConfidence === "LOW SIGNAL" ||
    getIncidentLinkCoverageCount(incident) === 0
  ) {
    return "NEEDS CONTEXT";
  }

  if (status === "escalated") {
    return actionReadinessLabel === "ACTION READY" ? "DO NOW" : "NEEDS CONTEXT";
  }

  if (slaLabel === "breached") {
    return actionReadinessLabel === "ACTION READY" ? "DO NOW" : "NEEDS CONTEXT";
  }

  if (severity === "critical" || severity === "high") {
    return actionReadinessLabel === "ACTION READY" ? "DO NOW" : "NEEDS CONTEXT";
  }

  if (slaLabel === "warning") {
    return actionReadinessLabel === "ACTION READY" ? "DO NEXT" : "NEEDS CONTEXT";
  }

  if (status === "open" && actionReadinessLabel === "ACTION READY") {
    return "DO NEXT";
  }

  if (
    actionReadinessLabel === "ACTION READY" &&
    (nextMoveLabel === "OPEN COMMAND" ||
      nextMoveLabel === "OPEN FLOW" ||
      nextMoveLabel === "OPEN EVENT")
  ) {
    return "DO NEXT";
  }

  return "WATCH";
}

function getIncidentTriagePriorityReason(label: TriagePriorityLabel): string {
  if (label === "DO NOW") {
    return "Incident prioritaire : traiter immédiatement depuis la meilleure surface disponible.";
  }

  if (label === "DO NEXT") {
    return "Incident actionnable : traiter après les urgences immédiates.";
  }

  if (label === "NEEDS CONTEXT") {
    return "Incident à compléter avant action.";
  }

  return "Incident visible mais sans action immédiate.";
}

function getTriagePriorityClassName(label: TriagePriorityLabel): string {
  if (label === "DO NOW") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }

  if (label === "DO NEXT") {
    return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  }

  if (label === "NEEDS CONTEXT") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-zinc-400/20 bg-white/[0.04] text-zinc-300";
}

function getTriagePriorityBadgeKind(
  label: TriagePriorityLabel,
): DashboardStatusKind {
  if (label === "DO NOW") return "failed";
  if (label === "DO NEXT") return "running";
  if (label === "NEEDS CONTEXT") return "retry";
  return "unknown";
}

function getTriagePriorityStats(
  incidents: IncidentItem[],
  activeWorkspaceId?: string,
): {
  doNow: number;
  doNext: number;
  needsContext: number;
  watch: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      const commandHref = getCommandHref(incident, activeWorkspaceId);
      const flowHref = getFlowHref(incident, activeWorkspaceId);
      const eventHref = getEventHref(incident, activeWorkspaceId);

      const nextMoveLabel = getIncidentNextMoveLabel({
        incident,
        commandHref,
        flowHref,
        eventHref,
      });

      const actionReadinessLabel = getIncidentActionReadinessLabel(incident);

      const label = getIncidentTriagePriorityLabel({
        incident,
        nextMoveLabel,
        actionReadinessLabel,
      });

      if (label === "DO NOW") acc.doNow += 1;
      if (label === "DO NEXT") acc.doNext += 1;
      if (label === "NEEDS CONTEXT") acc.needsContext += 1;
      if (label === "WATCH") acc.watch += 1;

      return acc;
    },
    { doNow: 0, doNext: 0, needsContext: 0, watch: 0 },
  );
}

function getIncidentOperatorQueueBucket(args: {
  triagePriorityLabel: TriagePriorityLabel;
}): OperatorQueueBucket {
  if (args.triagePriorityLabel === "DO NOW") return "NOW QUEUE";
  if (args.triagePriorityLabel === "DO NEXT") return "NEXT QUEUE";
  if (args.triagePriorityLabel === "NEEDS CONTEXT") return "CONTEXT QUEUE";

  return "WATCH QUEUE";
}

function getOperatorQueueBucketReason(bucket: OperatorQueueBucket): string {
  if (bucket === "NOW QUEUE") {
    return "File immédiate : incidents à traiter maintenant.";
  }

  if (bucket === "NEXT QUEUE") {
    return "File suivante : incidents actionnables après les urgences.";
  }

  if (bucket === "CONTEXT QUEUE") {
    return "File contexte : incidents à compléter avant action.";
  }

  return "File surveillance : incidents visibles sans action immédiate.";
}

function getOperatorQueueBucketClassName(bucket: OperatorQueueBucket): string {
  if (bucket === "NOW QUEUE") {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }

  if (bucket === "NEXT QUEUE") {
    return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  }

  if (bucket === "CONTEXT QUEUE") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  }

  return "border-zinc-400/20 bg-white/[0.04] text-zinc-300";
}

function getOperatorQueueBucketBadgeKind(
  bucket: OperatorQueueBucket,
): DashboardStatusKind {
  if (bucket === "NOW QUEUE") return "failed";
  if (bucket === "NEXT QUEUE") return "running";
  if (bucket === "CONTEXT QUEUE") return "retry";

  return "unknown";
}

function getOperatorQueueStats(
  incidents: IncidentItem[],
  activeWorkspaceId?: string,
): {
  now: number;
  next: number;
  context: number;
  watch: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      if (
        activeWorkspaceId &&
        !workspaceMatchesOrUnscoped(getIncidentWorkspaceId(incident), activeWorkspaceId)
      ) {
        return acc;
      }

      const commandHref = getCommandHref(incident, activeWorkspaceId);
      const flowHref = getFlowHref(incident, activeWorkspaceId);
      const eventHref = getEventHref(incident, activeWorkspaceId);

      const nextMoveLabel = getIncidentNextMoveLabel({
        incident,
        commandHref,
        flowHref,
        eventHref,
      });

      const actionReadinessLabel = getIncidentActionReadinessLabel(incident);

      const triagePriorityLabel = getIncidentTriagePriorityLabel({
        incident,
        nextMoveLabel,
        actionReadinessLabel,
      });

      const bucket = getIncidentOperatorQueueBucket({ triagePriorityLabel });

      if (bucket === "NOW QUEUE") acc.now += 1;
      if (bucket === "NEXT QUEUE") acc.next += 1;
      if (bucket === "CONTEXT QUEUE") acc.context += 1;
      if (bucket === "WATCH QUEUE") acc.watch += 1;

      return acc;
    },
    { now: 0, next: 0, context: 0, watch: 0 },
  );
}

function getOperatorQueueSummaryText(args: {
  queueStats: {
    now: number;
    next: number;
    context: number;
    watch: number;
  };
}): string {
  return `${args.queueStats.now} now · ${args.queueStats.next} next · ${args.queueStats.context} context · ${args.queueStats.watch} watch`;
}

function getOperatorQueueItemHref(
  incident: IncidentItem,
  activeWorkspaceId?: string,
): string {
  const detailHref = getIncidentHref(incident, activeWorkspaceId);
  const commandHref = getCommandHref(incident, activeWorkspaceId);
  const flowHref = getFlowHref(incident, activeWorkspaceId);
  const eventHref = getEventHref(incident, activeWorkspaceId);

  const nextMoveLabel = getIncidentNextMoveLabel({
    incident,
    commandHref,
    flowHref,
    eventHref,
  });

  return getIncidentNextMoveHref({
    label: nextMoveLabel,
    detailHref,
    commandHref,
    flowHref,
    eventHref,
  });
}

function getOperatorQueueBucketItems(args: {
  incidents: IncidentItem[];
  bucket: OperatorQueueBucket;
  activeWorkspaceId?: string;
}): IncidentItem[] {
  const { incidents, bucket, activeWorkspaceId } = args;

  return sortVisibleIncidentsForFocus(incidents).filter((incident) => {
    if (
      activeWorkspaceId &&
      !workspaceMatchesOrUnscoped(getIncidentWorkspaceId(incident), activeWorkspaceId)
    ) {
      return false;
    }

    const commandHref = getCommandHref(incident, activeWorkspaceId);
    const flowHref = getFlowHref(incident, activeWorkspaceId);
    const eventHref = getEventHref(incident, activeWorkspaceId);

    const nextMoveLabel = getIncidentNextMoveLabel({
      incident,
      commandHref,
      flowHref,
      eventHref,
    });

    const actionReadinessLabel = getIncidentActionReadinessLabel(incident);

    const triagePriorityLabel = getIncidentTriagePriorityLabel({
      incident,
      nextMoveLabel,
      actionReadinessLabel,
    });

    const incidentBucket = getIncidentOperatorQueueBucket({
      triagePriorityLabel,
    });

    return incidentBucket === bucket;
  });
}

function getOperatorQueueBucketLimitLabel(
  totalCount: number,
  visibleLimit = 3,
): string {
  const remainingCount = Math.max(totalCount - visibleLimit, 0);
  return remainingCount > 0 ? `+${remainingCount} autres` : "";
}

function getOperatorQueueFilterFromSearchParam(
  value?: string | string[],
): OperatorQueueFilter {
  const raw = firstParam(value).trim().toLowerCase();

  if (raw === "now") return "now";
  if (raw === "next") return "next";
  if (raw === "context") return "context";
  if (raw === "watch") return "watch";

  return "all";
}

function getOperatorQueueFilterLabel(filter: OperatorQueueFilter): string {
  if (filter === "now") return "NOW QUEUE";
  if (filter === "next") return "NEXT QUEUE";
  if (filter === "context") return "CONTEXT QUEUE";
  if (filter === "watch") return "WATCH QUEUE";

  return "ALL QUEUES";
}

function getOperatorQueueFilterFromBucket(
  bucket: OperatorQueueBucket,
): OperatorQueueFilter {
  if (bucket === "NOW QUEUE") return "now";
  if (bucket === "NEXT QUEUE") return "next";
  if (bucket === "CONTEXT QUEUE") return "context";

  return "watch";
}

function getOperatorQueueBucketFocusCtaLabel(bucket: OperatorQueueBucket): string {
  if (bucket === "NOW QUEUE") return "Focus Now";
  if (bucket === "NEXT QUEUE") return "Focus Next";
  if (bucket === "CONTEXT QUEUE") return "Focus Context";

  return "Focus Watch";
}

function getOperatorQueueFilterHref(args: {
  filter: OperatorQueueFilter;
  activeWorkspaceId?: string;
  flowId?: string;
  rootEventId?: string;
  sourceRecordId?: string;
  commandId?: string;
}): string {
  return buildHref("/incidents", {
    workspace_id: args.activeWorkspaceId || undefined,
    flow_id: args.flowId || undefined,
    root_event_id: args.rootEventId || undefined,
    source_record_id: args.sourceRecordId || undefined,
    command_id: args.commandId || undefined,
    queue: args.filter,
  });
}

function queueFocusLinkClassName(active: boolean): string {
  return [
    "inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-xs font-medium transition",
    active
      ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
      : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white",
  ].join(" ");
}

function incidentMatchesOperatorQueueFilter(args: {
  incident: IncidentItem;
  filter: OperatorQueueFilter;
  activeWorkspaceId?: string;
}): boolean {
  const { incident, filter, activeWorkspaceId } = args;

  if (
    activeWorkspaceId &&
    !workspaceMatchesOrUnscoped(getIncidentWorkspaceId(incident), activeWorkspaceId)
  ) {
    return false;
  }

  if (filter === "all") return true;

  const commandHref = getCommandHref(incident, activeWorkspaceId);
  const flowHref = getFlowHref(incident, activeWorkspaceId);
  const eventHref = getEventHref(incident, activeWorkspaceId);

  const nextMoveLabel = getIncidentNextMoveLabel({
    incident,
    commandHref,
    flowHref,
    eventHref,
  });

  const actionReadinessLabel = getIncidentActionReadinessLabel(incident);

  const triagePriorityLabel = getIncidentTriagePriorityLabel({
    incident,
    nextMoveLabel,
    actionReadinessLabel,
  });

  const bucket = getIncidentOperatorQueueBucket({
    triagePriorityLabel,
  });

  return bucket === getOperatorQueueFilterLabel(filter);
}

function getOperatorQueueFilterHelpText(filter: OperatorQueueFilter): string {
  if (filter === "now") {
    return "File immédiate : traiter le premier incident disponible, puis revenir à la file.";
  }

  if (filter === "next") {
    return "File suivante : incidents actionnables après les urgences immédiates.";
  }

  if (filter === "context") {
    return "File contexte : compléter les informations avant action.";
  }

  if (filter === "watch") {
    return "File surveillance : garder la visibilité sans action immédiate.";
  }

  return "Toutes les files restent visibles.";
}

function getQueueFocusedFirstIncident(
  incidents: IncidentItem[],
): IncidentItem | null {
  return incidents[0] || null;
}

function getQueueFocusedFirstIncidentHref(args: {
  incidents: IncidentItem[];
  activeWorkspaceId?: string;
}): string {
  const firstIncident = args.incidents[0];
  if (!firstIncident) return "";

  return getOperatorQueueItemHref(firstIncident, args.activeWorkspaceId);
}

function getOperatorQueueProgressLabel(filter: OperatorQueueFilter): string {
  if (filter === "now") return "File prioritaire active";
  if (filter === "next") return "File suivante active";
  if (filter === "context") return "File contexte active";
  if (filter === "watch") return "File surveillance active";

  return "Toutes les files visibles";
}

function getOperatorQueueRemainingLabel(count: number): string {
  const remainingCount = Math.max(count - 1, 0);

  return `${remainingCount} ${
    remainingCount > 1 ? "incidents" : "incident"
  } après celui-ci`;
}

function getOperatorQueuePreviousFilter(
  filter: OperatorQueueFilter,
): OperatorQueueFilter {
  if (filter === "now") return "watch";
  if (filter === "next") return "now";
  if (filter === "context") return "next";
  if (filter === "watch") return "context";

  return "all";
}

function getOperatorQueueNextFilter(
  filter: OperatorQueueFilter,
): OperatorQueueFilter {
  if (filter === "now") return "next";
  if (filter === "next") return "context";
  if (filter === "context") return "watch";
  if (filter === "watch") return "now";

  return "all";
}

function getOperatorQueuePositionLabel(
  filter: OperatorQueueFilter,
): string {
  if (filter === "now") return "File 1 / 4";
  if (filter === "next") return "File 2 / 4";
  if (filter === "context") return "File 3 / 4";
  if (filter === "watch") return "File 4 / 4";

  return "Toutes les files";
}


type QueueRiskLevel = "HIGH RISK" | "MEDIUM RISK" | "LOW RISK";

function getQueueRiskStats(
  incidents: IncidentItem[],
): {
  escalated: number;
  highCritical: number;
  slaRisk: number;
  needsContext: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      const status = getIncidentStatusNormalized(incident);
      const severity = getIncidentSeverityNormalized(incident);
      const slaLabel = getSlaLabel(incident).trim().toUpperCase();
      const actionReadinessLabel = getIncidentActionReadinessLabel(incident);

      if (status === "escalated") acc.escalated += 1;

      if (severity === "high" || severity === "critical") {
        acc.highCritical += 1;
      }

      if (slaLabel === "BREACHED" || slaLabel === "WARNING") {
        acc.slaRisk += 1;
      }

      if (actionReadinessLabel === "NEEDS CONTEXT") {
        acc.needsContext += 1;
      }

      return acc;
    },
    {
      escalated: 0,
      highCritical: 0,
      slaRisk: 0,
      needsContext: 0,
    },
  );
}

function getQueueRiskLevel(
  incidents: IncidentItem[],
  activeWorkspaceId?: string,
): QueueRiskLevel {
  const scopedIncidents = activeWorkspaceId
    ? incidents.filter((incident) =>
        workspaceMatchesOrUnscoped(
          getIncidentWorkspaceId(incident),
          activeWorkspaceId,
        ),
      )
    : incidents;

  const stats = getQueueRiskStats(scopedIncidents);

  const hasCritical = scopedIncidents.some(
    (incident) => getIncidentSeverityNormalized(incident) === "critical",
  );

  const hasBreachedSla = scopedIncidents.some(
    (incident) => getSlaLabel(incident).trim().toUpperCase() === "BREACHED",
  );

  if (stats.escalated > 0 || hasCritical || hasBreachedSla) {
    return "HIGH RISK";
  }

  if (stats.highCritical > 0 || stats.slaRisk > 0 || stats.needsContext > 0) {
    return "MEDIUM RISK";
  }

  return "LOW RISK";
}

function getQueueRiskSummary(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Risque fort détecté dans cette file.";
  if (level === "MEDIUM RISK") return "Risque moyen détecté dans cette file.";

  return "Risque faible sur cette file.";
}

function getQueueRecommendedActionLabel(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Traiter maintenant";
  if (level === "MEDIUM RISK") return "Compléter avant action";

  return "Surveiller";
}

function getQueueRecommendedActionReason(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Cette file contient un signal fort. Ouvre le premier incident et traite la surface recommandée.";
  }

  if (level === "MEDIUM RISK") {
    return "Cette file contient un signal intermédiaire. Vérifie le contexte avant d’agir.";
  }

  return "Cette file ne montre pas de risque immédiat. Garde-la en surveillance.";
}

function getQueueExecutionChecklist(level: QueueRiskLevel): string[] {
  if (level === "HIGH RISK") {
    return [
      "1. Ouvrir le premier incident",
      "2. Traiter la surface recommandée",
      "3. Vérifier la réduction du risque",
    ];
  }

  if (level === "MEDIUM RISK") {
    return [
      "1. Ouvrir le premier incident",
      "2. Compléter le contexte manquant",
      "3. Revenir à la file après vérification",
    ];
  }

  return [
    "1. Garder la file en surveillance",
    "2. Vérifier le premier incident si nécessaire",
    "3. Revenir aux files globales",
  ];
}

function getQueueExecutionNote(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Exécution prioritaire : réduire le risque avant de passer à la file suivante.";
  }

  if (level === "MEDIUM RISK") {
    return "Exécution contextuelle : clarifier avant d’agir.";
  }

  return "Exécution légère : surveillance sans action immédiate.";
}


type QueueDecisionConfidence =
  | "HIGH CONFIDENCE"
  | "MEDIUM CONFIDENCE"
  | "LOW CONFIDENCE";

function getQueueOutcomeTitle(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Risque à réduire";
  if (level === "MEDIUM RISK") return "Contexte à clarifier";

  return "Surveillance à maintenir";
}

function getQueueOutcomeSummary(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Après traitement, vérifier que le risque baisse avant de passer à la file suivante.";
  }

  if (level === "MEDIUM RISK") {
    return "Après vérification, revenir à la file pour décider si l’incident devient actionnable.";
  }

  return "Après contrôle rapide, revenir aux files globales ou maintenir la surveillance.";
}

function getQueueOutcomeNextStep(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Traiter puis revenir à cette file";
  if (level === "MEDIUM RISK") return "Compléter puis réévaluer";

  return "Surveiller puis revenir All queues";
}

function getQueueOperatorDecisionLabel(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Décision : intervention immédiate";
  if (level === "MEDIUM RISK") return "Décision : clarification requise";

  return "Décision : surveillance contrôlée";
}

function getQueueOperatorDecisionReason(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Le niveau de risque impose une action immédiate sur le premier incident de la file.";
  }

  if (level === "MEDIUM RISK") {
    return "Le niveau de risque demande de compléter le contexte avant une action forte.";
  }

  return "Le niveau de risque permet de maintenir la file sous surveillance sans intervention urgente.";
}

function getQueueOperatorDecisionNextStep(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Ouvrir maintenant";
  if (level === "MEDIUM RISK") return "Vérifier le contexte";

  return "Continuer la surveillance";
}

function getQueueDecisionConfidence(args: {
  level: QueueRiskLevel;
  nextMoveLabel: NextMoveLabel;
  firstIncident: IncidentItem;
}): QueueDecisionConfidence {
  const signalConfidence = getSignalConfidenceLabel(args.firstIncident);

  if (args.nextMoveLabel === "WATCH" || signalConfidence !== "SIGNAL READY") {
    return "LOW CONFIDENCE";
  }

  if (
    args.nextMoveLabel === "OPEN DETAIL" ||
    args.nextMoveLabel === "REVIEW RESOLUTION" ||
    args.level === "MEDIUM RISK"
  ) {
    return "MEDIUM CONFIDENCE";
  }

  if (
    args.level !== "LOW RISK" &&
    (args.nextMoveLabel === "OPEN COMMAND" ||
      args.nextMoveLabel === "OPEN FLOW" ||
      args.nextMoveLabel === "OPEN EVENT")
  ) {
    return "HIGH CONFIDENCE";
  }

  return "MEDIUM CONFIDENCE";
}

function getQueueDecisionConfidenceSummary(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") {
    return "Décision fiable : la surface cible est claire et le risque justifie l’action.";
  }

  if (confidence === "MEDIUM CONFIDENCE") {
    return "Décision prudente : le contexte doit rester visible avant action forte.";
  }

  return "Décision à surveiller : le signal reste insuffisant ou non actionnable.";
}


function getQueueFinalActionLabel(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") return "Action validée";
  if (confidence === "MEDIUM CONFIDENCE") return "Action prudente";

  return "Action à surveiller";
}

function getQueueFinalPrimaryAction(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") return "Exécuter maintenant";
  if (confidence === "MEDIUM CONFIDENCE") return "Ouvrir et vérifier";

  return "Surveiller avant action";
}


type QueueCompletionState =
  | "ACTIVE QUEUE"
  | "LAST INCIDENT"
  | "WATCH COMPLETION";

function getQueueCompletionState(args: {
  count: number;
  level: QueueRiskLevel;
}): QueueCompletionState {
  if (args.count > 1) return "ACTIVE QUEUE";

  if (args.level === "LOW RISK") return "WATCH COMPLETION";

  return "LAST INCIDENT";
}

function getQueueCompletionSummary(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") {
    return "La file contient encore plusieurs incidents à traiter.";
  }

  if (state === "LAST INCIDENT") {
    return "Dernier incident actif de cette file : traiter puis revenir aux files globales.";
  }

  return "Dernier incident en surveillance : vérifier puis revenir aux files globales.";
}

function getQueueCompletionCtaLabel(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") return "Continuer cette file";
  if (state === "LAST INCIDENT") return "Traiter le dernier incident";

  return "Vérifier puis clôturer la file";
}


function getQueueNextStepRouteLabel(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") return "Route : continuer la file active";
  if (state === "LAST INCIDENT") return "Route : traiter puis revenir All queues";

  return "Route : vérifier puis revenir All queues";
}

function getQueueNextStepRouteSummary(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") {
    return "Traite le premier incident, puis reviens à cette file pour poursuivre les incidents restants.";
  }

  if (state === "LAST INCIDENT") {
    return "Traite le dernier incident actif, puis retourne aux files globales.";
  }

  return "Vérifie le dernier incident en surveillance, puis retourne aux files globales.";
}

function getQueueNextStepPrimaryCta(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") return "Ouvrir puis continuer la file";
  if (state === "LAST INCIDENT") return "Ouvrir puis revenir All queues";

  return "Vérifier puis revenir All queues";
}

function getQueueNextStepSecondaryCta(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") return "Retour file active";

  return "Retour All queues";
}

function getPluralLabel(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

function getOperatorSummaryText(args: {
  visibleCount: number;
  activeCount: number;
  escalatedCount: number;
  resolvedCount: number;
  actionReadinessStats: {
    ready: number;
    needsContext: number;
    watchOnly: number;
  };
  nextMoveStats: {
    command: number;
    flow: number;
    event: number;
    detail: number;
    review: number;
    watch: number;
  };
}): string {
  const {
    visibleCount,
    activeCount,
    escalatedCount,
    resolvedCount,
    actionReadinessStats,
    nextMoveStats,
  } = args;

  if (visibleCount === 0) return "Aucun incident visible sur ce scope.";

  if (escalatedCount > 0) {
    return `${getPluralLabel(
      visibleCount,
      "incident visible",
      "incidents visibles",
    )} · ${getPluralLabel(
      escalatedCount,
      "escaladé",
      "escaladés",
    )} · ${getPluralLabel(
      actionReadinessStats.ready,
      "actionnable",
      "actionnables",
    )} · ${nextMoveStats.command} à ouvrir côté Command`;
  }

  if (actionReadinessStats.needsContext > 0) {
    return `${getPluralLabel(
      visibleCount,
      "incident visible",
      "incidents visibles",
    )} · ${getPluralLabel(
      actionReadinessStats.ready,
      "actionnable",
      "actionnables",
    )} · ${Math.max(
      nextMoveStats.detail,
      actionReadinessStats.needsContext,
    )} à compléter côté Detail`;
  }

  if (activeCount > 0) {
    return `${getPluralLabel(
      visibleCount,
      "incident visible",
      "incidents visibles",
    )} · ${getPluralLabel(activeCount, "actif", "actifs")} · ${getPluralLabel(
      actionReadinessStats.ready,
      "actionnable",
      "actionnables",
    )} · ${nextMoveStats.command} à ouvrir côté Command`;
  }

  return `${getPluralLabel(
    visibleCount,
    "incident visible",
    "incidents visibles",
  )} · ${getPluralLabel(resolvedCount, "résolu", "résolus")} · pilotage stable`;
}

function getOperatorSummaryTone(args: {
  escalatedCount: number;
  activeCount: number;
  needsContext: number;
  visibleCount: number;
}): SignalTone {
  if (args.visibleCount === 0) return "default";
  if (args.escalatedCount > 0) return "warning";
  if (args.needsContext > 0) return "warning";
  if (args.activeCount > 0) return "info";
  return "success";
}

function getOperatorSummaryBadgeLabel(args: {
  escalatedCount: number;
  activeCount: number;
  needsContext: number;
  visibleCount: number;
}): OperatorSummaryBadgeLabel {
  if (args.visibleCount === 0) return "QUIET SURFACE";
  if (args.escalatedCount > 0) return "ESCALATION FOCUS";
  if (args.needsContext > 0) return "CONTEXT NEEDED";
  if (args.activeCount > 0) return "ACTION FOCUS";
  return "OPERATOR READY";
}

function getOperatorSummaryBadgeKind(
  label: OperatorSummaryBadgeLabel,
): DashboardStatusKind {
  if (label === "OPERATOR READY") return "success";
  if (label === "ACTION FOCUS") return "running";
  if (label === "CONTEXT NEEDED") return "retry";
  if (label === "ESCALATION FOCUS") return "retry";
  return "unknown";
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

function getInvestigationFocusLabel(incident: IncidentItem): string {
  const nextAction = getNextAction(incident).trim();
  if (nextAction) return nextAction;

  const decision = getDecisionStatus(incident).trim();
  if (decision) return `Decision ${normalizeDisplayText(decision)}`;

  const reason = getReason(incident).trim();
  if (reason && reason !== "—") return normalizeDisplayText(reason);

  return getSuggestedAction(incident);
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
    return { key: "flow", label: getRouteActionLabel("flow"), href: flowHref };
  }

  if (routeKey === "event" && eventHref) {
    return { key: "event", label: getRouteActionLabel("event"), href: eventHref };
  }

  return { key: "detail", label: getRouteActionLabel("detail"), href: detailHref };
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
    <article className="rounded-[20px] sm:rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
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

      <div className="mt-3.5 sm:mt-5">
        {disabled ? (
          <span
            className={
              actionLinkClassName("soft") + " opacity-60 pointer-events-none"
            }
          >
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

function OperatorQueueBucketCard({
  bucket,
  incidents,
  activeWorkspaceId,
  focusHref,
}: {
  bucket: OperatorQueueBucket;
  incidents: IncidentItem[];
  activeWorkspaceId?: string;
  focusHref: string;
}) {
  const bucketItems = getOperatorQueueBucketItems({
    incidents,
    bucket,
    activeWorkspaceId,
  });

  const visibleItems = bucketItems.slice(0, 3);
  const overflowLabel = getOperatorQueueBucketLimitLabel(bucketItems.length, 3);
  const bucketReason = getOperatorQueueBucketReason(bucket);

  return (
    <article className="rounded-[20px] sm:rounded-[24px] border border-white/10 bg-black/20 px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={metaLabelClassName()}>{bucket}</div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">
            {getPluralLabel(bucketItems.length, "incident", "incidents")}
          </div>
        </div>

        <DashboardStatusBadge
          kind={getOperatorQueueBucketBadgeKind(bucket)}
          label={bucket}
        />
      </div>

      <div className="mt-4 text-sm leading-6 text-zinc-300">{bucketReason}</div>

      <div className="mt-4">
        <Link href={focusHref} className={actionLinkClassName("soft")}>
          {getOperatorQueueBucketFocusCtaLabel(bucket)}
        </Link>
      </div>

      {visibleItems.length > 0 ? (
        <div className="mt-3.5 sm:mt-5 space-y-3">
          {visibleItems.map((incident) => {
            const itemHref = getOperatorQueueItemHref(incident, activeWorkspaceId);
            const commandHref = getCommandHref(incident, activeWorkspaceId);
            const flowHref = getFlowHref(incident, activeWorkspaceId);
            const eventHref = getEventHref(incident, activeWorkspaceId);

            const nextMoveLabel = getIncidentNextMoveLabel({
              incident,
              commandHref,
              flowHref,
              eventHref,
            });

            return (
              <div
                key={incident.id}
                className="rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3.5"
              >
                <Link
                  href={itemHref}
                  className="block text-sm font-medium leading-6 text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
                >
                  {getIncidentDisplayTitle(incident)}
                </Link>

                <div className="mt-2 text-xs leading-5 text-zinc-500">
                  {getIncidentStatusLabel(incident)} ·{" "}
                  {getIncidentSeverityDisplayLabel(incident)} ·{" "}
                  {getWorkspaceDisplay(incident)}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DashboardStatusBadge
                    kind={getNextMoveBadgeKind(nextMoveLabel)}
                    label={nextMoveLabel}
                  />

                  <Link
                    href={itemHref}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Ouvrir
                  </Link>
                </div>
              </div>
            );
          })}

          {overflowLabel ? (
            <div className="rounded-[16px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
              {overflowLabel}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4 text-sm leading-6 text-zinc-500">
          Aucun incident dans cette file.
        </div>
      )}
    </article>
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
  const signalGapReasons = getSignalGapReasons(incident);
  const signalConfidenceLabel = getSignalConfidenceLabel(incident);
  const visibleSignalGapReasons = signalGapReasons.slice(0, 3);
  const remainingSignalGapCount = Math.max(signalGapReasons.length - 3, 0);
  const hasSignalGap = signalConfidenceLabel !== "SIGNAL READY";
  const actionReadinessLabel = getIncidentActionReadinessLabel(incident);
  const actionReadinessReason = getIncidentActionReadinessReason(incident);

  const nextMoveLabel = getIncidentNextMoveLabel({
    incident,
    commandHref,
    flowHref,
    eventHref,
  });
  const nextMoveReason = getIncidentNextMoveReason(nextMoveLabel);
  const nextMoveHref = getIncidentNextMoveHref({
    label: nextMoveLabel,
    detailHref,
    commandHref,
    flowHref,
    eventHref,
  });

  const triagePriorityLabel = getIncidentTriagePriorityLabel({
    incident,
    nextMoveLabel,
    actionReadinessLabel,
  });
  const triagePriorityReason =
    getIncidentTriagePriorityReason(triagePriorityLabel);

  const operatorQueueBucket = getIncidentOperatorQueueBucket({
    triagePriorityLabel,
  });
  const operatorQueueReason = getOperatorQueueBucketReason(operatorQueueBucket);

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
      <div className="flex h-full flex-col gap-3.5 md:p-4 xl:p-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            BOSAI Incident
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
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
              className="block break-words [overflow-wrap:anywhere] text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
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

              <DashboardStatusBadge
                kind={getActionReadinessBadgeKind(actionReadinessLabel)}
                label={actionReadinessLabel}
              />

              <DashboardStatusBadge
                kind={getNextMoveBadgeKind(nextMoveLabel)}
                label={nextMoveLabel}
              />

              <DashboardStatusBadge
                kind={getTriagePriorityBadgeKind(triagePriorityLabel)}
                label={triagePriorityLabel}
              />

              <DashboardStatusBadge
                kind={getOperatorQueueBucketBadgeKind(operatorQueueBucket)}
                label={operatorQueueBucket}
              />

              {getDecisionStatus(incident) ? (
                <DashboardStatusBadge
                  kind={getDecisionBadgeKind(incident)}
                  label={`DECISION ${decisionStatus}`}
                />
              ) : null}
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getSignalConfidenceClassName(signalConfidenceLabel),
                  ].join(" ")}
                >
                  {signalConfidenceLabel}
                </span>

                {signalGapReasons.length > 0 ? (
                  <span className="text-[11px] text-zinc-500">
                    {signalGapReasons.length} signal
                    {signalGapReasons.length > 1 ? "s" : ""} à compléter
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-300/80">
                    Signal exploitable
                  </span>
                )}
              </div>

              {visibleSignalGapReasons.length > 0 ? (
                <ul className="mt-3 space-y-1 text-[11px] leading-5 text-zinc-400">
                  {visibleSignalGapReasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-500"
                        aria-hidden="true"
                      />
                      <span>{reason}</span>
                    </li>
                  ))}

                  {remainingSignalGapCount > 0 ? (
                    <li className="pl-3 text-zinc-500">
                      +{remainingSignalGapCount} autres signaux manquants
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className={metaLabelClassName()}>Action readiness</div>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getActionReadinessClassName(actionReadinessLabel),
                  ].join(" ")}
                >
                  {actionReadinessLabel}
                </span>
              </div>

              <div className="mt-3 text-xs leading-5 text-zinc-400">
                {actionReadinessReason}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className={metaLabelClassName()}>Next move</div>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getNextMoveClassName(nextMoveLabel),
                  ].join(" ")}
                >
                  {nextMoveLabel}
                </span>
              </div>

              <div className="mt-3 text-xs leading-5 text-zinc-400">
                {nextMoveReason}
              </div>

              {nextMoveHref ? (
                <div className="mt-4">
                  <Link href={nextMoveHref} className={actionLinkClassName("soft")}>
                    Ouvrir maintenant
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className={metaLabelClassName()}>Triage priority</div>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getTriagePriorityClassName(triagePriorityLabel),
                  ].join(" ")}
                >
                  {triagePriorityLabel}
                </span>
              </div>

              <div className="mt-3 text-xs leading-5 text-zinc-400">
                {triagePriorityReason}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className={metaLabelClassName()}>Operator queue</div>
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    getOperatorQueueBucketClassName(operatorQueueBucket),
                  ].join(" ")}
                >
                  {operatorQueueBucket}
                </span>
              </div>

              <div className="mt-3 text-xs leading-5 text-zinc-400">
                {operatorQueueReason}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-300" aria-hidden="true" />
            <div className={metaLabelClassName()}>Investigation Layer</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            <InvestigationField label="Category" value={getCategoryDisplay(incident)} />
            <InvestigationField
              label="Reason"
              value={getReasonDisplay(incident)}
              breakAll
            />
            <InvestigationField label="Suggested action" value={suggestedAction} />
            <InvestigationField
              label="Decision"
              value={decisionStatus}
              valueClassName={
                getDecisionStatus(incident) ? "text-purple-300" : "text-zinc-400"
              }
            />
            <InvestigationField label="Decision reason" value={decisionReason} />
            <InvestigationField label="Next action" value={nextAction} />
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
            <div className={metaLabelClassName()}>Control Layer</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
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
              label="Action readiness"
              value={actionReadinessLabel}
              valueClassName={
                actionReadinessLabel === "ACTION READY"
                  ? "text-emerald-300"
                  : actionReadinessLabel === "NEEDS CONTEXT"
                    ? "text-amber-300"
                    : "text-zinc-300"
              }
            />
            <InvestigationField
              label="Next move"
              value={nextMoveLabel}
              valueClassName={
                nextMoveLabel === "OPEN COMMAND"
                  ? "text-emerald-300"
                  : nextMoveLabel === "OPEN DETAIL"
                    ? "text-amber-300"
                    : "text-sky-300"
              }
            />
            <InvestigationField
              label="Triage priority"
              value={triagePriorityLabel}
              valueClassName={
                triagePriorityLabel === "DO NOW"
                  ? "text-rose-300"
                  : triagePriorityLabel === "DO NEXT"
                    ? "text-sky-300"
                    : triagePriorityLabel === "NEEDS CONTEXT"
                      ? "text-amber-300"
                      : "text-zinc-300"
              }
            />
            <InvestigationField
              label="Operator queue"
              value={operatorQueueBucket}
              valueClassName={
                operatorQueueBucket === "NOW QUEUE"
                  ? "text-rose-300"
                  : operatorQueueBucket === "NEXT QUEUE"
                    ? "text-sky-300"
                    : operatorQueueBucket === "CONTEXT QUEUE"
                      ? "text-amber-300"
                      : "text-zinc-300"
              }
            />
            <InvestigationField label="Control note" value={routeLock.controlNote} />
          </div>
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
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

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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

          <MetaItem
            label="Root event"
            value={toText(rootEventId, "No root event")}
            breakAll
          />
          <MetaItem
            label="Run record"
            value={toText(runRecord, "No run record")}
            breakAll
          />

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
            value={
              formatDate(getResolvedAt(incident)) === "—"
                ? "Not resolved yet"
                : formatDate(getResolvedAt(incident))
            }
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

  const queueFilter = getOperatorQueueFilterFromSearchParam(
    resolvedSearchParams.queue,
  );
  const hasActiveQueueFilter = queueFilter !== "all";
  const queueFilterLabel = getOperatorQueueFilterLabel(queueFilter);

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

  const queueFocusedIncidents = hasActiveQueueFilter
    ? sortVisibleIncidentsForFocus(
        visibleIncidents.filter((incident) =>
          incidentMatchesOperatorQueueFilter({
            incident,
            filter: queueFilter,
            activeWorkspaceId,
          }),
        ),
      )
    : activeIncidents;

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
      getIncidentStatusNormalized(item) === "escalated" ||
      getSlaLabel(item) === "BREACHED",
  );

  const signalGapIncidents = visibleIncidents.filter((item) =>
    isSignalGapIncident(item),
  );

  const signalReadyCount = Math.max(
    0,
    visibleIncidents.length - signalGapIncidents.length,
  );

  const signalQualityStats = getSignalQualityStats(visibleIncidents);
  const actionReadinessStats = getActionReadinessStats(visibleIncidents);
  const nextMoveStats = getNextMoveStats(visibleIncidents, activeWorkspaceId);
  const triagePriorityStats = getTriagePriorityStats(
    visibleIncidents,
    activeWorkspaceId,
  );
  const operatorQueueStats = getOperatorQueueStats(
    visibleIncidents,
    activeWorkspaceId,
  );
  const operatorQueueSummaryText = getOperatorQueueSummaryText({
    queueStats: operatorQueueStats,
  });

  const operatorSummaryText = getOperatorSummaryText({
    visibleCount: visibleIncidents.length,
    activeCount: activeIncidents.length,
    escalatedCount: escalatedIncidents.length,
    resolvedCount: resolvedIncidents.length,
    actionReadinessStats,
    nextMoveStats,
  });

  const operatorSummaryTone = getOperatorSummaryTone({
    escalatedCount: escalatedIncidents.length,
    activeCount: activeIncidents.length,
    needsContext: actionReadinessStats.needsContext,
    visibleCount: visibleIncidents.length,
  });

  const operatorSummaryBadgeLabel = getOperatorSummaryBadgeLabel({
    escalatedCount: escalatedIncidents.length,
    activeCount: activeIncidents.length,
    needsContext: actionReadinessStats.needsContext,
    visibleCount: visibleIncidents.length,
  });

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

  const queueFocusLinks: {
    filter: OperatorQueueFilter;
    label: string;
    count: number;
    href: string;
  }[] = [
    {
      filter: "all",
      label: "All",
      count: visibleIncidents.length,
      href: getOperatorQueueFilterHref({
        filter: "all",
        activeWorkspaceId,
        flowId,
        rootEventId,
        sourceRecordId,
        commandId,
      }),
    },
    {
      filter: "now",
      label: "Now",
      count: operatorQueueStats.now,
      href: getOperatorQueueFilterHref({
        filter: "now",
        activeWorkspaceId,
        flowId,
        rootEventId,
        sourceRecordId,
        commandId,
      }),
    },
    {
      filter: "next",
      label: "Next",
      count: operatorQueueStats.next,
      href: getOperatorQueueFilterHref({
        filter: "next",
        activeWorkspaceId,
        flowId,
        rootEventId,
        sourceRecordId,
        commandId,
      }),
    },
    {
      filter: "context",
      label: "Context",
      count: operatorQueueStats.context,
      href: getOperatorQueueFilterHref({
        filter: "context",
        activeWorkspaceId,
        flowId,
        rootEventId,
        sourceRecordId,
        commandId,
      }),
    },
    {
      filter: "watch",
      label: "Watch",
      count: operatorQueueStats.watch,
      href: getOperatorQueueFilterHref({
        filter: "watch",
        activeWorkspaceId,
        flowId,
        rootEventId,
        sourceRecordId,
        commandId,
      }),
    },
  ];

  const allQueuesHref = queueFocusLinks[0]?.href || allIncidentsHref;

  const queueFocusedFirstIncidentHref = getQueueFocusedFirstIncidentHref({
    incidents: queueFocusedIncidents,
    activeWorkspaceId,
  });

  const queueRiskStats = getQueueRiskStats(queueFocusedIncidents);
  const queueRiskLevel = getQueueRiskLevel(
    queueFocusedIncidents,
    activeWorkspaceId,
  );


  const queueFocusedFirstIncident = queueFocusedIncidents[0] || null;

  const queueFocusedFirstIncidentCommandHref = queueFocusedFirstIncident
    ? getCommandHref(queueFocusedFirstIncident, activeWorkspaceId)
    : "";

  const queueFocusedFirstIncidentFlowHref = queueFocusedFirstIncident
    ? getFlowHref(queueFocusedFirstIncident, activeWorkspaceId)
    : "";

  const queueFocusedFirstIncidentEventHref = queueFocusedFirstIncident
    ? getEventHref(queueFocusedFirstIncident, activeWorkspaceId)
    : "";

  const queueFocusedFirstIncidentNextMoveLabel = queueFocusedFirstIncident
    ? getIncidentNextMoveLabel({
        incident: queueFocusedFirstIncident,
        commandHref: queueFocusedFirstIncidentCommandHref,
        flowHref: queueFocusedFirstIncidentFlowHref,
        eventHref: queueFocusedFirstIncidentEventHref,
      })
    : null;

  const queueFocusedFirstIncidentNextMoveReason =
    queueFocusedFirstIncidentNextMoveLabel
      ? getIncidentNextMoveReason(queueFocusedFirstIncidentNextMoveLabel)
      : "";

  const operatorQueuePreviousFilter =
    getOperatorQueuePreviousFilter(queueFilter);
  const operatorQueueNextFilter =
    getOperatorQueueNextFilter(queueFilter);

  const operatorQueuePreviousHref = getOperatorQueueFilterHref({
    filter: operatorQueuePreviousFilter,
    activeWorkspaceId,
    flowId,
    rootEventId,
    sourceRecordId,
    commandId,
  });

  const operatorQueueNextHref = getOperatorQueueFilterHref({
    filter: operatorQueueNextFilter,
    activeWorkspaceId,
    flowId,
    rootEventId,
    sourceRecordId,
    commandId,
  });

  const focusIncident = sortVisibleIncidentsForFocus(visibleIncidents)[0] || null;

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

  const focusNextMoveLabel = focusIncident
    ? getIncidentNextMoveLabel({
        incident: focusIncident,
        commandHref: focusIncidentCommandHref,
        flowHref: focusIncidentFlowHref,
        eventHref: focusIncidentEventHref,
      })
    : null;

  const focusNextMoveHref =
    focusIncident && focusNextMoveLabel
      ? getIncidentNextMoveHref({
          label: focusNextMoveLabel,
          detailHref: focusIncidentDetailHref,
          commandHref: focusIncidentCommandHref,
          flowHref: focusIncidentFlowHref,
          eventHref: focusIncidentEventHref,
        })
      : "";

  const focusActionReadinessLabel = focusIncident
    ? getIncidentActionReadinessLabel(focusIncident)
    : null;

  const focusTriagePriorityLabel =
    focusIncident && focusNextMoveLabel && focusActionReadinessLabel
      ? getIncidentTriagePriorityLabel({
          incident: focusIncident,
          nextMoveLabel: focusNextMoveLabel,
          actionReadinessLabel: focusActionReadinessLabel,
        })
      : null;

  const focusOperatorQueueBucket = focusTriagePriorityLabel
    ? getIncidentOperatorQueueBucket({
        triagePriorityLabel: focusTriagePriorityLabel,
      })
    : null;

  const focusOperatorQueueReason = focusOperatorQueueBucket
    ? getOperatorQueueBucketReason(focusOperatorQueueBucket)
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

  const focusPrimaryInvestigationAction = focusRouteLock?.primaryAction || null;

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
    focusNextMoveHref,
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
      state: focusPrimaryControlAction
        ? "available"
        : visibleIncidents.length > 0
          ? "partial"
          : "unavailable",
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

              <div
                className={`${metaBoxClassName()} ${signalRingClassName(
                  operatorSummaryTone,
                )}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${signalDotClassName(
                      operatorSummaryTone,
                    )}`}
                    aria-hidden="true"
                  />
                  <div className={metaLabelClassName()}>Operator summary</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <DashboardStatusBadge
                    kind={getOperatorSummaryBadgeKind(operatorSummaryBadgeLabel)}
                    label={operatorSummaryBadgeLabel}
                  />
                </div>

                <div className="mt-3 text-sm leading-6 text-white/70">
                  {operatorSummaryText}
                </div>

                <div className="mt-3 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3">
                  <div className={metaLabelClassName()}>Operator queue</div>
                  <div className="mt-2 text-sm font-medium leading-6 text-zinc-200">
                    Now {operatorQueueStats.now} · Next {operatorQueueStats.next} · Context{" "}
                    {operatorQueueStats.context} · Watch {operatorQueueStats.watch}
                  </div>
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
                  {getSignalConfidenceLabel(focusIncident) !== "SIGNAL READY" ? (
                    <DashboardStatusBadge
                      kind="unknown"
                      label={getSignalConfidenceLabel(focusIncident)}
                    />
                  ) : null}
                  <DashboardStatusBadge
                    kind={getActionReadinessBadgeKind(
                      getIncidentActionReadinessLabel(focusIncident),
                    )}
                    label={getIncidentActionReadinessLabel(focusIncident)}
                  />
                  {focusNextMoveLabel ? (
                    <DashboardStatusBadge
                      kind={getNextMoveBadgeKind(focusNextMoveLabel)}
                      label={focusNextMoveLabel}
                    />
                  ) : null}
                  {focusTriagePriorityLabel ? (
                    <DashboardStatusBadge
                      kind={getTriagePriorityBadgeKind(focusTriagePriorityLabel)}
                      label={focusTriagePriorityLabel}
                    />
                  ) : null}
                  {focusOperatorQueueBucket ? (
                    <DashboardStatusBadge
                      kind={getOperatorQueueBucketBadgeKind(focusOperatorQueueBucket)}
                      label={focusOperatorQueueBucket}
                    />
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
                    label="Action readiness"
                    value={getIncidentActionReadinessLabel(focusIncident)}
                    valueClassName={
                      getIncidentActionReadinessLabel(focusIncident) ===
                      "ACTION READY"
                        ? "text-emerald-300"
                        : getIncidentActionReadinessLabel(focusIncident) ===
                            "NEEDS CONTEXT"
                          ? "text-amber-300"
                          : "text-zinc-300"
                    }
                  />
                  {focusNextMoveLabel ? (
                    <InvestigationField
                      label="Next move"
                      value={focusNextMoveLabel}
                      valueClassName={
                        focusNextMoveLabel === "OPEN COMMAND"
                          ? "text-emerald-300"
                          : focusNextMoveLabel === "OPEN DETAIL"
                            ? "text-amber-300"
                            : "text-sky-300"
                      }
                    />
                  ) : null}
                  {focusTriagePriorityLabel ? (
                    <InvestigationField
                      label="Triage priority"
                      value={focusTriagePriorityLabel}
                      valueClassName={
                        focusTriagePriorityLabel === "DO NOW"
                          ? "text-rose-300"
                          : focusTriagePriorityLabel === "DO NEXT"
                            ? "text-sky-300"
                            : focusTriagePriorityLabel === "NEEDS CONTEXT"
                              ? "text-amber-300"
                              : "text-zinc-300"
                      }
                    />
                  ) : null}
                  {focusOperatorQueueBucket ? (
                    <InvestigationField
                      label="Operator queue"
                      value={focusOperatorQueueBucket}
                      valueClassName={
                        focusOperatorQueueBucket === "NOW QUEUE"
                          ? "text-rose-300"
                          : focusOperatorQueueBucket === "NEXT QUEUE"
                            ? "text-sky-300"
                            : focusOperatorQueueBucket === "CONTEXT QUEUE"
                              ? "text-amber-300"
                              : "text-zinc-300"
                      }
                    />
                  ) : null}
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

                {focusNextMoveLabel ? (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                    <div className={metaLabelClassName()}>Next move note</div>
                    <div className="mt-2 text-sm leading-6 text-zinc-300">
                      {getIncidentNextMoveReason(focusNextMoveLabel)}
                    </div>
                  </div>
                ) : null}

                {focusTriagePriorityLabel ? (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                    <div className={metaLabelClassName()}>Triage priority note</div>
                    <div className="mt-2 text-sm leading-6 text-zinc-300">
                      {getIncidentTriagePriorityReason(focusTriagePriorityLabel)}
                    </div>
                  </div>
                ) : null}

                {focusOperatorQueueBucket ? (
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                    <div className={metaLabelClassName()}>Operator queue note</div>
                    <div className="mt-2 text-sm leading-6 text-zinc-300">
                      {focusOperatorQueueReason}
                    </div>
                  </div>
                ) : null}

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

                  {focusNextMoveHref &&
                  focusNextMoveHref !== focusRouteLock.primaryAction.href ? (
                    <Link
                      href={focusNextMoveHref}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir Next Move
                    </Link>
                  ) : null}

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
                  <span className={chipClassName()}>command_id: {commandId}</span>
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

      {!fetchFailed ? (
        <div id="incident-list-operator-summary">
          <SectionCard
            title="Operator Summary"
            description="Synthèse opérateur de la surface Incidents en une phrase, sans modifier les compteurs validés."
            action={
              <DashboardStatusBadge
                kind={getOperatorSummaryBadgeKind(operatorSummaryBadgeLabel)}
                label={operatorSummaryBadgeLabel}
              />
            }
          >
            <div
              className={`${metaBoxClassName()} ${signalRingClassName(
                operatorSummaryTone,
              )}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${signalDotClassName(
                    operatorSummaryTone,
                  )}`}
                  aria-hidden="true"
                />
                <div className={metaLabelClassName()}>Situation globale</div>
              </div>

              <div
                className={`mt-3 text-base font-medium leading-7 ${toneTextClassName(
                  operatorSummaryTone,
                )}`}
              >
                {operatorSummaryText}
              </div>

              <div className="mt-2 text-xs leading-5 text-zinc-500">
                Lecture complémentaire. Les compteurs validés restent inchangés.
              </div>

              <div className="mt-3 text-xs leading-5 text-zinc-400">
                Priorité triage : {triagePriorityStats.doNow} maintenant ·{" "}
                {triagePriorityStats.doNext} ensuite ·{" "}
                {triagePriorityStats.needsContext} contexte ·{" "}
                {triagePriorityStats.watch} watch
              </div>

              <div className="mt-3 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-3 sm:px-4 py-3">
                <div className={metaLabelClassName()}>Operator Queue</div>
                <div className="mt-2 text-sm font-medium leading-6 text-zinc-200">
                  Now {operatorQueueStats.now} · Next {operatorQueueStats.next} · Context{" "}
                  {operatorQueueStats.context} · Watch {operatorQueueStats.watch}
                </div>
              </div>

              <div className="mt-3 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3">
                <div className={metaLabelClassName()}>Queue Focus</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {queueFocusLinks.map((item) => (
                    <Link
                      key={item.filter}
                      href={item.href}
                      className={queueFocusLinkClassName(
                        queueFilter === item.filter,
                      )}
                      aria-current={
                        queueFilter === item.filter ? "page" : undefined
                      }
                    >
                      {item.label} {item.count}
                    </Link>
                  ))}
                </div>

                <div className="mt-3 text-xs leading-5 text-zinc-500">
                  {hasActiveQueueFilter
                    ? `Focus actif : ${queueFilterLabel}. Needs Attention affiche uniquement cette file.`
                    : "Toutes les files restent visibles. Les sections globales ne sont pas modifiées."}
                </div>
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

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Latest open</div>
                  <div className="mt-2 text-zinc-100">
                    {formatDate(
                      latestOpenIncident
                        ? getUpdatedAt(latestOpenIncident) ||
                            getOpenedAt(latestOpenIncident)
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
                    {getSignalConfidenceLabel(focusIncident) !== "SIGNAL READY" ? (
                      <DashboardStatusBadge
                        kind="unknown"
                        label={getSignalConfidenceLabel(focusIncident)}
                      />
                    ) : null}
                    <DashboardStatusBadge
                      kind={getActionReadinessBadgeKind(
                        getIncidentActionReadinessLabel(focusIncident),
                      )}
                      label={getIncidentActionReadinessLabel(focusIncident)}
                    />
                    {focusNextMoveLabel ? (
                      <DashboardStatusBadge
                        kind={getNextMoveBadgeKind(focusNextMoveLabel)}
                        label={focusNextMoveLabel}
                      />
                    ) : null}
                    {focusTriagePriorityLabel ? (
                      <DashboardStatusBadge
                        kind={getTriagePriorityBadgeKind(focusTriagePriorityLabel)}
                        label={focusTriagePriorityLabel}
                      />
                    ) : null}
                    {focusOperatorQueueBucket ? (
                      <DashboardStatusBadge
                        kind={getOperatorQueueBucketBadgeKind(focusOperatorQueueBucket)}
                        label={focusOperatorQueueBucket}
                      />
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
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

                  <div className="mt-3.5 sm:mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
                    <Link
                      href={focusRouteLock.primaryAction.href}
                      className={actionLinkClassName("primary")}
                    >
                      {focusRouteLock.primaryAction.label}
                    </Link>

                    {focusNextMoveHref &&
                    focusNextMoveHref !== focusRouteLock.primaryAction.href ? (
                      <Link
                        href={focusNextMoveHref}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir Next Move
                      </Link>
                    ) : null}

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
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-2 xl:grid-cols-4">
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

              <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Signal Quality Polish</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  Lecture complémentaire uniquement. Les compteurs validés restent inchangés.
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className="rounded-[18px] border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-emerald-300">
                      {signalQualityStats.ready}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Ready
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-sky-300">
                      {signalQualityStats.partial}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Partial
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-amber-400/15 bg-amber-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-amber-300">
                      {signalQualityStats.low}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Low
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Action Readiness</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  Lecture complémentaire : indique si les incidents visibles sont actionnables maintenant.
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div className="rounded-[18px] border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-emerald-300">
                      {actionReadinessStats.ready}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Ready
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-amber-400/15 bg-amber-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-amber-300">
                      {actionReadinessStats.needsContext}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Context
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-zinc-300">
                      {actionReadinessStats.watchOnly}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Watch
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Next Moves</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  Lecture complémentaire : indique la meilleure surface à ouvrir maintenant.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-[18px] border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-emerald-300">
                      {nextMoveStats.command}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Command
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-sky-300">
                      {nextMoveStats.flow}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Flow
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-cyan-300">
                      {nextMoveStats.event}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Event
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-amber-400/15 bg-amber-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-amber-300">
                      {nextMoveStats.detail}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Detail
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-emerald-400/10 bg-emerald-400/[0.03] px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-emerald-200">
                      {nextMoveStats.review}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Review
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-zinc-300">
                      {nextMoveStats.watch}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Watch
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Triage Priority</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  Lecture complémentaire : indique l’ordre opérationnel de traitement.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[18px] border border-rose-400/15 bg-rose-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-rose-300">
                      {triagePriorityStats.doNow}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Now
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-sky-300">
                      {triagePriorityStats.doNext}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Next
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-amber-400/15 bg-amber-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-amber-300">
                      {triagePriorityStats.needsContext}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Context
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-zinc-300">
                      {triagePriorityStats.watch}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Watch
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Operator Queue</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  Lecture complémentaire : file de travail immédiate dérivée de Triage Priority.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[18px] border border-rose-400/15 bg-rose-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-rose-300">
                      {operatorQueueStats.now}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Now
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-sky-300">
                      {operatorQueueStats.next}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Next
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-amber-400/15 bg-amber-400/5 px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-amber-300">
                      {operatorQueueStats.context}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Context
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-3">
                    <div className="text-2xl font-semibold tracking-tight text-zinc-300">
                      {operatorQueueStats.watch}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                      Watch
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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

                <InvestigationField
                  label="Action readiness"
                  value={`${actionReadinessStats.ready} ready · ${actionReadinessStats.needsContext} context · ${actionReadinessStats.watchOnly} watch`}
                />

                <InvestigationField
                  label="Next move"
                  value={`${nextMoveStats.command} command · ${nextMoveStats.flow} flow · ${nextMoveStats.detail} detail · ${nextMoveStats.watch} watch`}
                />

                <InvestigationField
                  label="Triage priority"
                  value={`${triagePriorityStats.doNow} now · ${triagePriorityStats.doNext} next · ${triagePriorityStats.needsContext} context · ${triagePriorityStats.watch} watch`}
                />

                <InvestigationField
                  label="Operator queue"
                  value={operatorQueueSummaryText}
                />

                <InvestigationField
                  label="Operator summary"
                  value={operatorSummaryText}
                  valueClassName={toneTextClassName(operatorSummaryTone)}
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
                    <DashboardStatusBadge
                      kind={getActionReadinessBadgeKind(
                        getIncidentActionReadinessLabel(focusIncident),
                      )}
                      label={getIncidentActionReadinessLabel(focusIncident)}
                    />
                    {focusNextMoveLabel ? (
                      <DashboardStatusBadge
                        kind={getNextMoveBadgeKind(focusNextMoveLabel)}
                        label={focusNextMoveLabel}
                      />
                    ) : null}
                    {focusTriagePriorityLabel ? (
                      <DashboardStatusBadge
                        kind={getTriagePriorityBadgeKind(focusTriagePriorityLabel)}
                        label={focusTriagePriorityLabel}
                      />
                    ) : null}
                    {focusOperatorQueueBucket ? (
                      <DashboardStatusBadge
                        kind={getOperatorQueueBucketBadgeKind(focusOperatorQueueBucket)}
                        label={focusOperatorQueueBucket}
                      />
                    ) : null}
                    {focusPrimaryControlAction ? (
                      <DashboardStatusBadge kind="success" label="CONTROL READY" />
                    ) : (
                      <DashboardStatusBadge kind="unknown" label="CONTROL LIMITED" />
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-2 xl:grid-cols-4">
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
                      label="Action readiness"
                      value={`${actionReadinessStats.ready} ready · ${actionReadinessStats.needsContext} context · ${actionReadinessStats.watchOnly} watch`}
                      valueClassName="text-emerald-300"
                    />
                    <InvestigationField
                      label="Next move"
                      value={`${nextMoveStats.command} command · ${nextMoveStats.flow} flow · ${nextMoveStats.detail} detail · ${nextMoveStats.watch} watch`}
                      valueClassName="text-sky-300"
                    />
                    <InvestigationField
                      label="Triage priority"
                      value={`${triagePriorityStats.doNow} now · ${triagePriorityStats.doNext} next · ${triagePriorityStats.needsContext} context · ${triagePriorityStats.watch} watch`}
                      valueClassName="text-rose-300"
                    />
                    <InvestigationField
                      label="Operator queue"
                      value={operatorQueueSummaryText}
                      valueClassName="text-zinc-200"
                    />
                    <InvestigationField
                      label="Control note"
                      value={focusRouteLock.controlNote}
                    />
                  </div>

                  <div className="mt-3.5 sm:mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Link
                      href={focusRouteLock.primaryAction.href}
                      className={actionLinkClassName("primary")}
                    >
                      {focusRouteLock.primaryAction.label}
                    </Link>

                    {focusNextMoveHref &&
                    focusNextMoveHref !== focusRouteLock.primaryAction.href ? (
                      <Link
                        href={focusNextMoveHref}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir Next Move
                      </Link>
                    ) : null}

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

          <div id="incident-list-operator-queue-action-board">
            <SectionCard
              title="Operator Queue Action Board"
              description="File opérateur construite depuis Triage Priority et Operator Queue, sans remplacer Needs Attention."
              action={<SectionCountPill value={visibleIncidents.length} tone="info" />}
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {OPERATOR_QUEUE_BUCKET_ORDER.map((bucket) => (
                  <OperatorQueueBucketCard
                    key={bucket}
                    bucket={bucket}
                    incidents={visibleIncidents}
                    activeWorkspaceId={activeWorkspaceId}
                    focusHref={getOperatorQueueFilterHref({
                      filter: getOperatorQueueFilterFromBucket(bucket),
                      activeWorkspaceId,
                      flowId,
                      rootEventId,
                      sourceRecordId,
                      commandId,
                    })}
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          <div id="incident-list-needs-attention">
            <SectionBlock
              title={
                hasActiveQueueFilter
                  ? `Needs Attention — Queue Focus: ${queueFilterLabel}`
                  : "Needs Attention"
              }
              description={
                hasActiveQueueFilter
                  ? `Affiche uniquement les incidents ${queueFilterLabel} sur le scope actuel. Les compteurs globaux restent inchangés.`
                  : "Incidents à surveiller en priorité : ouverts, escaladés, critiques ou encore non résolus."
              }
              count={queueFocusedIncidents.length}
              countTone="warning"
              tone="attention"
            >
              {queueFocusedIncidents.length === 0 ? (
                hasActiveQueueFilter ? (
                  <div className="space-y-4">
                    <EmptyStatePanel
                      title="Aucun incident dans cette file"
                      description="La file sélectionnée ne contient aucun incident visible sur le scope actuel."
                    />

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Link href={allQueuesHref} className={actionLinkClassName("primary")}>
                        All queues
                      </Link>

                      <Link href={allIncidentsHref} className={actionLinkClassName("soft")}>
                        Voir tous les incidents
                      </Link>
                    </div>
                  </div>
                ) : (
                  <EmptyStatePanel
                    title="Aucun incident actif"
                    description="Aucun incident ouvert ou escaladé n’est visible pour le moment."
                  />
                )
              ) : (
                <div className="space-y-5">
                  {hasActiveQueueFilter ? (
                    <div
                      className={`${metaBoxClassName()} ${signalRingClassName(
                        queueFilter === "now"
                          ? "danger"
                          : queueFilter === "next"
                            ? "info"
                            : queueFilter === "context"
                              ? "warning"
                              : "default",
                      )}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className={metaLabelClassName()}>Queue Action</div>
                          <div className="mt-2 text-lg font-semibold tracking-tight text-white">
                            {queueFilterLabel}
                          </div>
                        </div>

                        <DashboardStatusBadge
                          kind={
                            queueFilter === "now"
                              ? "failed"
                              : queueFilter === "next"
                                ? "running"
                                : queueFilter === "context"
                                  ? "retry"
                                  : "unknown"
                          }
                          label={queueFilterLabel}
                        />
                      </div>

                      <div className="mt-4 text-sm leading-6 text-zinc-300">
                        {getPluralLabel(
                          queueFocusedIncidents.length,
                          "incident dans cette file",
                          "incidents dans cette file",
                        )}
                      </div>

                      <div className="mt-2 text-sm leading-6 text-zinc-400">
                        {getOperatorQueueFilterHelpText(queueFilter)}
                      </div>

                      <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                        <div className={metaLabelClassName()}>Operator Progress</div>

                        <div className="mt-3 grid gap-3 md:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Position
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              Premier incident prêt
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Reste à traiter
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getOperatorQueueRemainingLabel(queueFocusedIncidents.length)}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              File active
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getOperatorQueueProgressLabel(queueFilter)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                        <div className={metaLabelClassName()}>Queue Navigation</div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Position cycle
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getOperatorQueuePositionLabel(queueFilter)}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Navigation locale
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              Changer de file sans remonter.
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                          <Link
                            href={operatorQueuePreviousHref}
                            className={actionLinkClassName("soft")}
                          >
                            File précédente
                          </Link>

                          <Link
                            href={operatorQueueNextHref}
                            className={actionLinkClassName("soft")}
                          >
                            File suivante
                          </Link>

                          <Link href={allQueuesHref} className={actionLinkClassName("soft")}>
                            All queues
                          </Link>
                        </div>
                      </div>

                      {queueFocusedFirstIncident &&
                      queueFocusedFirstIncidentNextMoveLabel ? (
                        <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                          <div className={metaLabelClassName()}>
                            First Incident Brief
                          </div>

                          <div className="mt-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Incident
                            </div>
                            <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                              {getIncidentDisplayTitle(queueFocusedFirstIncident)}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-zinc-500">
                              {getIncidentStatusLabel(queueFocusedFirstIncident)} ·{" "}
                              {getIncidentSeverityDisplayLabel(
                                queueFocusedFirstIncident,
                              )} · {getWorkspaceDisplay(queueFocusedFirstIncident)}
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Next surface
                              </div>
                              <div className="mt-2">
                                <DashboardStatusBadge
                                  kind={getNextMoveBadgeKind(
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  )}
                                  label={queueFocusedFirstIncidentNextMoveLabel}
                                />
                              </div>
                            </div>

                            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Pourquoi l’ouvrir
                              </div>
                              <div className="mt-2 text-sm leading-6 text-zinc-300">
                                {queueFocusedFirstIncidentNextMoveReason}
                              </div>
                            </div>
                          </div>

                          {queueFocusedFirstIncidentHref ? (
                            <div className="mt-4">
                              <Link
                                href={queueFocusedFirstIncidentHref}
                                className={actionLinkClassName("soft")}
                              >
                                Ouvrir ce premier incident
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      ) : null}


                      <div
                        className={`${metaBoxClassName()} mt-3.5 sm:mt-5 ${signalRingClassName(
                          queueRiskLevel === "HIGH RISK"
                            ? "danger"
                            : queueRiskLevel === "MEDIUM RISK"
                              ? "warning"
                              : "success",
                        )}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className={metaLabelClassName()}>
                              Queue Risk Signal
                            </div>

                            <div className="mt-2 text-base font-semibold tracking-tight text-white">
                              {queueRiskLevel}
                            </div>
                          </div>

                          <DashboardStatusBadge
                            kind={
                              queueRiskLevel === "HIGH RISK"
                                ? "failed"
                                : queueRiskLevel === "MEDIUM RISK"
                                  ? "retry"
                                  : "success"
                            }
                            label={queueRiskLevel}
                          />
                        </div>

                        <div className="mt-3 text-sm leading-6 text-zinc-300">
                          {getQueueRiskSummary(queueRiskLevel)}
                        </div>

                        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                          <div className={metaLabelClassName()}>
                            Compteurs locaux
                          </div>

                          <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                            {queueRiskStats.escalated} escalated ·{" "}
                            {queueRiskStats.highCritical} high/critical ·{" "}
                            {queueRiskStats.slaRisk} SLA risk ·{" "}
                            {queueRiskStats.needsContext} context
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const queueRecommendedRiskLevel = getQueueRiskLevel(
                          queueFocusedIncidents,
                          activeWorkspaceId,
                        );

                        const queueRecommendedFirstIncident =
                          getQueueFocusedFirstIncident(queueFocusedIncidents);

                        if (!queueRecommendedFirstIncident) return null;

                        const queueRecommendedCommandHref = getCommandHref(
                          queueRecommendedFirstIncident,
                          activeWorkspaceId,
                        );

                        const queueRecommendedFlowHref = getFlowHref(
                          queueRecommendedFirstIncident,
                          activeWorkspaceId,
                        );

                        const queueRecommendedEventHref = getEventHref(
                          queueRecommendedFirstIncident,
                          activeWorkspaceId,
                        );

                        const queueRecommendedNextMoveLabel = getIncidentNextMoveLabel({
                          incident: queueRecommendedFirstIncident,
                          commandHref: queueRecommendedCommandHref,
                          flowHref: queueRecommendedFlowHref,
                          eventHref: queueRecommendedEventHref,
                        });

                        return (
                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className={metaLabelClassName()}>
                                  Queue Recommended Action
                                </div>

                                <div className="mt-2 text-lg font-semibold tracking-tight text-white">
                                  {getQueueRecommendedActionLabel(
                                    queueRecommendedRiskLevel,
                                  )}
                                </div>
                              </div>

                              <DashboardStatusBadge
                                kind={
                                  queueRecommendedRiskLevel === "HIGH RISK"
                                    ? "failed"
                                    : queueRecommendedRiskLevel === "MEDIUM RISK"
                                      ? "retry"
                                      : "success"
                                }
                                label={queueRecommendedRiskLevel}
                              />
                            </div>

                            <div className="mt-4 text-sm leading-6 text-zinc-300">
                              {getQueueRecommendedActionReason(
                                queueRecommendedRiskLevel,
                              )}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Surface conseillée
                                </div>

                                <div className="mt-2">
                                  <DashboardStatusBadge
                                    kind={getNextMoveBadgeKind(
                                      queueRecommendedNextMoveLabel,
                                    )}
                                    label={queueRecommendedNextMoveLabel}
                                  />
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Action immédiate
                                </div>

                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  Ouvrir la surface recommandée
                                </div>
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-3.5 sm:mt-5">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Appliquer la recommandation
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}

                      <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                        <div className={metaLabelClassName()}>
                          Queue Execution Checklist
                        </div>

                        <div className="mt-4 space-y-3">
                          {getQueueExecutionChecklist(queueRiskLevel).map(
                            (step) => (
                              <div
                                key={step}
                                className="flex gap-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3"
                              >
                                <span
                                  className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-emerald-300"
                                  aria-hidden="true"
                                />
                                <span className="text-sm font-medium leading-6 text-zinc-100">
                                  {step}
                                </span>
                              </div>
                            ),
                          )}
                        </div>

                        <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                          <div className={metaLabelClassName()}>
                            Note d’exécution
                          </div>
                          <div className="mt-2 text-sm leading-6 text-zinc-300">
                            {getQueueExecutionNote(queueRiskLevel)}
                          </div>
                        </div>
                      </div>

                      {queueFocusedFirstIncident &&
                      queueFocusedFirstIncidentNextMoveLabel ? (
                        <>
                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Outcome Preview
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              {getQueueOutcomeTitle(queueRiskLevel)}
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueOutcomeSummary(queueRiskLevel)}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Prochaine étape
                                </div>
                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  {getQueueOutcomeNextStep(queueRiskLevel)}
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Surface de retour
                                </div>
                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  {queueFilterLabel}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <Link
                                href={getOperatorQueueFilterHref({
                                  filter: queueFilter,
                                  activeWorkspaceId,
                                  flowId,
                                  rootEventId,
                                  sourceRecordId,
                                  commandId,
                                })}
                                className={actionLinkClassName("soft")}
                              >
                                Revenir à la file active
                              </Link>
                            </div>
                          </div>

                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Operator Decision
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              {getQueueOperatorDecisionLabel(queueRiskLevel)}
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueOperatorDecisionReason(queueRiskLevel)}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Décision suivante
                                </div>
                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  {getQueueOperatorDecisionNextStep(queueRiskLevel)}
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Surface cible
                                </div>
                                <div className="mt-2">
                                  <DashboardStatusBadge
                                    kind={getNextMoveBadgeKind(
                                      queueFocusedFirstIncidentNextMoveLabel,
                                    )}
                                    label={queueFocusedFirstIncidentNextMoveLabel}
                                  />
                                </div>
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Exécuter la décision
                                </Link>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Decision Confidence
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <DashboardStatusBadge
                                kind={
                                  getQueueDecisionConfidence({
                                    level: queueRiskLevel,
                                    nextMoveLabel:
                                      queueFocusedFirstIncidentNextMoveLabel,
                                    firstIncident: queueFocusedFirstIncident,
                                  }) === "HIGH CONFIDENCE"
                                    ? "success"
                                    : getQueueDecisionConfidence({
                                          level: queueRiskLevel,
                                          nextMoveLabel:
                                            queueFocusedFirstIncidentNextMoveLabel,
                                          firstIncident: queueFocusedFirstIncident,
                                        }) === "MEDIUM CONFIDENCE"
                                      ? "retry"
                                      : "unknown"
                                }
                                label={getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}
                              />
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueDecisionConfidenceSummary(
                                getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Signaux locaux
                              </div>
                              <div className="mt-2 text-sm font-medium text-zinc-100">
                                {queueFocusedFirstIncidentNextMoveLabel} ·{" "}
                                {queueRiskLevel} ·{" "}
                                {getSignalConfidenceLabel(queueFocusedFirstIncident)}
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Ouvrir avec cette décision
                                </Link>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Final Action Bar
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              {getQueueFinalActionLabel(
                                getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Résumé décision
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                {getQueueOperatorDecisionLabel(queueRiskLevel)} ·{" "}
                                {getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}{" "}
                                · {queueFocusedFirstIncidentNextMoveLabel}
                              </div>
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Action principale
                              </div>
                              <div className="mt-2 text-sm font-medium text-zinc-100">
                                {getQueueFinalPrimaryAction(
                                  getQueueDecisionConfidence({
                                    level: queueRiskLevel,
                                    nextMoveLabel:
                                      queueFocusedFirstIncidentNextMoveLabel,
                                    firstIncident: queueFocusedFirstIncident,
                                  }),
                                )}
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Lancer l’action principale
                                </Link>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Completion State
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <DashboardStatusBadge
                                kind={
                                  getQueueCompletionState({
                                    count: queueFocusedIncidents.length,
                                    level: queueRiskLevel,
                                  }) === "ACTIVE QUEUE"
                                    ? "running"
                                    : getQueueCompletionState({
                                          count: queueFocusedIncidents.length,
                                          level: queueRiskLevel,
                                        }) === "LAST INCIDENT"
                                      ? "retry"
                                      : "unknown"
                                }
                                label={getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                })}
                              />
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueCompletionSummary(
                                getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Compteurs locaux
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                {getPluralLabel(
                                  queueFocusedIncidents.length,
                                  "incident",
                                  "incidents",
                                )}{" "}
                                · {Math.max(queueFocusedIncidents.length - 1, 0)}{" "}
                                restants · {queueRiskLevel} ·{" "}
                                {getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  {getQueueCompletionCtaLabel(
                                    getQueueCompletionState({
                                      count: queueFocusedIncidents.length,
                                      level: queueRiskLevel,
                                    }),
                                  )}
                                </Link>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-3.5 sm:mt-5 rounded-[18px] border border-sky-400/20 bg-sky-400/[0.04] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Next Step Router
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              {getQueueNextStepRouteLabel(
                                getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                }),
                              )}
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueNextStepRouteSummary(
                                getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Surface immédiate
                              </div>
                              <div className="mt-2">
                                <DashboardStatusBadge
                                  kind="success"
                                  label={queueFocusedFirstIncidentNextMoveLabel}
                                />
                              </div>
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Retour conseillé
                              </div>
                              <div className="mt-2 text-sm font-medium text-zinc-100">
                                {getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                }) === "ACTIVE QUEUE"
                                  ? getOperatorQueuePositionLabel(queueFilter)
                                  : "All queues"}
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {/* V2.31-visible-footer */}
                          <div className="mt-4 sm:mt-6 rounded-[20px] sm:rounded-[24px] border border-sky-400/20 bg-gradient-to-br from-sky-400/[0.08] via-white/[0.035] to-emerald-400/[0.06] px-4 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.025)]">
                            {/* V2.33-final-visual-balance */}
                            {/* V2.34-mobile-compact-pass */}
                            <div className="mb-3 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent sm:mb-4" />
                            <div className={metaLabelClassName()}>
                              Queue Operator Summary Footer
                            </div>

                            <div className="mt-2 max-w-[34rem] text-lg font-semibold leading-tight tracking-tight text-white sm:mt-3 sm:text-xl">
                              Synthèse opérateur de la file active
                            </div>

                            <div className="mt-4 grid gap-3 sm:mt-3.5 sm:mt-5 sm:grid-cols-2 sm:gap-4">
                              <div className="rounded-[16px] border border-white/10 bg-black/25 px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  File active
                                </div>
                                <div className="mt-1.5 text-sm font-medium text-zinc-100 sm:mt-2">
                                  {getOperatorQueuePositionLabel(queueFilter)}
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/25 px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Route suivante
                                </div>
                                <div className="mt-2 text-sm font-medium leading-6 text-zinc-100 sm:leading-6">
                                  {getQueueNextStepRouteLabel(
                                    getQueueCompletionState({
                                      count: queueFocusedIncidents.length,
                                      level: queueRiskLevel,
                                    }),
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.045] px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Signaux synthèse
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100 sm:leading-6">
                                {queueRiskLevel} ·{" "}
                                {getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}{" "}
                                · {queueFocusedFirstIncidentNextMoveLabel}
                              </div>
                            </div>

                            <div className="mt-3 rounded-[16px] border border-white/10 bg-black/25 px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Action immédiate
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-zinc-100 sm:mt-2">
                                {getQueueNextStepPrimaryCta(
                                  getQueueCompletionState({
                                    count: queueFocusedIncidents.length,
                                    level: queueRiskLevel,
                                  }),
                                )}
                              </div>
                            </div>

                            <div className="mt-3 rounded-[16px] border border-sky-400/10 bg-sky-400/[0.035] px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Action consolidée
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100 sm:leading-6">
                                L’action principale reste disponible dans le routeur opérateur.
                              </div>
                            </div>
                          </div>

                          {queueFocusedFirstIncidentHref ? (
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  {getQueueNextStepPrimaryCta(
                                    getQueueCompletionState({
                                      count: queueFocusedIncidents.length,
                                      level: queueRiskLevel,
                                    }),
                                  )}
                                </Link>
                              ) : null}

                              <Link
                                href={
                                  getQueueCompletionState({
                                    count: queueFocusedIncidents.length,
                                    level: queueRiskLevel,
                                  }) === "ACTIVE QUEUE"
                                    ? getOperatorQueueFilterHref({
                                      filter: queueFilter,
                                      activeWorkspaceId,
                                      flowId,
                                      rootEventId,
                                      sourceRecordId,
                                      commandId,
                                    })
                                    : getOperatorQueueFilterHref({
                                      filter: "all",
                                      activeWorkspaceId,
                                      flowId,
                                      rootEventId,
                                      sourceRecordId,
                                      commandId,
                                    })
                                }
                                className={actionLinkClassName("default")}
                              >
                                {getQueueNextStepSecondaryCta(
                                  getQueueCompletionState({
                                    count: queueFocusedIncidents.length,
                                    level: queueRiskLevel,
                                  }),
                                )}
                              </Link>
                            </div>
                          </div>
                        </>
                      ) : null}

                      <div className="mt-3.5 sm:mt-5 grid gap-3 sm:grid-cols-2">
                        {/* V2.32-dedup-polish: CTA final doublon supprimé. Action conservée dans Queue Next Step Router. */}

                        <Link href={allQueuesHref} className={actionLinkClassName("soft")}>
                          Retour All queues
                        </Link>
                      </div>

                          {/* V2.37-incidents-transition */}
                          <div className="my-6 rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-sky-400/[0.035] to-transparent px-4 py-4 sm:my-8 sm:rounded-[26px] sm:px-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                              {/* V2.38-layout-repair-anchor */}
Incident Stream
                            </div>
                            <div className="mt-2 text-sm leading-6 text-zinc-300">
                              Liste opérationnelle alignée avec la file active et les signaux de triage.
                            </div>
                          </div>

                    </div>
                  ) : null}

                  <div className="grid gap-3.5 md:p-4 xl:p-5 xl:grid-cols-2 xl:gap-3.5 md:p-4 xl:p-5">
                    {queueFocusedIncidents.map((incident) => (
                      <IncidentListCard
                        key={incident.id}
                        incident={incident}
                        activeWorkspaceId={activeWorkspaceId}
                      />
                    ))}
                  </div>
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
                <div className="grid gap-3.5 md:p-4 xl:p-5 xl:grid-cols-2 xl:gap-3.5 md:p-4 xl:p-5">
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
