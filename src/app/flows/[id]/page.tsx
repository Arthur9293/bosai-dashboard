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

type EventSourceRecord = {
  id: string;
  eventType: string;
  capability: string;
  source: string;
  workspaceId: string;
  flowId: string;
  rootEventId: string;
  linkedCommandId: string;
  processedAt: string;
  updatedAt: string;
  status: string;
  payloadJson: string;
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

  if (["running", "in_progress", "processing", "queued", "pending"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["failed", "error", "blocked", "escalated"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["partial", "unknown"].includes(normalized)) {
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

function extractItems(data: unknown, key: string): AnyRecord[] {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const maybe = (data as Record<string, unknown>)[key];
    if (Array.isArray(maybe)) {
      return maybe as AnyRecord[];
    }
  }

  if (Array.isArray(data)) {
    return data as AnyRecord[];
  }

  return [];
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
    const text = toText(value, "");
    if (text) return text;
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
    const num = toNumber(value, Number.NaN);
    if (Number.isFinite(num)) return num;
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

function normalizeEventSourceRecord(record: AnyRecord): EventSourceRecord {
  const payloadParsed = parseMaybeJson(
    record.payload ?? record.payload_json ?? record.Payload_JSON
  );
  const merged = { ...record, ...payloadParsed };

  return {
    id: pickFirstText(record, ["id", "record_id", "ID"], ""),
    eventType: pickFirstText(
      merged,
      ["event_type", "Event_Type", "type", "Type"],
      "Event"
    ),
    capability: pickFirstText(
      merged,
      ["mapped_capability", "Mapped_Capability", "capability", "Capability"],
      "—"
    ),
    source: pickFirstText(merged, ["source", "Source"], "—"),
    workspaceId: pickFirstText(
      merged,
      ["workspace_id", "Workspace_ID", "workspace", "Workspace"],
      "production"
    ),
    flowId: pickFirstText(
      merged,
      ["flow_id", "Flow_ID", "flowId", "flowid"],
      ""
    ),
    rootEventId:
      pickFirstText(
        merged,
        ["root_event_id", "Root_Event_ID", "rootEventId", "rooteventid"],
        ""
      ) || pickFirstText(record, ["id"], ""),
    linkedCommandId: pickFirstText(
      merged,
      [
        "linked_command",
        "Linked_Command",
        "command_id",
        "Command_ID",
        "commandId",
        "Command_Record_ID",
      ],
      ""
    ),
    processedAt: pickFirstText(
      record,
      ["processed_at", "Processed_At", "updated_at", "Updated_At"],
      ""
    ),
    updatedAt: pickFirstText(
      record,
      ["updated_at", "Updated_At", "processed_at", "Processed_At"],
      ""
    ),
    status: pickFirstText(
      record,
      ["status", "Status", "status_select", "Status_select"],
      "unknown"
    ),
    payloadJson: prettyJson(record.payload ?? record.payload_json ?? payloadParsed),
  };
}

function getCommandStatus(record: AnyRecord, resultParsed: AnyRecord): string {
  const raw = pickFirstText(
    { ...record, ...resultParsed },
    ["status", "Status", "status_select", "Status_select"],
    "unknown"
  ).toLowerCase();

  if (["done", "success", "completed", "processed"].includes(raw)) return "done";
  if (["running", "processing"].includes(raw)) return "running";
  if (["retry", "retriable"].includes(raw)) return "retry";
  if (["failed", "error", "blocked"].includes(raw)) return "failed";
  if (["queued", "queue", "pending"].includes(raw)) return "queued";

  return raw || "unknown";
}

function getCommandCapability(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["capability", "Capability", "mapped_capability"],
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
    ["flow_id", "flowId", "flowid"],
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
    ["root_event_id", "rootEventId", "rooteventid", "event_id", "eventId"],
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
    stepIndex: pickFirstNumber(
      { ...record, ...inputParsed, ...resultParsed },
      ["step_index", "stepIndex"],
      0
    ),
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

function attachTimelineFlags(items: TimelineItem[]): TimelineItem[] {
  const sorted = sortTimeline(items);

  return sorted.map((item, index, arr) => ({
    ...item,
    isRoot: index === 0,
    isTerminal: index === arr.length - 1,
  }));
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

  if (
    !Number.isFinite(firstTs) ||
    !Number.isFinite(lastTs) ||
    firstTs <= 0 ||
    lastTs <= 0
  ) {
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
  return ["running", "queued", "processing", "pending"].includes(
    toText(status).toLowerCase()
  );
}

function isTimelineRetry(status: string) {
  return ["retry", "retriable"].includes(toText(status).toLowerCase());
}

function resolveFlowStatus(
  items: TimelineItem[],
  summary?: FlowSummaryLike | null
): string {
  const summaryStatus = toText(summary?.status || "");
  if (summaryStatus && summaryStatus !== "unknown") return summaryStatus;

  if (items.some((item) => isTimelineFailed(item.status))) return "failed";
  if (items.some((item) => isTimelineRunning(item.status))) return "running";
  if (items.some((item) => isTimelineRetry(item.status))) return "retry";
  if (items.length > 0 && items.every((item) => item.status === "done")) {
    return "completed";
  }

  return summaryStatus || "unknown";
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
  preferredTitle: string,
  id: string,
  flowId: string,
  rootEventId: string,
  sourceRecordId: string
): string {
  const explicit = toText(preferredTitle);
  if (explicit && !isRecordIdLike(explicit)) return explicit;

  const candidates = [flowId, rootEventId, id, sourceRecordId]
    .map((value) => toText(value))
    .filter(Boolean);

  const readable = candidates.find((value) => !isRecordIdLike(value));
  return readable || candidates[0] || "Flow";
}

function matchEventSource(
  events: EventSourceRecord[],
  options: {
    id: string;
    flowId: string;
    rootEventId: string;
    sourceRecordId: string;
    linkedCommandId: string;
  }
): EventSourceRecord | null {
  const { id, flowId, rootEventId, sourceRecordId, linkedCommandId } = options;

  return (
    events.find((event) => event.id === id) ||
    events.find((event) => sourceRecordId && event.id === sourceRecordId) ||
    events.find((event) => rootEventId && event.id === rootEventId) ||
    events.find((event) => flowId && event.flowId === flowId) ||
    events.find((event) => linkedCommandId && event.linkedCommandId === linkedCommandId) ||
    null
  );
}

export default async function FlowDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(toText(resolvedParams?.id || ""));

  const api = await import("@/lib/api");

  const fetchCommands = (api as AnyRecord).fetchCommands as
    | undefined
    | ((limit?: number) => Promise<unknown>);
  const fetchIncidents = (api as AnyRecord).fetchIncidents as
    | undefined
    | ((limit?: number) => Promise<unknown>);
  const fetchFlows = (api as AnyRecord).fetchFlows as
    | undefined
    | (() => Promise<unknown>);
  const fetchEvents = (api as AnyRecord).fetchEvents as
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

  const rawCommands = extractItems(commandsData, "commands");
  const rawIncidents = extractItems(incidentsData, "incidents");
  const rawFlows = extractItems(flowsData, "flows");
  const rawEvents = extractItems(eventsData, "events");

  const normalizedFlows = rawFlows.map(normalizeFlowSummary);
  const normalizedIncidents = rawIncidents.map(normalizeIncidentRecord);
  const normalizedEvents = rawEvents.map(normalizeEventSourceRecord);
  const timelineBase = rawCommands.map(normalizeTimelineItem);

  const flowSummary =
    normalizedFlows.find(
      (flow) =>
        flow.key === id ||
        flow.flowId === id ||
        flow.rootEventId === id ||
        flow.sourceRecordId === id
    ) || null;

  let eventSource =
    matchEventSource(normalizedEvents, {
      id,
      flowId: toText(flowSummary?.flowId),
      rootEventId: toText(flowSummary?.rootEventId),
      sourceRecordId: toText(flowSummary?.sourceRecordId),
      linkedCommandId: "",
    }) || null;

  const initialFlowId = toText(flowSummary?.flowId || eventSource?.flowId);
  const initialRootEventId = toText(
    flowSummary?.rootEventId || eventSource?.rootEventId || eventSource?.id
  );

  let matchedTimeline = attachTimelineFlags(
    timelineBase.filter((item) => {
      if (initialFlowId && item.flowId === initialFlowId) return true;
      if (initialRootEventId && item.rootEventId === initialRootEventId) return true;
      if (item.flowId === id) return true;
      if (item.rootEventId === id) return true;
      return false;
    })
  );

  if (!eventSource && matchedTimeline.length > 0) {
    eventSource =
      matchEventSource(normalizedEvents, {
        id,
        flowId: toText(matchedTimeline[0].flowId),
        rootEventId: toText(matchedTimeline[0].rootEventId),
        sourceRecordId: "",
        linkedCommandId: toText(matchedTimeline[0].id),
      }) || null;
  }

  let usedLinkedCommandFallback = false;

  if (matchedTimeline.length === 0 && eventSource?.linkedCommandId) {
    const fallbackCommand = timelineBase.find(
      (item) => item.id === eventSource?.linkedCommandId
    );

    if (fallbackCommand) {
      usedLinkedCommandFallback = true;
      matchedTimeline = attachTimelineFlags([
        {
          ...fallbackCommand,
          flowId: fallbackCommand.flowId || eventSource.flowId || "",
          rootEventId:
            fallbackCommand.rootEventId ||
            eventSource.rootEventId ||
            eventSource.id,
          workspaceId:
            fallbackCommand.workspaceId || eventSource.workspaceId || "production",
          stepIndex: fallbackCommand.stepIndex || 1,
        },
      ]);
    }
  }

  if (!eventSource && matchedTimeline.length > 0) {
    eventSource =
      matchEventSource(normalizedEvents, {
        id,
        flowId: toText(matchedTimeline[0].flowId),
        rootEventId: toText(matchedTimeline[0].rootEventId),
        sourceRecordId: "",
        linkedCommandId: toText(matchedTimeline[0].id),
      }) || null;
  }

  const incidentDerivedFlowId =
    normalizedIncidents.find((incident) => incident.source_record_id === id)?.flow_id ||
    normalizedIncidents.find((incident) => incident.id === id)?.flow_id ||
    "";

  const incidentDerivedRootEventId =
    normalizedIncidents.find((incident) => incident.source_record_id === id)?.root_event_id ||
    normalizedIncidents.find((incident) => incident.id === id)?.root_event_id ||
    "";

  const incidentDerivedSourceRecordId =
    normalizedIncidents.find((incident) => incident.source_record_id === id)?.source_record_id ||
    normalizedIncidents.find((incident) => incident.id === id)?.source_record_id ||
    "";

  if (
    !flowSummary &&
    matchedTimeline.length === 0 &&
    normalizedIncidents.length === 0 &&
    !eventSource
  ) {
    notFound();
  }

  const flowId = toText(
    flowSummary?.flowId ||
      matchedTimeline[0]?.flowId ||
      eventSource?.flowId ||
      incidentDerivedFlowId
  );

  const rootEventId = toText(
    flowSummary?.rootEventId ||
      matchedTimeline[0]?.rootEventId ||
      eventSource?.rootEventId ||
      eventSource?.id ||
      incidentDerivedRootEventId
  );

  const workspaceId = toText(
    flowSummary?.workspaceId ||
      matchedTimeline[0]?.workspaceId ||
      eventSource?.workspaceId ||
      "production"
  );

  const sourceRecordId = toText(
    flowSummary?.sourceRecordId ||
      eventSource?.id ||
      incidentDerivedSourceRecordId
  );

  const readingMode: "enriched" | "registry-only" =
    flowSummary?.readingMode ||
    (usedLinkedCommandFallback ? "registry-only" : matchedTimeline.length > 0 ? "enriched" : "registry-only");

  const matchedIncidents = normalizedIncidents.filter((incident) => {
    if (flowId && incident.flow_id === flowId) return true;
    if (rootEventId && incident.root_event_id === rootEventId) return true;
    if (sourceRecordId && incident.source_record_id === sourceRecordId) return true;
    if (incident.id === id) return true;
    return false;
  });

  const incidentCount = toNumber(
    flowSummary?.incidentCount ?? matchedIncidents.length,
    matchedIncidents.length
  );

  const hasIncident =
    toBoolean(flowSummary?.hasIncident, false) || incidentCount > 0;

  const rootCapability = toText(
    flowSummary?.rootCapability ||
      matchedTimeline[0]?.capability ||
      eventSource?.capability ||
      (readingMode === "registry-only" ? "Registre uniquement" : "Non disponible")
  );

  const terminalCapability = toText(
    flowSummary?.terminalCapability ||
      matchedTimeline[matchedTimeline.length - 1]?.capability ||
      eventSource?.capability ||
      (readingMode === "registry-only" ? "Registre uniquement" : "Non disponible")
  );

  const lastActivityTs = toNumber(
    flowSummary?.lastActivityTs ||
      getLastKnownTimestamp(matchedTimeline) ||
      new Date(eventSource?.processedAt || eventSource?.updatedAt || 0).getTime(),
    0
  );

  const durationMs = toNumber(
    flowSummary?.durationMs || getDurationMs(matchedTimeline),
    0
  );

  const resolvedStatus =
    matchedTimeline.length > 0
      ? resolveFlowStatus(matchedTimeline, flowSummary)
      : toText(flowSummary?.status) || resolveIncidentOnlyStatus(matchedIncidents);

  const title = buildDisplayTitle(
    toText(eventSource?.eventType || ""),
    id,
    flowId,
    rootEventId,
    sourceRecordId
  );

  const displayedSteps =
    toNumber(flowSummary?.steps, 0) > 0
      ? toNumber(flowSummary?.steps, 0)
      : matchedTimeline.length;

  const doneCount = matchedTimeline.filter((item) => item.status === "done").length;
  const runningCount = matchedTimeline.filter((item) => isTimelineRunning(item.status)).length;
  const failedCount = matchedTimeline.filter((item) => isTimelineFailed(item.status)).length;

  const graphCommands = matchedTimeline.map((item) => ({
    id: item.id,
    capability: item.capability,
    status: item.status,
    parent_command_id: item.parentCommandId,
    flow_id: item.flowId || rootEventId || sourceRecordId,
  }));

  const incidentsHref = buildIncidentsHref(flowId, rootEventId, sourceRecordId);
  const eventHref = eventSource?.id
    ? `/events/${encodeURIComponent(eventSource.id)}`
    : rootEventId
      ? `/events/${encodeURIComponent(rootEventId)}`
      : null;

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
            Ce flow est bien présent dans le registre BOSAI, mais aucune chaîne
            complète n’a encore été reconstruite. La page utilise l’event et le
            linked_command comme fallback pour éviter le 404.
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
          <div className="mt-3 text-4xl font-semibold text-emerald-300">{doneCount}</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">En cours / En file</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">{runningCount}</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Échecs</div>
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

      {eventSource ? (
        <section className={cardClassName()}>
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
            Event source
          </div>

          <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <span className="text-zinc-500">Event ID :</span> {eventSource.id}
            </div>
            <div>
              <span className="text-zinc-500">Type :</span> {eventSource.eventType}
            </div>
            <div>
              <span className="text-zinc-500">Capability :</span> {eventSource.capability}
            </div>
            <div>
              <span className="text-zinc-500">Source :</span> {eventSource.source}
            </div>
            <div>
              <span className="text-zinc-500">Linked command :</span>{" "}
              {eventSource.linkedCommandId || "—"}
            </div>
            <div>
              <span className="text-zinc-500">Processed :</span>{" "}
              {formatDate(eventSource.processedAt || eventSource.updatedAt)}
            </div>
          </div>

          {eventHref ? (
            <div className="mt-4">
              <Link href={eventHref} className={actionLinkClassName()}>
                Ouvrir l’event source
              </Link>
            </div>
          ) : null}
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
                        Flow:{" "}
                        <span className="break-all text-zinc-200">
                          {item.flowId || "—"}
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

            {eventHref ? (
              <Link href={eventHref} className={actionLinkClassName()}>
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
