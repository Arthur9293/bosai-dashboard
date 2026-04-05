import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

type AnyRecord = Record<string, unknown>;

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
  readingMode: "enriched" | "registry-only";
  sourceRecordId?: string;
  isPartial: boolean;
};

type TimelineItem = {
  id: string;
  capability: string;
  status: string;
  worker: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
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

type EventSnapshot = {
  id: string;
  eventType: string;
  capability: string;
  workspaceId: string;
  flowId: string;
  rootEventId: string;
  linkedCommand: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  processedAt: string;
  payload: unknown;
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

function actionLinkClassName(
  variant: "default" | "primary" | "danger" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
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

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const normalized = Number(value);
    if (Number.isFinite(normalized)) return normalized;
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
  } catch {}

  return {};
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
  const normalized = toText(status).toLowerCase();

  if (["success", "done", "completed", "resolved", "processed"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "in_progress", "processing", "queued"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["failed", "error", "blocked", "escalated"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["partial"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function stepBadgeTone() {
  return "bg-white/5 text-zinc-300 border border-white/10";
}

function incidentTone(hasIncident: boolean) {
  return hasIncident
    ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
    : "bg-zinc-800 text-zinc-300 border border-white/10";
}

function incidentLabel(count: number, hasIncident: boolean) {
  if (!hasIncident || count <= 0) return "Aucun incident";
  if (count === 1) return "1 incident";
  return `${count} incidents`;
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(toText(value));
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

function pickFirstText(
  record: AnyRecord,
  candidates: string[],
  fallback = ""
): string {
  for (const key of candidates) {
    const value = record[key];
    const candidate = toText(value, "");
    if (candidate) return candidate;
  }
  return fallback;
}

function pickFirstNumber(
  record: AnyRecord,
  candidates: string[],
  fallback = 0
): number {
  for (const key of candidates) {
    const value = record[key];
    const candidate = toNumber(value, Number.NaN);
    if (Number.isFinite(candidate)) return candidate;
  }
  return fallback;
}

function normalizeFlowSummary(flow: AnyRecord): FlowSummaryLike {
  return {
    key: toText(
      flow.key ||
        flow.flowId ||
        flow.flow_id ||
        flow.sourceRecordId ||
        flow.source_record_id ||
        ""
    ),
    flowId: toText(flow.flowId || flow.flow_id || ""),
    rootEventId: toText(flow.rootEventId || flow.root_event_id || ""),
    workspaceId: toText(flow.workspaceId || flow.workspace_id || "production"),
    status: toText(flow.status || "unknown"),
    steps: toNumber(flow.steps, 0),
    rootCapability: toText(flow.rootCapability || flow.root_capability || ""),
    terminalCapability: toText(
      flow.terminalCapability || flow.terminal_capability || ""
    ),
    durationMs: toNumber(flow.durationMs || flow.duration_ms, 0),
    lastActivityTs: toNumber(flow.lastActivityTs || flow.last_activity_ts, 0),
    hasIncident: toBoolean(flow.hasIncident, false),
    incidentCount: toNumber(flow.incidentCount, 0),
    firstIncidentId: toText(flow.firstIncidentId || "", ""),
    readingMode:
      flow.readingMode === "registry-only" ? "registry-only" : "enriched",
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
    status: toText(record.status || record.statut_incident || ""),
    severity: toText(record.severity || ""),
    sla_status: toText(record.sla_status || ""),
    resolved_at: toText(record.resolved_at || ""),
  };
}

function normalizeEventRecord(record: AnyRecord): EventSnapshot {
  const payloadParsed = parseMaybeJson(
    record.payload_json ?? record.payload ?? record.Payload_JSON ?? record.Payload
  );

  const linkedCommand = pickFirstText(
    { ...payloadParsed, ...record },
    [
      "linked_command",
      "Linked_Command",
      "command_id",
      "Command_ID",
      "commandId",
    ],
    ""
  );

  const flowId = pickFirstText(
    { ...payloadParsed, ...record },
    ["flow_id", "Flow_ID", "flowId", "flowid"],
    ""
  );

  const rootEventId =
    pickFirstText(
      { ...payloadParsed, ...record },
      ["root_event_id", "Root_Event_ID", "rootEventId", "rooteventid"],
      ""
    ) || toText(record.id || "");

  return {
    id: toText(record.id || ""),
    eventType: pickFirstText(record, ["event_type", "Event_Type", "type", "Type"], ""),
    capability: pickFirstText(
      { ...payloadParsed, ...record },
      ["mapped_capability", "Mapped_Capability", "capability", "Capability"],
      ""
    ),
    workspaceId: pickFirstText(
      { ...payloadParsed, ...record },
      ["workspace_id", "Workspace_ID", "workspace", "Workspace"],
      "production"
    ),
    flowId,
    rootEventId,
    linkedCommand,
    source: pickFirstText({ ...payloadParsed, ...record }, ["source", "Source"], ""),
    createdAt: pickFirstText(record, ["created_at", "Created_At"], ""),
    updatedAt: pickFirstText(record, ["updated_at", "Updated_At"], ""),
    processedAt: pickFirstText(record, ["processed_at", "Processed_At"], ""),
    payload: payloadParsed,
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
  if (["processed"].includes(raw)) return "processed";

  return raw || "unknown";
}

function getCommandCapability(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["capability", "Capability", "mapped_capability", "Mapped_Capability"],
    "unknown_capability"
  );
}

function getCommandFlowId(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["flow_id", "Flow_ID", "flowId", "flowid"],
    ""
  );
}

function getCommandRootEventId(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["root_event_id", "Root_Event_ID", "rootEventId", "rooteventid", "event_id", "eventId"],
    ""
  );
}

function getCommandWorkspaceId(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["workspace_id", "Workspace_ID", "workspaceId", "workspace", "Workspace"],
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
    stepIndex: pickFirstNumber(
      { ...record, ...inputParsed, ...resultParsed },
      ["step_index", "Step_Index", "stepIndex", "step"],
      0
    ),
    parentCommandId: pickFirstText(
      { ...record, ...inputParsed, ...resultParsed },
      ["parent_command_id", "Parent_Command_ID", "parentCommandId", "parent_id", "Parent_ID"],
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
    resultJson: prettyJson(
      record.result_json ?? record.output_json ?? resultParsed
    ),
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

function buildIncidentsHref(
  flowId: string,
  rootEventId: string,
  sourceRecordId: string
) {
  const params = new URLSearchParams();

  if (flowId) params.set("flow_id", flowId);
  if (rootEventId) params.set("root_event_id", rootEventId);
  if (sourceRecordId) params.set("source_record_id", sourceRecordId);

  params.set("from", "flow_detail");

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

function isTimelineFailed(status: string) {
  return ["failed", "error", "blocked"].includes(toText(status).toLowerCase());
}

function isTimelineRunning(status: string) {
  return ["running", "queued", "processing"].includes(toText(status).toLowerCase());
}

function isTimelineRetry(status: string) {
  return ["retry", "retriable"].includes(toText(status).toLowerCase());
}

function resolveFlowStatus(
  items: TimelineItem[],
  summary?: FlowSummaryLike | null
): string {
  const summaryStatus = toText(summary?.status || "");
  if (summaryStatus) return summaryStatus;

  if (items.some((item) => isTimelineFailed(item.status))) return "failed";
  if (items.some((item) => isTimelineRunning(item.status))) return "running";
  if (items.some((item) => isTimelineRetry(item.status))) return "retry";
  if (
    items.length > 0 &&
    items.every((item) => ["done", "processed"].includes(item.status))
  ) {
    return "completed";
  }

  return "unknown";
}

function resolveIncidentOnlyStatus(incidents: AnyRecord[]): string {
  if (incidents.length === 0) return "unknown";

  const normalized = incidents.map((incident) => {
    const status = toText(incident.status).toLowerCase();
    const slaStatus = toText(incident.sla_status).toLowerCase();
    const hasResolvedAt = Boolean(toText(incident.resolved_at || ""));

    if (hasResolvedAt) return "resolved";
    if (["resolved", "closed", "done"].includes(status)) return "resolved";
    if (["escalated", "escalade", "escaladé"].includes(status)) return "failed";
    if (["open", "opened", "active", "new"].includes(status)) return "failed";
    if (slaStatus === "breached") return "failed";
    return "unknown";
  });

  if (normalized.includes("failed")) return "failed";
  if (normalized.every((value) => value === "resolved")) return "resolved";
  return "unknown";
}

function buildDisplayTitle(
  id: string,
  flowId: string,
  rootEventId: string,
  sourceRecordId: string,
  eventType: string,
  capability: string
): string {
  const candidates = [flowId, rootEventId, eventType, capability, id, sourceRecordId]
    .map((value) => toText(value))
    .filter(Boolean);

  const readable = candidates.find((value) => !isRecordIdLike(value));
  return readable || candidates[0] || "Flow";
}

export default async function FlowDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(toText(resolvedParams?.id || ""));

  const api = await import("@/lib/api");

  const fetchCommands = (api as Record<string, unknown>).fetchCommands as
    | undefined
    | ((limit?: number) => Promise<unknown>);
  const fetchIncidents = (api as Record<string, unknown>).fetchIncidents as
    | undefined
    | ((limit?: number) => Promise<unknown>);
  const fetchFlows = (api as Record<string, unknown>).fetchFlows as
    | undefined
    | (() => Promise<unknown>);
  const fetchEvents = (api as Record<string, unknown>).fetchEvents as
    | undefined
    | ((limit?: number) => Promise<unknown>);

  let commandsData: unknown = null;
  let incidentsData: unknown = null;
  let flowsData: unknown = null;
  let eventsData: unknown = null;

  try {
    commandsData = fetchCommands ? await fetchCommands(300) : null;
  } catch {
    commandsData = null;
  }

  try {
    incidentsData = fetchIncidents ? await fetchIncidents(300) : null;
  } catch {
    incidentsData = null;
  }

  try {
    flowsData = fetchFlows ? await fetchFlows() : null;
  } catch {
    flowsData = null;
  }

  try {
    eventsData = fetchEvents ? await fetchEvents(300) : null;
  } catch {
    eventsData = null;
  }

  const rawCommands: AnyRecord[] =
    commandsData &&
    typeof commandsData === "object" &&
    !Array.isArray(commandsData) &&
    Array.isArray((commandsData as Record<string, unknown>).commands)
      ? ((commandsData as Record<string, unknown>).commands as AnyRecord[])
      : Array.isArray(commandsData)
        ? (commandsData as AnyRecord[])
        : [];

  const rawIncidents: AnyRecord[] =
    incidentsData &&
    typeof incidentsData === "object" &&
    !Array.isArray(incidentsData) &&
    Array.isArray((incidentsData as Record<string, unknown>).incidents)
      ? ((incidentsData as Record<string, unknown>).incidents as AnyRecord[])
      : Array.isArray(incidentsData)
        ? (incidentsData as AnyRecord[])
        : [];

  const rawFlows: AnyRecord[] =
    flowsData &&
    typeof flowsData === "object" &&
    !Array.isArray(flowsData) &&
    Array.isArray((flowsData as Record<string, unknown>).flows)
      ? ((flowsData as Record<string, unknown>).flows as AnyRecord[])
      : Array.isArray(flowsData)
        ? (flowsData as AnyRecord[])
        : [];

  const rawEvents: AnyRecord[] =
    eventsData &&
    typeof eventsData === "object" &&
    !Array.isArray(eventsData) &&
    Array.isArray((eventsData as Record<string, unknown>).events)
      ? ((eventsData as Record<string, unknown>).events as AnyRecord[])
      : Array.isArray(eventsData)
        ? (eventsData as AnyRecord[])
        : [];

  const normalizedFlows = rawFlows.map(normalizeFlowSummary);
  const normalizedIncidents = rawIncidents.map(normalizeIncidentRecord);
  const normalizedEvents = rawEvents.map(normalizeEventRecord);
  const timelineBase = rawCommands.map(normalizeTimelineItem);

  const flowSummary =
    normalizedFlows.find(
      (flow) =>
        flow.key === id ||
        flow.flowId === id ||
        flow.rootEventId === id ||
        flow.sourceRecordId === id
    ) || null;

  const exactEvent =
    normalizedEvents.find((event) => event.id === id) || null;

  const effectiveRootSeed =
    toText(flowSummary?.rootEventId) ||
    toText(exactEvent?.rootEventId) ||
    (exactEvent ? exactEvent.id : "") ||
    id;

  const effectiveFlowSeed =
    toText(flowSummary?.flowId) ||
    toText(exactEvent?.flowId) ||
    "";

  const relatedEvents = normalizedEvents.filter((event) => {
    if (event.id === id) return true;
    if (event.rootEventId && event.rootEventId === id) return true;
    if (event.flowId && event.flowId === id) return true;
    if (effectiveRootSeed && event.rootEventId === effectiveRootSeed) return true;
    if (effectiveRootSeed && event.id === effectiveRootSeed) return true;
    if (effectiveFlowSeed && event.flowId === effectiveFlowSeed) return true;
    return false;
  });

  const relatedCommandIds = new Set(
    relatedEvents
      .map((event) => event.linkedCommand)
      .filter((value) => Boolean(toText(value)))
  );

  const effectiveFlowId =
    toText(flowSummary?.flowId) ||
    toText(relatedEvents.find((event) => event.flowId)?.flowId) ||
    "";

  const effectiveRootEventId =
    toText(flowSummary?.rootEventId) ||
    toText(relatedEvents.find((event) => event.rootEventId)?.rootEventId) ||
    effectiveRootSeed;

  const effectiveSourceRecordId =
    toText(flowSummary?.sourceRecordId) ||
    toText(exactEvent?.id) ||
    toText(relatedEvents[0]?.id) ||
    "";

  const matchedTimeline = sortTimeline(
    timelineBase.filter((item) => {
      if (relatedCommandIds.has(item.id)) return true;
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
    if (incident.id === id) return true;
    return false;
  });

  if (
    !flowSummary &&
    matchedTimeline.length === 0 &&
    matchedIncidents.length === 0 &&
    relatedEvents.length === 0
  ) {
    notFound();
  }

  const incidentFlowId = toText(matchedIncidents[0]?.flow_id || "");
  const incidentRootEventId = toText(matchedIncidents[0]?.root_event_id || "");
  const incidentWorkspaceId = toText(matchedIncidents[0]?.workspace_id || "");
  const incidentSourceRecordId = toText(matchedIncidents[0]?.source_record_id || "");

  const sourceEvent = relatedEvents[0] || null;

  const flowId = toText(
    flowSummary?.flowId ||
      matchedTimeline[0]?.flowId ||
      sourceEvent?.flowId ||
      incidentFlowId
  );

  const rootEventId = toText(
    flowSummary?.rootEventId ||
      matchedTimeline[0]?.rootEventId ||
      sourceEvent?.rootEventId ||
      incidentRootEventId ||
      id
  );

  const workspaceId = toText(
    flowSummary?.workspaceId ||
      matchedTimeline[0]?.workspaceId ||
      sourceEvent?.workspaceId ||
      incidentWorkspaceId ||
      "production"
  );

  const sourceRecordId = toText(
    flowSummary?.sourceRecordId ||
      effectiveSourceRecordId ||
      incidentSourceRecordId
  );

  const readingMode: "enriched" | "registry-only" =
    flowSummary?.readingMode ||
    (matchedTimeline.length > 0 ? "enriched" : "registry-only");

  const incidentCount = toNumber(
    flowSummary?.incidentCount ?? matchedIncidents.length,
    matchedIncidents.length
  );

  const hasIncident =
    toBoolean(flowSummary?.hasIncident, false) || incidentCount > 0;

  const rootCapability = toText(
    flowSummary?.rootCapability ||
      matchedTimeline[0]?.capability ||
      sourceEvent?.capability ||
      (readingMode === "registry-only" ? "Registre uniquement" : "Non disponible")
  );

  const terminalCapability = toText(
    flowSummary?.terminalCapability ||
      matchedTimeline[matchedTimeline.length - 1]?.capability ||
      sourceEvent?.capability ||
      (readingMode === "registry-only" ? "Registre uniquement" : "Non disponible")
  );

  const lastActivityTs = toNumber(
    flowSummary?.lastActivityTs || getLastKnownTimestamp(matchedTimeline),
    0
  );

  const durationMs = toNumber(
    flowSummary?.durationMs || getDurationMs(matchedTimeline),
    0
  );

  const resolvedStatus =
    matchedTimeline.length > 0
      ? resolveFlowStatus(matchedTimeline, flowSummary)
      : toText(flowSummary?.status) || resolveIncidentOnlyStatus(matchedIncidents) || "unknown";

  const title = buildDisplayTitle(
    id,
    flowId,
    rootEventId,
    sourceRecordId,
    sourceEvent?.eventType || "",
    sourceEvent?.capability || ""
  );

  const displayedSteps =
    toNumber(flowSummary?.steps, 0) > 0
      ? toNumber(flowSummary?.steps, 0)
      : matchedTimeline.length;

  const doneCount = matchedTimeline.filter((item) =>
    ["done", "processed"].includes(item.status)
  ).length;
  const runningCount = matchedTimeline.filter((item) => isTimelineRunning(item.status)).length;
  const failedCount = matchedTimeline.filter((item) => isTimelineFailed(item.status)).length;

  const graphCommands = matchedTimeline.map((item) => ({
    id: item.id,
    capability: item.capability,
    status: item.status,
    parent_command_id: item.parentCommandId,
    flow_id: item.flowId || rootEventId,
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
            {toText(resolvedStatus, "unknown").toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {displayedSteps > 0
              ? `${displayedSteps} étape${displayedSteps > 1 ? "s" : ""}`
              : readingMode === "registry-only"
                ? "Étapes non chargées"
                : "0 étape"}
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

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${incidentTone(
              hasIncident
            )}`}
          >
            {incidentLabel(incidentCount, hasIncident)}
          </span>
        </div>

        {hasIncident ? (
          <div className="mt-4">
            <Link href={incidentsHref} className={actionLinkClassName("danger")}>
              Voir les incidents
            </Link>
          </div>
        ) : null}
      </div>

      {readingMode === "registry-only" ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="text-2xl font-semibold text-amber-200">
            Observabilité partielle
          </div>
          <p className="mt-3 text-base leading-7 text-amber-100/85">
            Ce flow est bien présent dans le registre BOSAI, mais aucune chaîne complète
            n’a encore été reconstruite. La page utilise l’event et le linked_command
            comme fallback pour éviter le 404.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Étapes</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {displayedSteps > 0 ? displayedSteps : "—"}
          </div>
          {displayedSteps === 0 && readingMode === "registry-only" ? (
            <div className="mt-2 text-xs text-zinc-500">Détail non chargé</div>
          ) : null}
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Terminées</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">
            {doneCount}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">En cours / En file</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">
            {runningCount}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Échecs</div>
          <div className="mt-3 text-4xl font-semibold text-rose-300">
            {failedCount}
          </div>
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
            {incidentLabel(incidentCount, hasIncident)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Identité du flow
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <span className="text-zinc-500">Flow key :</span> {title}
          </div>
          <div>
            <span className="text-zinc-500">Root event :</span> {rootEventId || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Workspace :</span> {workspaceId}
          </div>
          <div>
            <span className="text-zinc-500">Dernière étape :</span>{" "}
            {matchedTimeline[matchedTimeline.length - 1]?.capability || terminalCapability}
          </div>
          <div>
            <span className="text-zinc-500">Dernière activité :</span>{" "}
            {lastActivityTs > 0 ? formatDate(lastActivityTs) : "—"}
          </div>
          <div>
            <span className="text-zinc-500">Dernier statut :</span>{" "}
            {toText(resolvedStatus, "unknown").toUpperCase()}
          </div>

          {flowId ? (
            <div className="break-all">
              <span className="text-zinc-500">Flow ID :</span> {flowId}
            </div>
          ) : null}

          {sourceRecordId ? (
            <div className="md:col-span-2 xl:col-span-3 break-all">
              <span className="text-zinc-500">Source record :</span> {sourceRecordId}
            </div>
          ) : null}

          <div className="md:col-span-2 xl:col-span-3">
            <span className="text-zinc-500">Type de lecture :</span>{" "}
            {readingMode === "registry-only" ? "Registre uniquement" : "Enrichie"}
          </div>
        </div>
      </section>

      {sourceEvent ? (
        <section className={cardClassName()}>
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
            Event source
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="text-zinc-500">Event ID :</span> {sourceEvent.id}
            </div>
            <div>
              <span className="text-zinc-500">Type :</span> {sourceEvent.eventType || "—"}
            </div>
            <div>
              <span className="text-zinc-500">Capability :</span>{" "}
              {sourceEvent.capability || "—"}
            </div>
            <div>
              <span className="text-zinc-500">Source :</span> {sourceEvent.source || "—"}
            </div>
            <div>
              <span className="text-zinc-500">Linked command :</span>{" "}
              {sourceEvent.linkedCommand || "—"}
            </div>
            <div>
              <span className="text-zinc-500">Processed :</span>{" "}
              {formatDate(sourceEvent.processedAt || sourceEvent.updatedAt || sourceEvent.createdAt)}
            </div>
          </div>

          <div className="mt-4">
            <Link
              href={`/events/${encodeURIComponent(sourceEvent.id)}`}
              className={actionLinkClassName()}
            >
              Ouvrir l’event source
            </Link>
          </div>
        </section>
      ) : null}

      <section className={cardClassName()}>
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">
          Graphe d’exécution
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Touchez un nœud du graphe pour aller directement à l’étape correspondante
          dans la timeline.
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
          Timeline d’exécution
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
                        {toText(item.status, "unknown").toUpperCase()}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone()}`}
                      >
                        STEP {item.stepIndex}
                      </span>

                      {item.isRoot ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone()}`}
                        >
                          ROOT
                        </span>
                      ) : null}

                      {item.isTerminal ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone()}`}
                        >
                          TERMINAL
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        ID: <span className="break-all text-zinc-200">{item.id || "—"}</span>
                      </div>
                      <div>
                        Parent:{" "}
                        <span className="break-all text-zinc-200">
                          {item.parentCommandId || "—"}
                        </span>
                      </div>
                      <div>
                        Worker: <span className="text-zinc-200">{item.worker || "—"}</span>
                      </div>
                      <div>
                        Démarré:{" "}
                        <span className="text-zinc-200">
                          {formatDate(item.startedAt || item.createdAt)}
                        </span>
                      </div>
                      <div>
                        Terminé:{" "}
                        <span className="text-zinc-200">
                          {formatDate(item.finishedAt)}
                        </span>
                      </div>
                      <div>
                        Root event:{" "}
                        <span className="break-all text-zinc-200">
                          {item.rootEventId || rootEventId || "—"}
                        </span>
                      </div>
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
          <div className="mb-4 text-xl font-semibold text-white">Résumé rapide</div>

          <div className="space-y-3 text-sm text-zinc-300">
            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Incidents</div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentTone(
                    hasIncident
                  )}`}
                >
                  {incidentLabel(incidentCount, hasIncident)}
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
            <Link href="/flows" className={actionLinkClassName()}>
              Retour aux flows
            </Link>

            {sourceEvent ? (
              <Link
                href={`/events/${encodeURIComponent(sourceEvent.id)}`}
                className={actionLinkClassName()}
              >
                Retour à l’event source
              </Link>
            ) : null}

            {hasIncident ? (
              <Link href={incidentsHref} className={actionLinkClassName("danger")}>
                Voir les incidents
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
