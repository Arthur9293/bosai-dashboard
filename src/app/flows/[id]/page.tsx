import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AnyRecord = Record<string, any>;

type FlowSummaryLike = {
  key: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
  status: string;
  steps: number;
  rootCapability: string;
  terminalCapability: string;
  durationMs: number;
  lastActivityTs: number;
  hasIncident: boolean;
  incidentCount: number;
  firstIncidentId?: string;
  readingMode?: "enriched" | "registry-only";
  sourceRecordId?: string;
  isPartial?: boolean;
};

type TimelineItem = {
  id: string;
  capability: string;
  status: string;
  worker: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  stepIndex: number;
  parentCommandId: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
  inputJson: string;
  resultJson: string;
  isRoot: boolean;
  isTerminal: boolean;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function softPanelClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-4";
}

function emptyStateClassName() {
  return "rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-sm text-zinc-500";
}

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
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

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }
  return fallback;
}

function parseMaybeJson(value: unknown): AnyRecord {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as AnyRecord;
    }
    return {};
  } catch {
    return {};
  }
}

function prettyJson(value: unknown): string {
  if (!value) return "{}";

  if (typeof value === "string") {
    const parsed = parseMaybeJson(value);
    if (Object.keys(parsed).length > 0) {
      return JSON.stringify(parsed, null, 2);
    }
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function statusTone(status: string) {
  const normalized = status.trim().toLowerCase();

  if (["success", "done", "completed", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "in_progress", "processing"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["failed", "error", "blocked"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["partial"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function stepBadgeTone(label: "ROOT" | "TERMINAL" | "STEP") {
  if (label === "ROOT") {
    return "bg-white/5 text-zinc-300 border border-white/10";
  }

  if (label === "TERMINAL") {
    return "bg-white/5 text-zinc-300 border border-white/10";
  }

  return "bg-white/5 text-zinc-300 border border-white/10";
}

function incidentTone(hasIncident: boolean) {
  return hasIncident
    ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
    : "bg-zinc-800 text-zinc-300 border border-white/10";
}

function getJsonSources(record: AnyRecord) {
  const inputParsed = parseMaybeJson(
    record.input_json ??
      record.payload_json ??
      record.command_input_json ??
      record.input ??
      record.payload
  );

  const resultParsed = parseMaybeJson(
    record.result_json ?? record.output_json ?? record.result ?? record.output
  );

  return { inputParsed, resultParsed };
}

function pickFirstText(record: AnyRecord, candidates: string[], fallback = ""): string {
  for (const key of candidates) {
    const value = record[key];
    const text = toText(value, "");
    if (text) return text;
  }
  return fallback;
}

function pickFirstNumber(record: AnyRecord, candidates: string[], fallback = 0): number {
  for (const key of candidates) {
    const value = record[key];
    const num = toNumber(value, Number.NaN);
    if (Number.isFinite(num)) return num;
  }
  return fallback;
}

function normalizeFlowSummary(flow: AnyRecord): FlowSummaryLike {
  return {
    key: toText(flow.key || flow.flowId || flow.flow_id || flow.sourceRecordId || flow.source_record_id || ""),
    flowId: toText(flow.flowId || flow.flow_id || ""),
    rootEventId: toText(flow.rootEventId || flow.root_event_id || ""),
    workspaceId: toText(flow.workspaceId || flow.workspace_id || "production"),
    status: toText(flow.status || "unknown"),
    steps: toNumber(flow.steps, 0),
    rootCapability: toText(flow.rootCapability || flow.root_capability || "Non disponible"),
    terminalCapability: toText(flow.terminalCapability || flow.terminal_capability || "Non disponible"),
    durationMs: toNumber(flow.durationMs || flow.duration_ms, 0),
    lastActivityTs: toNumber(flow.lastActivityTs || flow.last_activity_ts, 0),
    hasIncident: toBoolean(flow.hasIncident, false),
    incidentCount: toNumber(flow.incidentCount, 0),
    firstIncidentId: toText(flow.firstIncidentId || "", ""),
    readingMode: flow.readingMode === "registry-only" ? "registry-only" : "enriched",
    sourceRecordId: toText(flow.sourceRecordId || flow.source_record_id || "", ""),
    isPartial: toBoolean(flow.isPartial, false),
  };
}

function normalizeIncidentRecord(record: AnyRecord): AnyRecord {
  return {
    ...record,
    id: toText(record.id || ""),
    flow_id: toText(record.flow_id || ""),
    root_event_id: toText(record.root_event_id || ""),
    source_record_id: toText(record.source_record_id || ""),
    workspace_id: toText(record.workspace_id || record.workspace || "production"),
    title: toText(record.title || record.name || record.error_id || "Incident"),
  };
}

function getCommandStatus(record: AnyRecord, resultParsed: AnyRecord): string {
  const raw = pickFirstText(
    { ...record, ...resultParsed },
    ["status", "Status", "status_select", "Status_select"],
    "unknown"
  ).toLowerCase();

  if (["done", "success", "completed"].includes(raw)) return "done";
  if (["running", "processing"].includes(raw)) return "running";
  if (["retry", "retriable"].includes(raw)) return "retry";
  if (["failed", "error", "blocked"].includes(raw)) return "failed";
  if (["queued", "queue", "pending"].includes(raw)) return "queued";

  return raw || "unknown";
}

function getCommandCapability(record: AnyRecord, inputParsed: AnyRecord, resultParsed: AnyRecord): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["capability", "Capability", "mapped_capability"],
    "unknown_capability"
  );
}

function getCommandFlowId(record: AnyRecord, inputParsed: AnyRecord, resultParsed: AnyRecord): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["flow_id", "flowId", "flowid"],
    ""
  );
}

function getCommandRootEventId(record: AnyRecord, inputParsed: AnyRecord, resultParsed: AnyRecord): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["root_event_id", "rootEventId", "rooteventid", "event_id", "eventId"],
    ""
  );
}

function getCommandWorkspaceId(record: AnyRecord, inputParsed: AnyRecord, resultParsed: AnyRecord): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["workspace_id", "workspaceId", "Workspace_ID", "workspace"],
    "production"
  );
}

