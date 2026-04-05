import Link from "next/link";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type PageProps = {
  searchParams?: Promise<{
    flow_id?: string | string[];
    root_event_id?: string | string[];
    source_record_id?: string | string[];
    from?: string | string[];
  }>;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
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

function getIncidentTitle(incident: IncidentItem) {
  return (
    incident.title || incident.name || incident.error_id || "Untitled incident"
  );
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
    if ((incident.sla_status || "").toLowerCase() === "breached")
      return "critical";
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
  return toTextOrEmpty(incident.flow_id);
}

function getRootEventId(incident: IncidentItem) {
  return toTextOrEmpty(incident.root_event_id);
}

function getSourceRecordId(incident: IncidentItem) {
  return toTextOrEmpty((incident as Record<string, unknown>).source_record_id);
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
  if ((incident.sla_status || "").toLowerCase() === "breached")
    return "Review SLA breach";
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
  const incidentFlowId = getFlowId(incident);
  const incidentRootEventId = getRootEventId(incident);
  const incidentSourceRecordId = getSourceRecordId(incident);

  if (filters.flowId && incidentFlowId !== filters.flowId) {
    return false;
  }

  if (filters.rootEventId && incidentRootEventId !== filters.rootEventId) {
    return false;
  }

  if (
    filters.sourceRecordId &&
    incidentSourceRecordId !== filters.sourceRecordId
  ) {
    return false;
  }

  return true;
}

function getBackToFlowsHref(filters: {
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
}) {
  if (filters.flowId) {
    return `/flows/${encodeURIComponent(filters.flowId)}`;
  }

  if (filters.rootEventId) {
    return `/flows/${encodeURIComponent(filters.rootEventId)}`;
  }

  if (filters.sourceRecordId) {
    return `/flows/${encodeURIComponent(filters.sourceRecordId)}`;
  }

  return "/flows";
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: React.ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "break-all" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: IncidentItem }) {
  const title = getIncidentTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const slaLabel = getSlaLabel(incident);
  const decisionStatus = getDecisionStatus(incident);
  const flowId = getFlowId(incident);
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
              href={`/incidents/${encodeURIComponent(incident.id)}`}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {title}
            </Link>

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

          <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
            <span>
              Category: <span className="text-zinc-300">{getCategory(incident)}</span>
            </span>
            <span>
              Reason: <span className="text-zinc-300">{getReason(incident)}</span>
            </span>
            <span>
              Workspace: <span className="text-zinc-300">{getWorkspace(incident)}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Opened"
            value={formatDate(getOpenedAt(incident))}
          />

          <MetaItem
            label="Updated"
            value={formatDate(getUpdatedAt(incident))}
          />

          <MetaItem
            label="Resolved"
            value={formatDate(getResolvedAt(incident))}
          />

          <MetaItem
            label="Flow"
            value={
              flowId ? (
                <Link
                  href={`/flows/${encodeURIComponent(flowId)}`}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowId}
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

          <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 space-y-2">
            <div>
              <span className={metaLabelClassName()}>Decision</span>
              <div className="mt-1 text-purple-300">{decisionStatus || "—"}</div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Decision reason</span>
              <div className="mt-1 text-zinc-300">{getDecisionReason(incident) || "—"}</div>
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

export default async function IncidentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

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

  const activeIncidents = [...openIncidents, ...escalatedIncidents].sort((a, b) => {
    const aTs = new Date(
      getUpdatedAt(a) || getOpenedAt(a) || getResolvedAt(a) || 0
    ).getTime();
    const bTs = new Date(
      getUpdatedAt(b) || getOpenedAt(b) || getResolvedAt(b) || 0
    ).getTime();
    return bTs - aTs;
  });

  const sortedResolvedIncidents = [...resolvedIncidents].sort((a, b) => {
    const aTs = new Date(
      getResolvedAt(a) || getUpdatedAt(a) || getOpenedAt(a) || 0
    ).getTime();
    const bTs = new Date(
      getResolvedAt(b) || getUpdatedAt(b) || getOpenedAt(b) || 0
    ).getTime();
    return bTs - aTs;
  });

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
            Vue orientée impact métier. Cette page permet de voir les incidents
            ouverts, escaladés et résolus, ainsi que leur lien avec les flows BOSAI.
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
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Open incidents</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
            {openIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Escalated</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-300">
            {escalatedIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Resolved</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
            {resolvedIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Critical</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-red-300">
            {criticalIncidents.length}
          </div>
        </div>
      </section>

      {visibleIncidents.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500">
          Aucun incident visible pour le moment.
        </section>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Active incidents
              </h2>
              <span className="text-sm text-zinc-400">{activeIncidents.length}</span>
            </div>

            {activeIncidents.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
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
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Resolved incidents
              </h2>
              <span className="text-sm text-zinc-400">
                {sortedResolvedIncidents.length}
              </span>
            </div>

            {sortedResolvedIncidents.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
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
