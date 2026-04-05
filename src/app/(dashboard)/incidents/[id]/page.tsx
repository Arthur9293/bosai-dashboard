import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: SearchParams;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function buttonClassName(variant: "default" | "accent" = "default") {
  if (variant === "accent") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
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

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return (value[0] || "").trim();
  }

  return (value || "").trim();
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

  if (["open", "opened", "new", "active", "en cours"].includes(raw)) return "open";
  if (["escalated", "escalade", "escaladé"].includes(raw)) return "escalated";
  if (["resolved", "closed", "done", "résolu", "resolve"].includes(raw)) return "resolved";

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

function getResolutionNote(incident: IncidentItem) {
  return toText(incident.resolution_note);
}

function getLastAction(incident: IncidentItem) {
  return toText(incident.last_action);
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
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);

  const isGenericTitle =
    title === "incident" || title === "untitled incident";

  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";

  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const hasNoLinking =
    flowId === "" &&
    rootEventId === "" &&
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

  return isGenericTitle && isGenericCategory && isGenericReason && !hasStrongBusinessSignal;
}

function buildIncidentsBackHref(
  searchParams: Record<string, string | string[] | undefined>
) {
  const params = new URLSearchParams();

  const flowId = readSearchParam(searchParams, "flow_id");
  const rootEventId = readSearchParam(searchParams, "root_event_id");
  const sourceRecordId = readSearchParam(searchParams, "source_record_id");
  const from = readSearchParam(searchParams, "from");

  if (flowId) params.set("flow_id", flowId);
  if (rootEventId) params.set("root_event_id", rootEventId);
  if (sourceRecordId) params.set("source_record_id", sourceRecordId);
  if (from) params.set("from", from);

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

function buildFlowsBackHref(
  incident: IncidentItem,
  searchParams: Record<string, string | string[] | undefined>
) {
  const flowId = getFlowId(incident);
  if (flowId) {
    return `/flows/${encodeURIComponent(flowId)}`;
  }

  const searchFlowId = readSearchParam(searchParams, "flow_id");
  if (searchFlowId) {
    return `/flows/${encodeURIComponent(searchFlowId)}`;
  }

  const searchRootEventId = readSearchParam(searchParams, "root_event_id");
  if (searchRootEventId) {
    return `/flows/${encodeURIComponent(searchRootEventId)}`;
  }

  const sourceRecordId = readSearchParam(searchParams, "source_record_id");
  if (sourceRecordId) {
    return `/flows/${encodeURIComponent(sourceRecordId)}`;
  }

  return "/flows";
}

export default async function IncidentDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  let data: IncidentsResponse | null = null;

  try {
    data = await fetchIncidents();
  } catch {
    data = null;
  }

  const incidents: IncidentItem[] = Array.isArray(data?.incidents) ? data.incidents : [];
  const cleanIncidents = incidents.filter((item) => !isLegacyNoiseIncident(item));
  const incident = cleanIncidents.find((item) => item.id === id);

  if (!incident) {
    notFound();
  }

  const title = getIncidentTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const openedAt = getOpenedAt(incident);
  const updatedAt = getUpdatedAt(incident);
  const resolvedAt = getResolvedAt(incident);
  const flowId = getFlowId(incident);
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);
  const rootEventId = getRootEventId(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);
  const reason = getReason(incident);
  const suggestedAction = getSuggestedAction(incident);
  const slaLabel = getSlaLabel(incident);
  const resolutionNote = getResolutionNote(incident);
  const lastAction = getLastAction(incident);
  const errorId = toText(incident.error_id);
  const decisionStatus = getDecisionStatus(incident);
  const decisionReason = getDecisionReason(incident);
  const nextAction = getNextAction(incident);
  const priorityScore = getPriorityScore(incident);

  const incidentsBackHref = buildIncidentsBackHref(resolvedSearchParams);
  const flowsBackHref = buildFlowsBackHref(incident, resolvedSearchParams);

  const from = readSearchParam(resolvedSearchParams, "from");
  const filterFlowId = readSearchParam(resolvedSearchParams, "flow_id");
  const filterRootEventId = readSearchParam(resolvedSearchParams, "root_event_id");
  const filterSourceRecordId = readSearchParam(resolvedSearchParams, "source_record_id");

  const openedFromFlows =
    from === "flows" ||
    Boolean(filterFlowId) ||
    Boolean(filterRootEventId) ||
    Boolean(filterSourceRecordId);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href={incidentsBackHref}
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Incidents
          </Link>{" "}
          / {title}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              incident
            )}`}
          >
            {statusLabel}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${severityTone(
              incident
            )}`}
          >
            {severityLabel}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${getSlaTone(
              incident
            )}`}
          >
            SLA {slaLabel}
          </span>

          {decisionStatus ? (
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${getDecisionTone(
                incident
              )}`}
            >
              DECISION {decisionStatus.toUpperCase()}
            </span>
          ) : null}
        </div>
      </div>

      {openedFromFlows ? (
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="mb-4 text-lg font-medium text-emerald-200">
            Contexte de navigation
          </div>

          <div className="flex flex-wrap gap-2">
            {filterFlowId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-200">
                flow_id: {filterFlowId}
              </span>
            ) : null}

            {filterRootEventId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-200">
                root_event_id: {filterRootEventId}
              </span>
            ) : null}

            {filterSourceRecordId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-200">
                source_record_id: {filterSourceRecordId}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={flowsBackHref} className={buttonClassName()}>
              Retour au flow lié
            </Link>

            <Link href={incidentsBackHref} className={buttonClassName("accent")}>
              Retour aux incidents filtrés
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Opened</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(openedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Updated</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(updatedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Resolved</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(resolvedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">SLA Remaining</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {typeof incident.sla_remaining_minutes === "number"
              ? `${incident.sla_remaining_minutes} min`
              : "—"}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium text-white">
            Incident context
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              Category: <span className="text-zinc-200">{category}</span>
            </div>
            <div>
              Reason: <span className="text-zinc-200">{reason}</span>
            </div>
            <div>
              Workspace: <span className="text-zinc-200">{workspace}</span>
            </div>
            <div>
              Source: <span className="text-zinc-200">{toText(incident.source)}</span>
            </div>
            <div>
              Worker: <span className="text-zinc-200">{toText(incident.worker)}</span>
            </div>
            <div>
              Error ID: <span className="text-zinc-200">{errorId}</span>
            </div>
            <div>
              Last action: <span className="text-zinc-200">{lastAction}</span>
            </div>
            <div>
              Resolution note: <span className="text-zinc-200">{resolutionNote}</span>
            </div>
            <div>
              Decision status: <span className="text-purple-300">{decisionStatus || "—"}</span>
            </div>
            <div>
              Decision reason: <span className="text-zinc-200">{decisionReason || "—"}</span>
            </div>
            <div>
              Next action: <span className="text-zinc-200">{nextAction || "—"}</span>
            </div>
            <div>
              Priority score: <span className="text-zinc-200">{priorityScore}</span>
            </div>
            <div className="md:col-span-2">
              Suggested action: <span className="text-zinc-200">{suggestedAction}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Incident stats
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Status</span>
              <span className="text-zinc-200">{statusLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Severity</span>
              <span className="text-zinc-200">{severityLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">SLA</span>
              <span className="text-zinc-200">{slaLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Priority</span>
              <span className="text-zinc-200">{priorityScore}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Record ID</span>
              <span className="break-all text-zinc-200">{incident.id}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium text-white">
            Flow links
          </div>

          <div className="space-y-4 text-sm text-zinc-400">
            <div className="break-all">
              Flow:{" "}
              {flowId ? (
                <Link
                  href={`/flows/${encodeURIComponent(flowId)}`}
                  className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowId}
                </Link>
              ) : (
                <span className="text-zinc-200">—</span>
              )}
            </div>

            <div className="break-all">
              Root event: <span className="text-zinc-200">{toText(rootEventId)}</span>
            </div>

            <div className="break-all">
              Run record: <span className="text-zinc-200">{toText(runRecord)}</span>
            </div>

            <div className="break-all">
              Command:{" "}
              {commandRecord !== "—" && commandRecord ? (
                <Link
                  href={`/commands/${encodeURIComponent(commandRecord)}`}
                  className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {commandRecord}
                </Link>
              ) : (
                <span className="text-zinc-200">—</span>
              )}
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Navigation
          </div>

          <div className="space-y-3">
            <Link href={incidentsBackHref} className={buttonClassName()}>
              Retour à la liste incidents
            </Link>

            <Link href={flowsBackHref} className={buttonClassName()}>
              Ouvrir le flow lié
            </Link>

            {commandRecord !== "—" && commandRecord ? (
              <Link
                href={`/commands/${encodeURIComponent(commandRecord)}`}
                className={buttonClassName()}
              >
                Ouvrir la command liée
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