function getCommandRecordId(record: AnyRecord): string {
  return pickFirstText(record, ["id", "record_id", "command_id", "Command_ID"], "");
}

function normalizeTimelineItem(record: AnyRecord): TimelineItem {
  const { inputParsed, resultParsed } = getJsonSources(record);

  return {
    id: getCommandRecordId(record),
    capability: getCommandCapability(record, inputParsed, resultParsed),
    status: getCommandStatus(record, resultParsed),
    worker: pickFirstText(record, ["worker", "Worker", "worker_id"], "—"),
    createdAt: pickFirstText(record, ["created_at", "Created_At"], ""),
    startedAt: pickFirstText(record, ["started_at", "Started_At"], ""),
    finishedAt: pickFirstText(record, ["finished_at", "Finished_At"], ""),
    stepIndex: pickFirstNumber({ ...record, ...inputParsed, ...resultParsed }, ["step_index", "stepIndex"], 0),
    parentCommandId: pickFirstText(
      { ...record, ...inputParsed, ...resultParsed },
      ["parent_command_id", "parentCommandId", "linked_command", "Linked_Command"],
      ""
    ),
    flowId: getCommandFlowId(record, inputParsed, resultParsed),
    rootEventId: getCommandRootEventId(record, inputParsed, resultParsed),
    workspaceId: getCommandWorkspaceId(record, inputParsed, resultParsed),
    inputJson: prettyJson(
      record.input_json ??
        record.payload_json ??
        record.command_input_json ??
        inputParsed
    ),
    resultJson: prettyJson(record.result_json ?? record.output_json ?? resultParsed),
    isRoot: false,
    isTerminal: false,
  };
}

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.stepIndex !== b.stepIndex) {
      return a.stepIndex - b.stepIndex;
    }

    const aDate = new Date(a.startedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.startedAt || b.createdAt || 0).getTime();
    return aDate - bDate;
  });
}

