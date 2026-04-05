import Link from "next/link";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type SearchParamsInput = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParamsInput> | SearchParamsInput;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
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
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function getSearchParam(
  searchParams: SearchParamsInput,
  key: string
): string {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return (value[0] || "").trim();
  }

  return (value || "").trim();
}

function normalizeMatchValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getIncidentTitle(incident: IncidentItem) {
  return incident.title || incident.name || incident.error_id || "Untitled incident";
}

function getIncidentStatusRaw(incident: IncidentItem) {
  return (incident.status || incident.statut_incident || "").trim();
}

function getIncidentSeverityRaw(incident: IncidentItem) {
  return (incident.severity || "").trim();
}

function getIncidentStatusNormalized(incident: IncidentItem) {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = (incident.sla_status || "").trim().toLowerCase();
  const hasResolvedAt = Boolean(incident.resolved_at);

  if (hasResolvedAt) {
    return "resolved";
  }

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
    if ((incident.sla_status || "").toLowerCase() === "breached") return "critical";
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
  return toText(incident.decision_status, "");
}

function getDecisionReason(incident: IncidentItem) {
  return toText(incident.decision_reason, "");
}

function getNextAction(incident: IncidentItem) {
  return toText(incident.next_action, "");
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
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) {
    return "RESOLVED";
  }

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

