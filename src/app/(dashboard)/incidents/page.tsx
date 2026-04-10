import Link from "next/link";
import type { ReactNode } from "react";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type SearchParams = {
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_record_id?: string | string[];
  from?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function emptyStateClassName() {
  return "rounded-[28px] border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function toText(value: unknown, fallback = "—") {
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

function toTextOrEmpty(value: unknown) {
  return toText(value, "");
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function safeUpper(text: string) {
  return text.trim() ? text.trim().toUpperCase() : "—";
}

function getIncidentTitle(incident: IncidentItem) {
  return (
    toTextOrEmpty(incident.title) ||
    toTextOrEmpty(incident.name) ||
    toTextOrEmpty(incident.error_id) ||
    "Untitled incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem) {
  return toTextOrEmpty(incident.status) || toTextOrEmpty(incident.statut_incident);
}

function getIncidentSeverityRaw(incident: IncidentItem) {
  return toTextOrEmpty(incident.severity);
}

function getIncidentStatusNormalized(incident: IncidentItem) {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = toTextOrEmpty(incident.sla_status).toLowerCase();
  const hasResolvedAt = Boolean(toTextOrEmpty(incident.resolved_at));

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

function getIncidentStatusLabel(incident: IncidentItem) {
  const normalized = getIncidentStatusNormalized(incident);

  if (normalized === "open") return "OPEN";
  if (normalized === "escalated") return "ESCALATED";
  if (normalized === "resolved") return "RESOLVED";

  const raw = getIncidentStatusRaw(incident);
  return raw ? raw.toUpperCase() : "OPEN";
}

function getIncidentSeverityNormalized(incident: IncidentItem) {
  const raw = getIncidentSeverityRaw(incident).toLowerCase();

  if (!raw) {
    if (toTextOrEmpty(incident.sla_status).toLowerCase() === "breached") {
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

function getIncidentSeverityLabel(incident: IncidentItem) {
  const normalized = getIncidentSeverityNormalized(incident);

  if (normalized === "critical") return "CRITICAL";
  if (normalized === "high") return "HIGH";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "low") return "LOW";

  const raw = getIncidentSeverityRaw(incident);
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

function statusTone(incident: IncidentItem) {
  const status = getIncidentStatusNormalized(incident);

  if (status === "resolved") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "escalated") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "open") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function severityTone(incident: IncidentItem) {
  const severity = getIncidentSeverityNormalized(incident);

  if (severity === "critical") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (severity === "high") {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (severity === "medium") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (severity === "low") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getDecisionStatus(incident: IncidentItem) {
  return toTextOrEmpty(incident.decision_status);
}

function getDecisionReason(incident: IncidentItem) {
  return toTextOrEmpty(incident.decision_reason);
}

function getNextAction(incident: IncidentItem) {
  return toTextOrEmpty(incident.next_action);
}

function getPriorityScore(incident: IncidentItem) {
  return toNumber(incident.priority_score, 0);
}

function getDecisionTone(incident: IncidentItem) {
  const decision = getDecisionStatus(incident).toLowerCase();

  if (["escalate", "escalated"].includes(decision)) {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (["resolve", "resolved"].includes(decision)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["retry", "retriable"].includes(decision)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (decision) {
    return "bg-purple-500/15 text-purple-300 border border-purple-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getSlaLabel(incident: IncidentItem) {
  const resolvedLike =
    Boolean(toTextOrEmpty(incident.resolved_at)) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "RESOLVED";

  const sla = toTextOrEmpty(incident.sla_status);
  if (sla) return sla.toUpperCase();

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) {
    return "BREACHED";
  }

  return "—";
}

function getSlaTone(incident: IncidentItem) {
  const resolvedLike =
    Boolean(toTextOrEmpty(incident.resolved_at)) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  const sla = toTextOrEmpty(incident.sla_status).toLowerCase();

  if (sla === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (sla === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (sla === "ok") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getOpenedAt(incident: IncidentItem) {
  return toTextOrEmpty(incident.opened_at) || toTextOrEmpty(incident.created_at);
}

function getUpdatedAt(incident: IncidentItem) {
  return toTextOrEmpty(incident.updated_at) || toTextOrEmpty(incident.created_at);
}

function getResolvedAt(incident: IncidentItem) {
  if (toTextOrEmpty(incident.resolved_at)) return toTextOrEmpty(incident.resolved_at);

  if (getIncidentStatusNormalized(incident) === "resolved") {
    return toTextOrEmpty(incident.updated_at) || toTextOrEmpty(incident.created_at);
  }

  return undefined;
}

function getWorkspace(incident: IncidentItem) {
  return (
    toTextOrEmpty(incident.workspace_id) ||
    toTextOrEmpty(incident.workspace) ||
    "—"
  );
}

function getRunRecord(incident: IncidentItem) {
  return (
    toTextOrEmpty(incident.run_record_id) ||
    toTextOrEmpty(incident.linked_run) ||
    toTextOrEmpty(incident.run_id) ||
    "—"
  );
}

function getCommandRecord(incident: IncidentItem) {
  return (
    toTextOrEmpty(incident.command_id) ||
    toTextOrEmpty(incident.linked_command) ||
    "—"
  );
}

function getFlowId(incident: IncidentItem) {
  return toTextOrEmpty(incident.flow_id);
}

function getRootEventId(incident: IncidentItem) {
  return toTextOrEmpty(incident.root_event_id);
}

function getSourceRecordId(incident: IncidentItem) {
  return toTextOrEmpty((incident as Record<string, unknown>).source_record_id);
}

function getCategory(incident: IncidentItem) {
  return toTextOrEmpty(incident.category) || "—";
}

function getReason(incident: IncidentItem) {
  return toTextOrEmpty(incident.reason) || "—";
}

function getSuggestedAction(incident: IncidentItem) {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated") return "Review escalated incident";
  if (severity === "critical") return "Prioritize immediate review";
  if (toTextOrEmpty(incident.sla_status).toLowerCase() === "breached") {
    return "Review SLA breach";
  }
  if (status === "resolved") return "Verify final resolution state";

  return "Monitor flow and resolution";
}

function getSummaryLine(incident: IncidentItem) {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);

  return `${safeUpper(status)} · ${safeUpper(severity)} · ${workspace} · ${category}`;
}

function getActivePriority(incident: IncidentItem) {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated" && severity === "critical") return 0;
  if (status === "escalated") return 1;
  if (severity === "critical") return 2;
  if (severity === "high") return 3;
  if (status === "open") return 4;
  return 5;
}

function getIncidentTimestampForSort(incident: IncidentItem) {
  return new Date(
    getUpdatedAt(incident) || getOpenedAt(incident) || getResolvedAt(incident) || 0
  ).getTime();
}

function sortActiveIncidents(items: IncidentItem[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = getActivePriority(a) - getActivePriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return getIncidentTimestampForSort(b) - getIncidentTimestampForSort(a);
  });
}

function sortResolvedIncidents(items: IncidentItem[]) {
  return [...items].sort((a, b) => {
    const aTs = new Date(
      getResolvedAt(a) || getUpdatedAt(a) || getOpenedAt(a) || 0
    ).getTime();
    const bTs = new Date(
      getResolvedAt(b) || getUpdatedAt(b) || getOpenedAt(b) || 0
    ).getTime();

    return bTs - aTs;
  });
}

function isLegacyNoiseIncident(incident: IncidentItem) {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = getCategory(incident).trim().toLowerCase();
  const reason = getReason(incident).trim().toLowerCase();
  const errorId = toTextOrEmpty(incident.error_id);
  const resolutionNote = toTextOrEmpty(incident.resolution_note);
  const lastAction = toTextOrEmpty(incident.last_action);
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
  }
) {
  const filterValues = [filters.flowId, filters.rootEventId, filters.sourceRecordId]
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

function getBestFlowTargetFromIncident(incident: IncidentItem) {
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
}) {
  return filters.flowId || filters.sourceRecordId || filters.rootEventId || "";
}

function getBackToFlowsHref(filters: {
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
}) {
  const target = getBestFlowTargetFromFilters(filters);
  return target ? `/flows/${encodeURIComponent(target)}` : "/flows";
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

function StatCard({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: IncidentItem }) {
  const title = getIncidentTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const slaLabel = getSlaLabel(incident);
  const decisionStatus = getDecisionStatus(incident);
  const flowTarget = getBestFlowTargetFromIncident(incident);
  const commandRecord = getCommandRecord(incident);
  const rootEventId = getRootEventId(incident);
  const runRecord = getRunRecord(incident);
  const suggestedAction = getSuggestedAction(incident);

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>BOSAI Incident</div>

          <div className="space-y-3">
            <Link
              href={`/incidents/${encodeURIComponent(String(incident.id))}`}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {title}
            </Link>

            <div className="text-sm text-zinc-400">{getSummaryLine(incident)}</div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                  incident
                )}`}
              >
                {statusLabel}
              </span>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(
                  incident
                )}`}
              >
                {severityLabel}
              </span>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSlaTone(
                  incident
                )}`}
              >
                SLA {slaLabel}
              </span>

              {decisionStatus ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getDecisionTone(
                    incident
                  )}`}
                >
                  DECISION {decisionStatus.toUpperCase()}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem label="Opened" value={formatDate(getOpenedAt(incident))} />
          <MetaItem label="Updated" value={formatDate(getUpdatedAt(incident))} />
          <MetaItem label="Resolved" value={formatDate(getResolvedAt(incident))} />

          <MetaItem
            label="Flow"
            value={
              flowTarget ? (
                <Link
                  href={`/flows/${encodeURIComponent(flowTarget)}`}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowTarget}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <MetaItem label="Root event" value={toText(rootEventId)} breakAll />
          <MetaItem label="Run record" value={toText(runRecord)} breakAll />

          <MetaItem
            label="Command"
            value={
              commandRecord !== "—" && commandRecord ? (
                <Link
                  href={`/commands/${encodeURIComponent(commandRecord)}`}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {commandRecord}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Action suggested</div>
            <div className="mt-1 text-zinc-200">{suggestedAction}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-3 space-y-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div>
              <span className={metaLabelClassName()}>Decision</span>
              <div className="mt-1 text-purple-300">{decisionStatus || "—"}</div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Decision reason</span>
              <div className="mt-1 text-zinc-300">
                {getDecisionReason(incident) || "—"}
              </div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Next action</span>
              <div className="mt-1 text-zinc-300">{getNextAction(incident) || "—"}</div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Priority score</span>
              <div className="mt-1 text-zinc-300">{getPriorityScore(incident)}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className={sectionLabelClassName()}>{title}</div>
          <p className="max-w-3xl text-base text-zinc-400">{description}</p>
        </div>

        <div className="text-sm text-zinc-500">{count}</div>
      </div>

      {children}
    </section>
  );
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const flowId = firstParam(resolvedSearchParams.flow_id).trim();
  const rootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const sourceRecordId = firstParam(
    resolvedSearchParams.source_record_id
  ).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  let data: IncidentsResponse | null = null;

  try {
    data = await fetchIncidents();
  } catch {
    data = null;
  }

  const incidents: IncidentItem[] = Array.isArray(data?.incidents)
    ? data.incidents
    : [];

  const cleanNormalized = incidents.filter(
    (item) => !isLegacyNoiseIncident(item)
  );

  const hasFilters = Boolean(flowId || rootEventId || sourceRecordId);

  const visibleIncidents = hasFilters
    ? cleanNormalized.filter((incident) =>
        incidentMatchesFilters(incident, {
          flowId,
          rootEventId,
          sourceRecordId,
        })
      )
    : cleanNormalized;

  const openIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "open"
  );
  const escalatedIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "escalated"
  );
  const resolvedIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "resolved"
  );
  const criticalIncidents = visibleIncidents.filter(
    (item) => getIncidentSeverityNormalized(item) === "critical"
  );

  const activeIncidents = sortActiveIncidents([
    ...openIncidents,
    ...escalatedIncidents,
  ]);

  const sortedResolvedIncidents = sortResolvedIncidents(resolvedIncidents);

  const backToFlowsHref =
    from === "flows" || from === "flow_detail"
      ? getBackToFlowsHref({ flowId, rootEventId, sourceRecordId })
      : "/flows";

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Incidents
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Vue orientée impact métier. Cette page regroupe les incidents ouverts,
            escaladés et résolus, avec navigation vers les flows BOSAI associés.
          </p>
        </div>
      </section>

      {hasFilters ? (
        <section className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 md:p-6">
          <div className="mb-4 text-lg font-medium text-emerald-200">
            Filtré depuis Flows
          </div>

          <div className="flex flex-wrap gap-3">
            {flowId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                flow_id: {flowId}
              </span>
            ) : null}

            {rootEventId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                root_event_id: {rootEventId}
              </span>
            ) : null}

            {sourceRecordId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                source_record_id: {sourceRecordId}
              </span>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
              Retour aux flows
            </Link>

            <Link href="/incidents" className={actionLinkClassName("primary")}>
              Voir tous les incidents
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open incidents" value={openIncidents.length} tone="text-sky-300" />
        <StatCard label="Escalated" value={escalatedIncidents.length} tone="text-amber-300" />
        <StatCard label="Resolved" value={resolvedIncidents.length} tone="text-emerald-300" />
        <StatCard label="Critical" value={criticalIncidents.length} tone="text-red-300" />
      </section>

      {visibleIncidents.length === 0 ? (
        <section className={emptyStateClassName()}>
          Aucun incident visible pour le moment.
        </section>
      ) : (
        <div className="space-y-8">
          <SectionBlock
            title="Needs attention"
            description="Incidents à surveiller en priorité : ouverts, escaladés, critiques ou encore non résolus."
            count={activeIncidents.length}
          >
            {activeIncidents.length === 0 ? (
              <div className={emptyStateClassName()}>Aucun incident actif.</div>
            ) : (
              <div className="space-y-4">
                {activeIncidents.map((incident) => (
                  <IncidentCard key={String(incident.id)} incident={incident} />
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Resolved incidents"
            description="Historique des incidents déjà résolus, triés du plus récent au plus ancien."
            count={sortedResolvedIncidents.length}
          >
            {sortedResolvedIncidents.length === 0 ? (
              <div className={emptyStateClassName()}>
                Aucun incident résolu.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedResolvedIncidents.map((incident) => (
                  <IncidentCard key={String(incident.id)} incident={incident} />
                ))}
              </div>
            )}
          </SectionBlock>
        </div>
      )}
    </div>
  );
}
