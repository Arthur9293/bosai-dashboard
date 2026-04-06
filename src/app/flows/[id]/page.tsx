import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchEvents,
  fetchFlowById,
  fetchIncidents,
  type CommandItem,
  type EventItem,
  type FlowDetail,
  type IncidentItem,
} from "@/lib/api";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
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
  sourceEventId: string;
  workspaceId: string;
  inputJson: string;
  resultJson: string;
  isRoot: boolean;
  isTerminal: boolean;
  isSynthetic: boolean;
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
  variant: "default" | "primary" | "danger" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/5 text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15`;
  }

  return `${base} border border-white/10 bg-white/5 text-white hover:bg-white/10`;
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
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
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

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function stringifyPretty(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: String(value) }, null, 2);
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

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function tone(status?: string): string {
  const s = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "processing"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["queued", "pending", "new"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["retry", "retriable"].includes(s)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["ignored"].includes(s)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (["error", "failed", "dead", "blocked", "escalated"].includes(s)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["partial", "unknown"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
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

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventType(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.event_type) ||
    toText(event.type) ||
    toText(payload.event_type) ||
    toText(payload.type) ||
    "Event detail"
  );
}

function getEventStatus(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.status) ||
    toText(payload.status) ||
    toText(payload.status_select) ||
    "unknown"
  );
}

function getEventCapability(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.mapped_capability) ||
    toText(payload.mapped_capability) ||
    toText(payload.capability) ||
    "—"
  );
}

function getEventSource(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return toText(record.source) || toText(payload.source) || "—";
}

function getEventWorkspace(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.workspace_id) ||
    toText(payload.workspace_id) ||
    toText(payload.workspaceId) ||
    ""
  );
}

function getEventFlowId(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.flow_id) ||
    toText(payload.flow_id) ||
    toText(payload.flowId) ||
    toText(payload.flowid) ||
    ""
  );
}

function getEventRootEventId(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.root_event_id) ||
    toText(payload.root_event_id) ||
    toText(payload.rootEventId) ||
    ""
  );
}

function getEventSourceRecordId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toText(event.source_record_id) ||
    toText(event.source_event_id) ||
    toText(record.source_record_id) ||
    toText(record.Source_Record_ID) ||
    toText(record.source_event_id) ||
    toText(record.Source_Event_ID) ||
    toText(payload.source_record_id) ||
    toText(payload.sourceRecordId) ||
    toText(payload.source_event_id) ||
    toText(payload.sourceEventId) ||
    toText(event.id) ||
    ""
  );
}

function getEventCreatedAt(event: EventItem): string {
  const record = event as Record<string, unknown>;
  return toText(event.created_at) || toText(record.Created_At) || "";
}

function getEventUpdatedAt(event: EventItem): string {
  const record = event as Record<string, unknown>;
  return toText(event.updated_at) || toText(record.Updated_At) || "";
}

function getEventProcessedAt(event: EventItem): string {
  return toText(event.processed_at);
}

function getEventLinkedCommand(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toText(event.command_id) ||
    toText(record.command_id) ||
    toText(record.Command_ID) ||
    toText(record.linked_command) ||
    toText(record.Linked_Command) ||
    toText(payload.command_id) ||
    toText(payload.commandId) ||
    ""
  );
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandSourceEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toText(command.source_event_id) ||
    toText(record.source_event_id) ||
    toText(record.Source_Event_ID) ||
    toText(input.source_event_id) ||
    toText(input.sourceEventId) ||
    toText(input.event_id) ||
    toText(input.eventId) ||
    toText(result.source_event_id) ||
    toText(result.sourceEventId) ||
    toText(result.event_id) ||
    toText(result.eventId) ||
    ""
  );
}

function normalizeTimelineItem(command: CommandItem): TimelineItem {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  const id = toText(command.id);
  const capability =
    toText(command.capability) ||
    toText(input.capability) ||
    toText(result.capability) ||
    "unknown_capability";

  const status =
    toText(command.status) ||
    toText(result.status) ||
    toText(result.status_select) ||
    "unknown";

  const flowId =
    toText(command.flow_id) ||
    toText(input.flow_id) ||
    toText(input.flowId) ||
    toText(result.flow_id) ||
    toText(result.flowId) ||
    "";

  const sourceEventId = getCommandSourceEventId(command);

  const rootEventId =
    toText(command.root_event_id) ||
    toText(input.root_event_id) ||
    toText(input.rootEventId) ||
    toText(result.root_event_id) ||
    toText(result.rootEventId) ||
    sourceEventId ||
    "";

  const workspaceId =
    toText(command.workspace_id) ||
    toText(input.workspace_id) ||
    toText(input.workspaceId) ||
    toText(result.workspace_id) ||
    toText(result.workspaceId) ||
    "production";

  const parentCommandId =
    toText(command.parent_command_id) ||
    toText(input.parent_command_id) ||
    toText(input.parentCommandId) ||
    toText(result.parent_command_id) ||
    toText(result.parentCommandId) ||
    "";

  const stepIndex =
    toNumber(command.step_index, Number.NaN) ||
    toNumber(input.step_index, Number.NaN) ||
    toNumber(input.stepIndex, Number.NaN) ||
    toNumber(result.step_index, Number.NaN) ||
    toNumber(result.stepIndex, Number.NaN) ||
    0;

  return {
    id,
    capability,
    status,
    worker: toText(command.worker) || "—",
    createdAt: toText(command.created_at),
    startedAt: toText(command.started_at),
    finishedAt: toText(command.finished_at),
    stepIndex: Number.isFinite(stepIndex) ? stepIndex : 0,
    parentCommandId,
    flowId,
    rootEventId,
    sourceEventId,
    workspaceId,
    inputJson: stringifyPretty(command.input ?? {}),
    resultJson: stringifyPretty(command.result ?? {}),
    isRoot: false,
    isTerminal: false,
    isSynthetic: false,
  };
}

function buildSyntheticTimelineItemFromEvent(
  event: EventItem,
  fallbackFlowId: string,
  fallbackRootEventId: string,
  fallbackSourceRecordId: string
): TimelineItem {
  const processedAt =
    getEventProcessedAt(event) ||
    getEventUpdatedAt(event) ||
    getEventCreatedAt(event);

  const capability =
    getEventCapability(event) !== "—"
      ? getEventCapability(event)
      : getEventType(event);

  return {
    id: getEventLinkedCommand(event) || event.id,
    capability,
    status: getEventStatus(event),
    worker: "—",
    createdAt: getEventCreatedAt(event) || processedAt,
    startedAt: processedAt,
    finishedAt: processedAt,
    stepIndex: 0,
    parentCommandId: "",
    flowId:
      getEventFlowId(event) ||
      fallbackFlowId ||
      getEventRootEventId(event) ||
      fallbackRootEventId ||
      fallbackSourceRecordId ||
      event.id,
    rootEventId:
      getEventRootEventId(event) || fallbackRootEventId || event.id,
    sourceEventId: event.id,
    workspaceId: getEventWorkspace(event) || "production",
    inputJson: stringifyPretty(event.payload ?? {}),
    resultJson: stringifyPretty({
      source: "synthetic_from_event",
      event_id: event.id,
      linked_command: getEventLinkedCommand(event) || null,
      note: "Étape reconstruite depuis l’event source.",
    }),
    isRoot: true,
    isTerminal: true,
    isSynthetic: true,
  };
}

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.stepIndex !== b.stepIndex) {
      return a.stepIndex - b.stepIndex;
    }

    const aTs = new Date(a.startedAt || a.createdAt || 0).getTime();
    const bTs = new Date(b.startedAt || b.createdAt || 0).getTime();

    return aTs - bTs;
  });
}

function getDurationMs(items: TimelineItem[]): number {
  if (items.length === 0) return 0;

  const sorted = sortTimeline(items);

  const firstTs = new Date(
    sorted[0].startedAt || sorted[0].createdAt || 0
  ).getTime();

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

function getLastKnownTimestamp(
  items: TimelineItem[],
  sourceEvent: EventItem | null
): number {
  const values = items
    .map((item) =>
      new Date(item.finishedAt || item.startedAt || item.createdAt || 0).getTime()
    )
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length > 0) {
    return Math.max(...values);
  }

  if (sourceEvent) {
    const fallbackTs = new Date(
      getEventProcessedAt(sourceEvent) ||
        getEventUpdatedAt(sourceEvent) ||
        getEventCreatedAt(sourceEvent) ||
        0
    ).getTime();

    if (Number.isFinite(fallbackTs) && fallbackTs > 0) {
      return fallbackTs;
    }
  }

  return 0;
}

function resolveFlowStatus(
  flow: FlowDetail,
  items: TimelineItem[],
  sourceEvent: EventItem | null
): string {
  const flowStats =
    flow.stats && typeof flow.stats === "object" ? flow.stats : undefined;

  if (
    items.some((item) =>
      ["error", "failed", "dead", "blocked"].includes(item.status.toLowerCase())
    )
  ) {
    return "failed";
  }

  if (
    items.some((item) =>
      ["retry", "retriable"].includes(item.status.toLowerCase())
    )
  ) {
    return "retry";
  }

  if (
    items.some((item) =>
      ["running", "queued", "pending", "processing", "new"].includes(
        item.status.toLowerCase()
      )
    )
  ) {
    return "running";
  }

  if (
    items.length > 0 &&
    items.every((item) =>
      ["processed", "done", "success", "completed"].includes(
        item.status.toLowerCase()
      )
    )
  ) {
    return "processed";
  }

  const sourceStatus = sourceEvent ? getEventStatus(sourceEvent).toLowerCase() : "";

  if (
    ["processed", "done", "success", "completed", "resolved"].includes(
      sourceStatus
    )
  ) {
    return "processed";
  }

  if (["running", "queued", "pending", "processing", "new"].includes(sourceStatus)) {
    return "running";
  }

  if (["retry", "retriable"].includes(sourceStatus)) {
    return "retry";
  }

  if (["error", "failed", "dead", "blocked"].includes(sourceStatus)) {
    return "failed";
  }

  if (flowStats) {
    const running =
      toNumber(flowStats.running, 0) + toNumber(flowStats.queued, 0) > 0;
    const failed =
      toNumber(flowStats.error, 0) + toNumber(flowStats.dead, 0) > 0;
    const retry = toNumber(flowStats.retry, 0) > 0;
    const done = toNumber(flowStats.done, 0) > 0;

    if (failed) return "failed";
    if (retry) return "retry";
    if (running) return "running";
    if (done) return "processed";
  }

  if (flow.reading_mode === "registry-only" || flow.is_partial) {
    return "partial";
  }

  return "unknown";
}

function matchEvent(
  event: EventItem,
  identifiers: string[],
  linkedCommands: string[]
): boolean {
  const payload = getEventPayload(event);

  const candidates = [
    toText(event.id),
    toText(event.root_event_id),
    toText(event.source_record_id),
    toText(event.source_event_id),
    toText(event.flow_id),
    toText(event.command_id),
    toText((event as Record<string, unknown>).linked_command),
    toText(payload.root_event_id),
    toText(payload.rootEventId),
    toText(payload.source_record_id),
    toText(payload.sourceRecordId),
    toText(payload.source_event_id),
    toText(payload.sourceEventId),
    toText(payload.flow_id),
    toText(payload.flowId),
    toText(payload.command_id),
    toText(payload.commandId),
  ].filter(Boolean);

  if (candidates.some((candidate) => identifiers.includes(candidate))) {
    return true;
  }

  if (linkedCommands.length > 0) {
    const linkedCommand = getEventLinkedCommand(event);
    if (linkedCommand && linkedCommands.includes(linkedCommand)) {
      return true;
    }
  }

  return false;
}

function dedupeIncidents(items: IncidentItem[]): IncidentItem[] {
  const seen = new Set<string>();
  const output: IncidentItem[] = [];

  for (const item of items) {
    const id = toText(item.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(item);
  }

  return output;
}

function buildTitle(
  flow: FlowDetail,
  sourceEvent: EventItem | null,
  id: string
): string {
  const flowId = toText(flow.flow_id);

  if (flowId && !isRecordIdLike(flowId)) {
    return flowId;
  }

  const capability = sourceEvent ? getEventCapability(sourceEvent) : "";
  if (capability && capability !== "—") {
    return capability;
  }

  const eventType = sourceEvent ? getEventType(sourceEvent) : "";
  if (eventType && !isRecordIdLike(eventType)) {
    return eventType;
  }

  const sourceRecordId = toText(flow.source_record_id);
  if (sourceRecordId && !isRecordIdLike(sourceRecordId)) {
    return sourceRecordId;
  }

  const rootEventId = toText(flow.root_event_id);
  if (rootEventId && !isRecordIdLike(rootEventId)) {
    return rootEventId;
  }

  return flowId || sourceRecordId || rootEventId || id || "Flow";
}

export default async function FlowDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let flow: FlowDetail | null = null;

  try {
    flow = await fetchFlowById(id);
  } catch {
    flow = null;
  }

  if (!flow) {
    notFound();
  }

  const flowId = toText(flow.flow_id);
  const rootEventId = toText(flow.root_event_id);
  const sourceRecordId =
    toText(flow.source_record_id) || toText(flow.source_event_id) || rootEventId;

  const baseCommands = Array.isArray(flow.commands) ? flow.commands : [];
  const timelineFromCommands = baseCommands.map(normalizeTimelineItem);

  let sourceEvent: EventItem | null = null;

  try {
    const eventsData = await fetchEvents(500);
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

    const identifiers = [id, flowId, rootEventId, sourceRecordId].filter(Boolean);
    const linkedCommands = timelineFromCommands.map((item) => item.id).filter(Boolean);

    sourceEvent =
      events.find((event) => matchEvent(event, identifiers, linkedCommands)) || null;
  } catch {
    sourceEvent = null;
  }

  const syntheticTimeline =
    timelineFromCommands.length === 0 && sourceEvent
      ? [
          buildSyntheticTimelineItemFromEvent(
            sourceEvent,
            flowId,
            rootEventId,
            sourceRecordId
          ),
        ]
      : [];

  const timelineBase =
    timelineFromCommands.length > 0 ? timelineFromCommands : syntheticTimeline;

  const sortedTimeline = sortTimeline(timelineBase).map((item, index, arr) => ({
    ...item,
    isRoot: index === 0,
    isTerminal: index === arr.length - 1,
  }));

  let incidents: IncidentItem[] = [];

  try {
    const incidentsData = await fetchIncidents(300);
    const allIncidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];

    const identifiers = [
      id,
      flowId,
      rootEventId,
      sourceRecordId,
      ...sortedTimeline.map((item) => item.id),
    ].filter(Boolean);

    incidents = dedupeIncidents(
      allIncidents.filter((incident) => {
        const candidates = [
          toText(incident.id),
          toText(incident.flow_id),
          toText(incident.root_event_id),
          toText(incident.source_record_id),
          toText(incident.command_id),
          toText(incident.linked_command),
        ].filter(Boolean);

        return candidates.some((candidate) => identifiers.includes(candidate));
      })
    );
  } catch {
    incidents = [];
  }

  const readingMode =
    flow.reading_mode === "registry-only" ? "registry-only" : "enriched";

  const isPartial =
    toBoolean(flow.is_partial, false) ||
    readingMode === "registry-only" ||
    timelineFromCommands.length === 0;

  const title = buildTitle(flow, sourceEvent, id);
  const resolvedStatus = resolveFlowStatus(flow, sortedTimeline, sourceEvent);
  const durationMs = getDurationMs(sortedTimeline);
  const lastActivityTs = getLastKnownTimestamp(sortedTimeline, sourceEvent);

  const doneCount = sortedTimeline.filter((item) =>
    ["processed", "done", "success", "completed", "resolved"].includes(
      item.status.toLowerCase()
    )
  ).length;

  const runningCount = sortedTimeline.filter((item) =>
    ["running", "queued", "pending", "processing", "new"].includes(
      item.status.toLowerCase()
    )
  ).length;

  const failedCount = sortedTimeline.filter((item) =>
    ["error", "failed", "dead", "blocked"].includes(item.status.toLowerCase())
  ).length;

  const displayedSteps =
    sortedTimeline.length > 0
      ? sortedTimeline.length
      : toNumber(flow.count, 0) > 0
      ? toNumber(flow.count, 0)
      : 0;

  const rootCapability =
    sortedTimeline[0]?.capability ||
    (sourceEvent ? getEventCapability(sourceEvent) : "") ||
    "Non disponible";

  const terminalCapability =
    sortedTimeline[sortedTimeline.length - 1]?.capability ||
    rootCapability ||
    "Non disponible";

  const hasIncident = incidents.length > 0;
  const incidentCount = incidents.length;

  const graphCommands =
    timelineFromCommands.length > 0
      ? sortedTimeline.map((item) => ({
          id: item.id,
          capability: item.capability,
          status: item.status,
          parent_command_id: item.parentCommandId,
          flow_id: item.flowId || flowId || rootEventId || sourceRecordId || id,
        }))
      : [];

  const sourceEventHref = sourceEvent
    ? `/events/${encodeURIComponent(sourceEvent.id)}`
    : rootEventId
    ? `/events/${encodeURIComponent(rootEventId)}`
    : sourceRecordId
    ? `/events/${encodeURIComponent(sourceRecordId)}`
    : "";

  const incidentsHref = (() => {
    const params = new URLSearchParams();

    if (flowId) params.set("flow_id", flowId);
    if (rootEventId) params.set("root_event_id", rootEventId);
    if (sourceRecordId) params.set("source_record_id", sourceRecordId);
    params.set("from", "flow_detail");

    return `/incidents?${params.toString()}`;
  })();

  const modeBadgeLabel =
    readingMode === "registry-only" ? "REGISTRY-ONLY" : isPartial ? "PARTIAL" : "";

  const timelineSummaryLabel =
    sortedTimeline.length > 0
      ? `${sortedTimeline.length} étape${sortedTimeline.length > 1 ? "s" : ""}${
          syntheticTimeline.length > 0 ? " reconstituée" : ""
        }`
      : "Aucune étape détaillée disponible.";

  const graphSummaryLabel =
    graphCommands.length > 0
      ? "Disponible"
      : readingMode === "registry-only"
      ? "Indisponible en lecture registre uniquement."
      : "Indisponible pour ce flow pour le moment.";

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
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              resolvedStatus
            )}`}
          >
            {toText(resolvedStatus, "unknown").toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {displayedSteps > 0
              ? `${displayedSteps} étape${displayedSteps > 1 ? "s" : ""}`
              : "Étapes non chargées"}
          </span>

          {modeBadgeLabel ? (
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300">
              {modeBadgeLabel}
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
      </div>

      {isPartial ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="text-2xl font-semibold text-amber-200">
            Observabilité partielle
          </div>
          <p className="mt-3 text-base leading-7 text-amber-100/85">
            Ce flow est bien présent dans le registre BOSAI, mais aucune chaîne
            complète n’a encore été reconstruite. La page utilise l’event, les
            commands et les incidents comme fallback pour éviter le 404.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Étapes</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {displayedSteps > 0 ? displayedSteps : "—"}
          </div>
          {displayedSteps === 0 ? (
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Identité du flow
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Flow key: <span className="break-all text-zinc-200">{title}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-200">{rootEventId || "—"}</span>
          </div>
          <div>
            Workspace:{" "}
            <span className="text-zinc-200">
              {toText(flow.workspace_id) || "production"}
            </span>
          </div>
          <div>
            Dernière étape:{" "}
            <span className="text-zinc-200">{terminalCapability}</span>
          </div>
          <div>
            Dernière activité:{" "}
            <span className="text-zinc-200">
              {lastActivityTs > 0 ? formatDate(lastActivityTs) : "—"}
            </span>
          </div>
          <div>
            Dernier statut:{" "}
            <span className="text-zinc-200">
              {toText(resolvedStatus, "unknown").toUpperCase()}
            </span>
          </div>

          {sourceRecordId ? (
            <div className="md:col-span-2 xl:col-span-3 break-all">
              Source record: <span className="text-zinc-200">{sourceRecordId}</span>
            </div>
          ) : null}

          <div className="md:col-span-2 xl:col-span-3">
            Type de lecture:{" "}
            <span className="text-zinc-200">
              {readingMode === "registry-only" ? "Registre uniquement" : "Enrichie"}
            </span>
          </div>
        </div>
      </section>

      {sourceEvent ? (
        <section className={cardClassName()}>
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
            Event source
          </div>

          <div className="space-y-4 text-sm text-zinc-400">
            <div>
              Event ID : <span className="break-all text-zinc-200">{sourceEvent.id}</span>
            </div>
            <div>
              Type : <span className="text-zinc-200">{getEventType(sourceEvent)}</span>
            </div>
            <div>
              Capability :{" "}
              <span className="text-zinc-200">{getEventCapability(sourceEvent)}</span>
            </div>
            <div>
              Source : <span className="text-zinc-200">{getEventSource(sourceEvent)}</span>
            </div>
            <div>
              Linked command :{" "}
              <span className="break-all text-zinc-200">
                {getEventLinkedCommand(sourceEvent) || "—"}
              </span>
            </div>
            <div>
              Processed :{" "}
              <span className="text-zinc-200">
                {formatDate(getEventProcessedAt(sourceEvent))}
              </span>
            </div>
          </div>

          {sourceEventHref ? (
            <div className="mt-4">
              <Link href={sourceEventHref} className={actionLinkClassName("default")}>
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
          <div className={emptyStateClassName()}>{graphSummaryLabel}</div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Timeline d’exécution
        </div>

        {sortedTimeline.length === 0 ? (
          <div className={emptyStateClassName()}>
            Aucune étape détaillée disponible pour ce flow.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTimeline.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-xl font-semibold text-white">
                      {item.capability}
                    </h3>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                        item.status
                      )}`}
                    >
                      {toText(item.status, "unknown").toUpperCase()}
                    </span>

                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                      STEP {item.stepIndex}
                    </span>

                    {item.isRoot ? (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                        ROOT
                      </span>
                    ) : null}

                    {item.isTerminal ? (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                        TERMINAL
                      </span>
                    ) : null}

                    {item.isSynthetic ? (
                      <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                        SOURCE EVENT
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
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
                        {item.flowId || flowId || rootEventId || sourceRecordId || "—"}
                      </span>
                    </div>
                  </div>

                  <details className="rounded-xl border border-white/10 bg-black/20">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm text-zinc-300">
                      Voir input / result
                    </summary>

                    <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 xl:grid-cols-2">
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Input
                        </div>
                        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{item.inputJson}
                        </pre>
                      </div>

                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Result
                        </div>
                        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{item.resultJson}
                        </pre>
                      </div>
                    </div>
                  </details>
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
              <div className="mt-2 text-zinc-200">{graphSummaryLabel}</div>
            </div>

            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Timeline</div>
              <div className="mt-2 text-zinc-200">{timelineSummaryLabel}</div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-xl font-semibold text-white">Navigation</div>

          <div className="flex flex-col gap-3">
            <Link href="/flows" className={actionLinkClassName("default")}>
              Retour aux flows
            </Link>

            {hasIncident ? (
              <Link href={incidentsHref} className={actionLinkClassName("danger")}>
                Voir les incidents
              </Link>
            ) : null}

            {sourceEventHref ? (
              <Link href={sourceEventHref} className={actionLinkClassName("default")}>
                Retour à l’event source
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