function getSlaTone(incident: IncidentItem) {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  const sla = (incident.sla_status || "").toLowerCase();

  if (sla === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (sla === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (sla === "ok") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (sla === "open") {
    return "bg-zinc-800 text-zinc-300 border border-zinc-700";
  }

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getOpenedAt(incident: IncidentItem) {
  return incident.opened_at || incident.created_at;
}

function getUpdatedAt(incident: IncidentItem) {
  return incident.updated_at || incident.created_at;
}

function getResolvedAt(incident: IncidentItem) {
  if (incident.resolved_at) {
    return incident.resolved_at;
  }

  if (getIncidentStatusNormalized(incident) === "resolved") {
    return incident.updated_at || incident.created_at;
  }

  return undefined;
}

function getWorkspace(incident: IncidentItem) {
  return incident.workspace_id || incident.workspace || "—";
}

function getRunRecord(incident: IncidentItem) {
  return incident.run_record_id || incident.linked_run || incident.run_id || "—";
}

function getCommandRecord(incident: IncidentItem) {
  return incident.command_id || incident.linked_command || "—";
}

function getFlowId(incident: IncidentItem) {
  return (incident.flow_id || "").trim();
}

function getRootEventId(incident: IncidentItem) {
  return (incident.root_event_id || "").trim();
}

function getCategory(incident: IncidentItem) {
  return incident.category || "—";
}

function getReason(incident: IncidentItem) {
  return incident.reason || "—";
}

function getSuggestedAction(incident: IncidentItem) {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated") return "Review escalated incident";
  if (severity === "critical") return "Prioritize immediate review";
  if ((incident.sla_status || "").toLowerCase() === "breached") return "Review SLA breach";
  if (status === "resolved") return "Verify final resolution state";

  return "Monitor flow and resolution";
}

function isLegacyNoiseIncident(incident: IncidentItem) {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = getCategory(incident).trim().toLowerCase();
  const reason = getReason(incident).trim().toLowerCase();
  const errorId = (incident.error_id || "").trim();
  const resolutionNote = (incident.resolution_note || "").trim();
  const lastAction = (incident.last_action || "").trim();

  const isGenericTitle =
    title === "incident" || title === "untitled incident";

  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";

  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const isPurePlaceholder =
    isGenericTitle && isGenericCategory && isGenericReason;

  if (isPurePlaceholder) {
    return true;
  }

  const hasStrongBusinessSignal =
    errorId !== "" ||
    resolutionNote !== "" ||
    lastAction !== "" ||
    category === "http_failure" ||
    reason === "http_5xx_exhausted" ||
    reason === "http_status_error" ||
    reason === "forbidden_host";

  return !hasStrongBusinessSignal && isGenericCategory && isGenericReason;
}

type NormalizedIncident = {
  raw: IncidentItem;
  id: string;
  title: string;
  status: string;
  statusLabel: string;
  severity: string;
  severityLabel: string;
  slaLabel: string;
  decisionStatus: string;
  decisionReason: string;
  nextAction: string;
  priorityScore: number;
  openedAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
  workspace: string;
  runRecord: string;
  commandRecord: string;
  flowId: string;
  rootEventId: string;
  category: string;
  reason: string;
  suggestedAction: string;
  sortDate: number;
};

function normalizeIncident(incident: IncidentItem): NormalizedIncident {
  const openedAt = getOpenedAt(incident);
  const updatedAt = getUpdatedAt(incident);
  const resolvedAt = getResolvedAt(incident);

  return {
    raw: incident,
    id: incident.id,
    title: getIncidentTitle(incident),
    status: getIncidentStatusNormalized(incident),
    statusLabel: getIncidentStatusLabel(incident),
    severity: getIncidentSeverityNormalized(incident),
    severityLabel: getIncidentSeverityLabel(incident),
    slaLabel: getSlaLabel(incident),
    decisionStatus: getDecisionStatus(incident),
    decisionReason: getDecisionReason(incident),
    nextAction: getNextAction(incident),
    priorityScore: getPriorityScore(incident),
    openedAt,
    updatedAt,
    resolvedAt,
    workspace: getWorkspace(incident),
    runRecord: getRunRecord(incident),
    commandRecord: getCommandRecord(incident),
    flowId: getFlowId(incident),
    rootEventId: getRootEventId(incident),
    category: getCategory(incident),
    reason: getReason(incident),
    suggestedAction: getSuggestedAction(incident),
    sortDate: new Date(resolvedAt || updatedAt || openedAt || 0).getTime(),
  };
}

function getIncidentMatchCandidates(incident: NormalizedIncident) {
  return uniqueStrings([
    normalizeMatchValue(incident.id),
    normalizeMatchValue(incident.flowId),
    normalizeMatchValue(incident.rootEventId),
    normalizeMatchValue(incident.runRecord),
    normalizeMatchValue(incident.commandRecord),
    normalizeMatchValue(incident.raw.linked_run),
    normalizeMatchValue(incident.raw.linked_command),
    normalizeMatchValue(incident.raw.run_id),
    normalizeMatchValue(incident.raw.command_id),
  ]);
}

function matchesAnyIncidentFilter(
  incident: NormalizedIncident,
  filterValues: string[]
) {
  if (filterValues.length === 0) return true;

  const candidates = getIncidentMatchCandidates(incident);
  return filterValues.some((value) => candidates.includes(value));
}

function FilterBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
      {label}: {value}
    </span>
  );
}

function IncidentCard({ incident }: { incident: NormalizedIncident }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          BOSAI INCIDENT
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/incidents/${encodeURIComponent(incident.id)}`}
            className="break-all text-lg font-semibold text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
          >
            {incident.title}
          </Link>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
              incident.raw
            )}`}
          >
            {incident.statusLabel}
          </span>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(
              incident.raw
            )}`}
          >
            {incident.severityLabel}
          </span>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSlaTone(
              incident.raw
            )}`}
          >
            SLA {incident.slaLabel}
          </span>

          {incident.decisionStatus ? (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getDecisionTone(
                incident.raw
              )}`}
            >
              DECISION {incident.decisionStatus.toUpperCase()}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
          <span>
            Category: <span className="text-zinc-300">{incident.category}</span>
          </span>
          <span>
            Reason: <span className="text-zinc-300">{incident.reason}</span>
          </span>
          <span>
            Workspace: <span className="text-zinc-300">{incident.workspace}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
        <div>
          Opened: <span className="text-zinc-300">{formatDate(incident.openedAt)}</span>
        </div>

        <div>
          Updated: <span className="text-zinc-300">{formatDate(incident.updatedAt)}</span>
        </div>

        <div>
          Resolved: <span className="text-zinc-300">{formatDate(incident.resolvedAt)}</span>
        </div>

        <div className="break-all">
          Flow:{" "}
          {incident.flowId ? (
            <Link
              href={`/flows/${encodeURIComponent(incident.flowId)}`}
              className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
            >
              {incident.flowId}
            </Link>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </div>

        <div className="break-all">
          Root event: <span className="text-zinc-300">{toText(incident.rootEventId)}</span>
        </div>

        <div className="break-all">
          Run record: <span className="text-zinc-300">{toText(incident.runRecord)}</span>
        </div>

        <div className="break-all">
          Command:{" "}
          {incident.commandRecord !== "—" && incident.commandRecord ? (
            <Link
              href={`/commands/${encodeURIComponent(incident.commandRecord)}`}
              className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
            >
              {incident.commandRecord}
            </Link>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </div>

        <div className="md:col-span-2 xl:col-span-3">
          Action suggested: <span className="text-zinc-300">{incident.suggestedAction}</span>
        </div>

        <div className="space-y-1 border-t border-white/10 pt-3 md:col-span-2 xl:col-span-3">
          <div>
            Decision: <span className="text-purple-300">{incident.decisionStatus || "—"}</span>
          </div>
          <div>
            Decision reason: <span className="text-zinc-300">{incident.decisionReason || "—"}</span>
          </div>
          <div>
            Next action: <span className="text-zinc-300">{incident.nextAction || "—"}</span>
          </div>
          <div>
            Priority score: <span className="text-zinc-300">{incident.priorityScore}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});

  const flowIdFilter = getSearchParam(resolvedSearchParams, "flow_id");
  const rootEventIdFilter = getSearchParam(resolvedSearchParams, "root_event_id");
  const sourceRecordIdFilter = getSearchParam(resolvedSearchParams, "source_record_id");
  const fromFilter = getSearchParam(resolvedSearchParams, "from");

  const activeFilterValues = uniqueStrings(
    [flowIdFilter, rootEventIdFilter, sourceRecordIdFilter].map(normalizeMatchValue)
  );

  const hasFlowFilters = activeFilterValues.length > 0;
  const filteredFromFlows = fromFilter === "flows";

  let data: IncidentsResponse | null = null;

  try {
    data = await fetchIncidents();
  } catch {
    data = null;
  }

  const incidents: IncidentItem[] = Array.isArray(data?.incidents) ? data.incidents : [];

  const normalized = incidents
    .map(normalizeIncident)
    .sort((a, b) => b.sortDate - a.sortDate);

  const cleanNormalized = normalized.filter(
    (item) => !isLegacyNoiseIncident(item.raw)
  );

  const visibleIncidents = cleanNormalized.filter((item) =>
    matchesAnyIncidentFilter(item, activeFilterValues)
  );

  const openIncidents = visibleIncidents.filter((item) => item.status === "open");
  const escalatedIncidents = visibleIncidents.filter((item) => item.status === "escalated");
  const resolvedIncidents = visibleIncidents.filter((item) => item.status === "resolved");
  const criticalIncidents = visibleIncidents.filter((item) => item.severity === "critical");

  const activeIncidents = [...openIncidents, ...escalatedIncidents].sort(
    (a, b) => b.sortDate - a.sortDate
  );

  const sortedResolvedIncidents = [...resolvedIncidents].sort(
    (a, b) => b.sortDate - a.sortDate
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Incidents
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue orientée impact métier. Cette page permet de voir les incidents
          ouverts, escaladés et résolus, ainsi que leur lien avec les flows BOSAI.
        </p>
      </div>

      {hasFlowFilters ? (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="text-sm font-medium text-emerald-200">
                {filteredFromFlows ? "Filtré depuis Flows" : "Filtres actifs"}
              </div>

              <div className="flex flex-wrap gap-2">
                {flowIdFilter ? (
                  <FilterBadge label="flow_id" value={flowIdFilter} />
                ) : null}

                {rootEventIdFilter ? (
                  <FilterBadge label="root_event_id" value={rootEventIdFilter} />
                ) : null}

                {sourceRecordIdFilter ? (
                  <FilterBadge
                    label="source_record_id"
                    value={sourceRecordIdFilter}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {filteredFromFlows ? (
                <Link
                  href="/flows"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Retour aux flows
                </Link>
              ) : null}

              <Link
                href="/incidents"
                className="inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
              >
                Voir tous les incidents
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Open incidents</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">
            {openIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Escalated</div>
          <div className="mt-3 text-4xl font-semibold text-amber-300">
            {escalatedIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Resolved</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">
            {resolvedIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Critical</div>
          <div className="mt-3 text-4xl font-semibold text-red-300">
            {criticalIncidents.length}
          </div>
        </div>
      </section>

      {visibleIncidents.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500">
          {hasFlowFilters
            ? "Aucun incident ne correspond à ce flow pour le moment."
            : "Aucun incident visible pour le moment."}
        </section>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Active incidents</h2>
              <span className="text-sm text-zinc-400">{activeIncidents.length}</span>
            </div>

            {activeIncidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
                Aucun incident actif.
              </div>
            ) : (
              <div className="space-y-4">
                {activeIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Resolved incidents</h2>
              <span className="text-sm text-zinc-400">{sortedResolvedIncidents.length}</span>
            </div>

            {sortedResolvedIncidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
                Aucun incident résolu.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedResolvedIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