function getLastKnownTimestamp(items: TimelineItem[]): number {
  const values = items
    .map((item) =>
      new Date(item.finishedAt || item.startedAt || item.createdAt || 0).getTime()
    )
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

function getDurationMs(items: TimelineItem[]): number {
  if (items.length === 0) return 0;

  const sorted = sortTimeline(items);
  const firstTs = new Date(sorted[0].startedAt || sorted[0].createdAt || 0).getTime();
  const lastTs = new Date(
    sorted[sorted.length - 1].finishedAt ||
      sorted[sorted.length - 1].startedAt ||
      sorted[sorted.length - 1].createdAt ||
      0
  ).getTime();

  if (!Number.isFinite(firstTs) || !Number.isFinite(lastTs) || firstTs <= 0 || lastTs <= 0) {
    return 0;
  }

  const diff = lastTs - firstTs;
  return diff > 0 ? diff : 0;
}

function buildIncidentsHref(flowId: string, rootEventId: string, sourceRecordId: string) {
  const params = new URLSearchParams();

  if (flowId) params.set("flow_id", flowId);
  if (rootEventId) params.set("root_event_id", rootEventId);
  if (sourceRecordId) params.set("source_record_id", sourceRecordId);

  params.set("from", "flow_detail");

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

function isTimelineFailed(status: string) {
  return ["failed", "error", "blocked"].includes(status);
}

function isTimelineRunning(status: string) {
  return ["running", "queued", "processing"].includes(status);
}

function isTimelineRetry(status: string) {
  return ["retry", "retriable"].includes(status);
}

function resolveFlowStatus(items: TimelineItem[], summary?: FlowSummaryLike | null): string {
  if (summary?.status) return summary.status;

  if (items.some((item) => isTimelineFailed(item.status))) return "failed";
  if (items.some((item) => isTimelineRunning(item.status))) return "running";
  if (items.some((item) => isTimelineRetry(item.status))) return "retry";
  if (items.length > 0 && items.every((item) => item.status === "done")) return "success";

  return "unknown";
}

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;
  const api = await import("@/lib/api");

  const fetchCommands = (api as AnyRecord).fetchCommands as undefined | (() => Promise<any>);
  const fetchIncidents = (api as AnyRecord).fetchIncidents as undefined | (() => Promise<any>);
  const fetchFlows = (api as AnyRecord).fetchFlows as undefined | (() => Promise<any>);

  let commandsData: any = null;
  let incidentsData: any = null;
  let flowsData: any = null;

  try {
    commandsData = fetchCommands ? await fetchCommands() : null;
  } catch {
    commandsData = null;
  }

  try {
    incidentsData = fetchIncidents ? await fetchIncidents() : null;
  } catch {
    incidentsData = null;
  }

  try {
    flowsData = fetchFlows ? await fetchFlows() : null;
  } catch {
    flowsData = null;
  }

  const rawCommands: AnyRecord[] = Array.isArray(commandsData?.commands)
    ? commandsData.commands
    : Array.isArray(commandsData)
      ? commandsData
      : [];

  const rawIncidents: AnyRecord[] = Array.isArray(incidentsData?.incidents)
    ? incidentsData.incidents
    : Array.isArray(incidentsData)
      ? incidentsData
      : [];

  const rawFlows: AnyRecord[] = Array.isArray(flowsData?.flows)
    ? flowsData.flows
    : Array.isArray(flowsData)
      ? flowsData
      : [];

  const normalizedFlows = rawFlows.map(normalizeFlowSummary);
  const normalizedIncidents = rawIncidents.map(normalizeIncidentRecord);
  const timelineBase = rawCommands.map(normalizeTimelineItem);

  const flowSummary =
    normalizedFlows.find(
      (flow) =>
        flow.key === id ||
        flow.flowId === id ||
        flow.rootEventId === id ||
        flow.sourceRecordId === id
    ) || null;

  const effectiveFlowId =
    flowSummary?.flowId ||
    timelineBase.find((item) => item.flowId === id)?.flowId ||
    "";

  const effectiveRootEventId =
    flowSummary?.rootEventId ||
    timelineBase.find((item) => item.rootEventId === id)?.rootEventId ||
    "";

  const effectiveSourceRecordId = flowSummary?.sourceRecordId || "";

  const matchedTimeline = sortTimeline(
    timelineBase.filter((item) => {
      if (effectiveFlowId && item.flowId === effectiveFlowId) return true;
      if (effectiveRootEventId && item.rootEventId === effectiveRootEventId) return true;
      if (item.flowId === id) return true;
      if (item.rootEventId === id) return true;
      return false;
    })
  ).map((item, index, arr) => ({
    ...item,
    isRoot: index === 0,
    isTerminal: index === arr.length - 1,
  }));

  const matchedIncidents = normalizedIncidents.filter((incident) => {
    if (effectiveFlowId && incident.flow_id === effectiveFlowId) return true;
    if (effectiveRootEventId && incident.root_event_id === effectiveRootEventId) return true;
    if (effectiveSourceRecordId && incident.source_record_id === effectiveSourceRecordId) return true;
    if (incident.flow_id === id) return true;
    if (incident.root_event_id === id) return true;
    if (incident.source_record_id === id) return true;
    return false;
  });

  const flowId =
    flowSummary?.flowId ||
    matchedTimeline[0]?.flowId ||
    effectiveFlowId ||
    (id.startsWith("flow_") ? id : id);

  const rootEventId =
    flowSummary?.rootEventId ||
    matchedTimeline[0]?.rootEventId ||
    effectiveRootEventId ||
    "";

  const workspaceId =
    flowSummary?.workspaceId ||
    matchedTimeline[0]?.workspaceId ||
    matchedIncidents[0]?.workspace_id ||
    "production";

  const sourceRecordId = flowSummary?.sourceRecordId || effectiveSourceRecordId || "";

  const readingMode =
    flowSummary?.readingMode ||
    (matchedTimeline.length > 0 ? "enriched" : "registry-only");

  const incidentCount =
    flowSummary?.incidentCount ??
    matchedIncidents.length;

  const hasIncident =
    flowSummary?.hasIncident ??
    incidentCount > 0;

  const rootCapability =
    flowSummary?.rootCapability ||
    matchedTimeline[0]?.capability ||
    "Non disponible";

  const terminalCapability =
    flowSummary?.terminalCapability ||
    matchedTimeline[matchedTimeline.length - 1]?.capability ||
    "Non disponible";

  const lastActivityTs =
    flowSummary?.lastActivityTs ||
    getLastKnownTimestamp(matchedTimeline);

  const durationMs =
    flowSummary?.durationMs ||
    getDurationMs(matchedTimeline);

  const resolvedStatus = resolveFlowStatus(matchedTimeline, flowSummary);
  const title =
    flowSummary?.flowId ||
    matchedTimeline[0]?.flowId ||
    id;

  const commandsCount = matchedTimeline.length;
  const doneCount = matchedTimeline.filter((item) => item.status === "done").length;
  const runningCount = matchedTimeline.filter((item) => isTimelineRunning(item.status)).length;
  const failedCount = matchedTimeline.filter((item) => isTimelineFailed(item.status)).length;

  if (!flowSummary && matchedTimeline.length === 0 && matchedIncidents.length === 0) {
    notFound();
  }

  const graphCommands = matchedTimeline.map((item) => ({
    id: item.id,
    capability: item.capability,
    status: item.status,
    parent_command_id: item.parentCommandId,
    flow_id: item.flowId,
  }));

  const incidentsHref = buildIncidentsHref(flowId, rootEventId, sourceRecordId);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/flows"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            ← Retour aux flows
          </Link>
        </div>

        <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Flow
        </div>

        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue détaillée du flow BOSAI.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              resolvedStatus
            )}`}
          >
            {resolvedStatus.toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {commandsCount} step{commandsCount > 1 ? "s" : ""}
          </span>

          {readingMode === "registry-only" || flowSummary?.isPartial ? (
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
                "partial"
              )}`}
            >
              PARTIAL
            </span>
          ) : null}

          {hasIncident ? (
            <Link
              href={incidentsHref}
              className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
            >
              Voir les incidents
            </Link>
          ) : null}
        </div>
      </div>

      {readingMode === "registry-only" ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="text-2xl font-semibold text-amber-200">
            Observabilité partielle
          </div>
          <p className="mt-3 text-base leading-7 text-amber-100/85">
            Ce flow est bien présent dans le registre BOSAI, mais aucune commande
            détaillée n’a encore été chargée pour construire la lecture causale complète.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Commandes</div>
          <div className="mt-3 text-4xl font-semibold text-white">{commandsCount}</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">{doneCount}</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Running / Queued</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">{runningCount}</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Failed</div>
          <div className="mt-3 text-4xl font-semibold text-rose-300">{failedCount}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Capacité racine</div>
          <div className="mt-3 break-words text-xl font-semibold text-white">
            {rootCapability}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Capacité terminale</div>
          <div className="mt-3 break-words text-xl font-semibold text-white">
            {terminalCapability}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Durée totale</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDuration(durationMs)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Incident lié</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {hasIncident ? `${incidentCount} incident${incidentCount > 1 ? "s" : ""}` : "Aucun incident"}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Flow identity
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <span className="text-zinc-500">Flow key:</span> {title}
          </div>
          <div>
            <span className="text-zinc-500">Root event:</span> {rootEventId || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Workspace:</span> {workspaceId || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Last step:</span>{" "}
            {matchedTimeline[matchedTimeline.length - 1]?.capability || terminalCapability}
          </div>
          <div>
            <span className="text-zinc-500">Last activity:</span>{" "}
            {lastActivityTs > 0 ? formatDate(lastActivityTs) : "—"}
          </div>
          <div>
            <span className="text-zinc-500">Last status:</span>{" "}
            {resolvedStatus.toUpperCase()}
          </div>
          {sourceRecordId ? (
            <div className="md:col-span-2 xl:col-span-3 break-all">
              <span className="text-zinc-500">Source record:</span> {sourceRecordId}
            </div>
          ) : null}
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">
          Execution graph
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Touchez un nœud du graphe pour aller directement à l’étape correspondante dans la timeline.
        </p>

        {graphCommands.length > 0 ? (
          <FlowGraphClient commands={graphCommands} />
        ) : (
          <div className={emptyStateClassName()}>
            Graphe indisponible pour ce flow pour le moment.
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Execution timeline
        </div>

        {matchedTimeline.length === 0 ? (
          <div className={emptyStateClassName()}>
            Aucune étape détaillée disponible pour ce flow.
          </div>
        ) : (
          <div className="space-y-4">
            {matchedTimeline.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-xl font-semibold text-white">
                        {item.capability}
                      </h3>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                          item.status
                        )}`}
                      >
                        {item.status.toUpperCase()}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone(
                          "STEP"
                        )}`}
                      >
                        STEP {item.stepIndex}
                      </span>

                      {item.isRoot ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone(
                            "ROOT"
                          )}`}
                        >
                          ROOT
                        </span>
                      ) : null}

                      {item.isTerminal ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone(
                            "TERMINAL"
                          )}`}
                        >
                          TERMINAL
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>ID: <span className="text-zinc-200 break-all">{item.id || "—"}</span></div>
                      <div>Parent: <span className="text-zinc-200 break-all">{item.parentCommandId || "—"}</span></div>
                      <div>Worker: <span className="text-zinc-200">{item.worker || "—"}</span></div>
                      <div>Started: <span className="text-zinc-200">{formatDate(item.startedAt || item.createdAt)}</span></div>
                      <div>Finished: <span className="text-zinc-200">{formatDate(item.finishedAt)}</span></div>
                      <div>Flow: <span className="text-zinc-200 break-all">{item.flowId || flowId || "—"}</span></div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-xl font-semibold text-white">États vides</div>

          <div className="space-y-3 text-sm text-zinc-300">
            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Incident</div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentTone(
                    hasIncident
                  )}`}
                >
                  {hasIncident ? `${incidentCount} incident${incidentCount > 1 ? "s" : ""}` : "Aucun incident"}
                </span>
              </div>
            </div>

            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Graphe</div>
              <div className="mt-2 text-zinc-200">
                {graphCommands.length > 0
                  ? "Disponible"
                  : "Indisponible pour ce flow pour le moment."}
              </div>
            </div>

            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Timeline</div>
              <div className="mt-2 text-zinc-200">
                {matchedTimeline.length > 0
                  ? `${matchedTimeline.length} étape${matchedTimeline.length > 1 ? "s" : ""}`
                  : "Aucune étape détaillée disponible."}
              </div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-xl font-semibold text-white">Navigation</div>

          <div className="flex flex-col gap-3">
            <Link
              href="/flows"
              className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Retour aux flows
            </Link>

            {hasIncident ? (
              <Link
                href={incidentsHref}
                className="inline-flex w-full justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
              >
                Voir les incidents
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
