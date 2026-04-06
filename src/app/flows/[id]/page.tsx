import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchCommands,
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

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value, "");
    if (text) return text;
  }
  return "";
}

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const text = toText(value, "");
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }

  return output;
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
    ""
  );
}

function getEventWorkspaceId(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.workspace_id) ||
    toText(payload.workspace_id) ||
    toText(payload.workspaceId) ||
    ""
  );
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.flow_id) ||
    toText(input.flow_id) ||
    toText(input.flowId) ||
    toText(result.flow_id) ||
    toText(result.flowId) ||
    ""
  );
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

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.root_event_id) ||
    toText(input.root_event_id) ||
    toText(input.rootEventId) ||
    toText(result.root_event_id) ||
    toText(result.rootEventId) ||
    getCommandSourceEventId(command) ||
    ""
  );
}

function getCommandWorkspaceId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.workspace_id) ||
    toText(input.workspace_id) ||
    toText(input.workspaceId) ||
    toText(result.workspace_id) ||
    toText(result.workspaceId) ||
    ""
  );
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.status) ||
    toText(result.status) ||
    toText(result.status_select) ||
    toText(input.status) ||
    "unknown"
  );
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.capability) ||
    toText(input.capability) ||
    toText(result.capability) ||
    "unknown_capability"
  );
}

function getCommandParentId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.parent_command_id) ||
    toText(input.parent_command_id) ||
    toText(input.parentCommandId) ||
    toText(result.parent_command_id) ||
    toText(result.parentCommandId) ||
    ""
  );
}

function getCommandStepIndex(command: CommandItem): number {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  const value =
    toNumber(command.step_index, Number.NaN) ||
    toNumber(input.step_index, Number.NaN) ||
    toNumber(input.stepIndex, Number.NaN) ||
    toNumber(result.step_index, Number.NaN) ||
    toNumber(result.stepIndex, Number.NaN) ||
    0;

  return Number.isFinite(value) ? value : 0;
}

function commandCandidates(command: CommandItem): string[] {
  return uniqueStrings([
    command.id,
    getCommandFlowId(command),
    getCommandRootEventId(command),
    getCommandSourceEventId(command),
    getCommandParentId(command),
  ]);
}

function eventCandidates(event: EventItem): string[] {
  return uniqueStrings([
    event.id,
    getEventFlowId(event),
    getEventRootEventId(event),
    getEventSourceRecordId(event),
    getEventLinkedCommand(event),
  ]);
}

function incidentCandidates(incident: IncidentItem): string[] {
  return uniqueStrings([
    incident.id,
    incident.flow_id,
    incident.root_event_id,
    incident.source_record_id,
    incident.command_id,
    incident.linked_command,
  ]);
}

function buildCommandStats(
  commands: CommandItem[]
): Record<string, number | undefined> {
  const stats: Record<string, number> = {
    queued: 0,
    running: 0,
    retry: 0,
    done: 0,
    error: 0,
    dead: 0,
    other: 0,
  };

  for (const command of commands) {
    const status = getCommandStatus(command).toLowerCase();

    if (["queue", "queued", "pending", "new"].includes(status)) {
      stats.queued += 1;
    } else if (["running", "processing"].includes(status)) {
      stats.running += 1;
    } else if (["retry", "retriable"].includes(status)) {
      stats.retry += 1;
    } else if (["done", "success", "completed", "processed"].includes(status)) {
      stats.done += 1;
    } else if (["error", "failed", "blocked"].includes(status)) {
      stats.error += 1;
    } else if (["dead"].includes(status)) {
      stats.dead += 1;
    } else {
      stats.other += 1;
    }
  }

  return stats;
}

function dedupeCommands(items: CommandItem[]): CommandItem[] {
  const seen = new Set<string>();
  const output: CommandItem[] = [];

  for (const item of items) {
    const id = toText(item.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(item);
  }

  return output;
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

function normalizeTimelineItem(command: CommandItem): TimelineItem {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return {
    id: toText(command.id),
    capability: getCommandCapability(command),
    status: getCommandStatus(command),
    worker: toText(command.worker) || "—",
    createdAt: toText(command.created_at),
    startedAt: toText(command.started_at),
    finishedAt: toText(command.finished_at),
    stepIndex: getCommandStepIndex(command),
    parentCommandId: getCommandParentId(command),
    flowId: getCommandFlowId(command),
    rootEventId: getCommandRootEventId(command),
    sourceEventId: getCommandSourceEventId(command),
    workspaceId: getCommandWorkspaceId(command) || "production",
    inputJson: stringifyPretty(command.input ?? input ?? {}),
    resultJson: stringifyPretty(command.result ?? result ?? {}),
    isRoot: false,
    isTerminal: false,
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

function getLastKnownTimestamp(items: TimelineItem[]): number {
  const values = items
    .map((item) =>
      new Date(item.finishedAt || item.startedAt || item.createdAt || 0).getTime()
    )
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

function resolveFlowStatus(flow: FlowDetail, items: TimelineItem[]): string {
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
  const candidates = eventCandidates(event);

  if (candidates.some((candidate) => identifiers.includes(candidate))) {
    return true;
  }

  const linkedCommand = getEventLinkedCommand(event);
  if (linkedCommand && linkedCommands.includes(linkedCommand)) {
    return true;
  }

  return false;
}

function buildSyntheticFlowDetailLocal(
  id: string,
  commands: CommandItem[],
  events: EventItem[],
  incidents: IncidentItem[]
): FlowDetail | null {
  const seedIdentifiers = uniqueStrings([id]);
  if (seedIdentifiers.length === 0) return null;

  const matchedEvent =
    events.find((event) => eventCandidates(event).some((c) => seedIdentifiers.includes(c))) ||
    null;

  let identifiers = uniqueStrings([
    ...seedIdentifiers,
    ...(matchedEvent ? eventCandidates(matchedEvent) : []),
  ]);

  let matchedCommands = dedupeCommands(
    commands.filter((command) => {
      const candidates = commandCandidates(command);
      if (candidates.some((candidate) => identifiers.includes(candidate))) {
        return true;
      }

      if (matchedEvent) {
        const linkedCommand = getEventLinkedCommand(matchedEvent);
        if (linkedCommand && linkedCommand === toText(command.id)) {
          return true;
        }
      }

      return false;
    })
  );

  identifiers = uniqueStrings([
    ...identifiers,
    ...matchedCommands.flatMap((command) => commandCandidates(command)),
  ]);

  const matchedIncidents = dedupeIncidents(
    incidents.filter((incident) =>
      incidentCandidates(incident).some((candidate) =>
        identifiers.includes(candidate)
      )
    )
  );

  identifiers = uniqueStrings([
    ...identifiers,
    ...matchedIncidents.flatMap((incident) => incidentCandidates(incident)),
  ]);

  matchedCommands = dedupeCommands([
    ...matchedCommands,
    ...commands.filter((command) =>
      commandCandidates(command).some((candidate) => identifiers.includes(candidate))
    ),
  ]);

  if (!matchedEvent && matchedCommands.length === 0 && matchedIncidents.length === 0) {
    return null;
  }

  const flowId = firstNonEmpty(
    ...matchedCommands.map((command) => getCommandFlowId(command)),
    matchedEvent ? getEventFlowId(matchedEvent) : "",
    ...matchedIncidents.map((incident) => toText(incident.flow_id)),
    !isRecordIdLike(id) ? id : ""
  );

  const rootEventId = firstNonEmpty(
    ...matchedCommands.map((command) => getCommandRootEventId(command)),
    matchedEvent ? getEventRootEventId(matchedEvent) : "",
    ...matchedIncidents.map((incident) => toText(incident.root_event_id)),
    isRecordIdLike(id) ? id : ""
  );

  const sourceRecordId = firstNonEmpty(
    matchedEvent ? getEventSourceRecordId(matchedEvent) : "",
    matchedEvent ? matchedEvent.id : "",
    ...matchedIncidents.map((incident) => toText(incident.source_record_id)),
    ...matchedCommands.map((command) => getCommandSourceEventId(command)),
    rootEventId
  );

  const workspaceId = firstNonEmpty(
    ...matchedCommands.map((command) => getCommandWorkspaceId(command)),
    matchedEvent ? getEventWorkspaceId(matchedEvent) : "",
    ...matchedIncidents.map((incident) => toText(incident.workspace_id)),
    "production"
  );

  return {
    id: sourceRecordId || flowId || rootEventId || id,
    flow_id: flowId || undefined,
    root_event_id: rootEventId || undefined,
    source_record_id: sourceRecordId || undefined,
    source_event_id: sourceRecordId || undefined,
    workspace_id: workspaceId || "production",
    count: matchedCommands.length,
    commands: matchedCommands,
    stats: buildCommandStats(matchedCommands),
    reading_mode: matchedCommands.length > 0 ? "enriched" : "registry-only",
    is_partial: matchedCommands.length === 0,
  };
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

  let directFlow: FlowDetail | null = null;
  let allCommands: CommandItem[] = [];
  let allEvents: EventItem[] = [];
  let allIncidents: IncidentItem[] = [];

  const [flowResult, commandsResult, eventsResult, incidentsResult] =
    await Promise.allSettled([
      fetchFlowById(id),
      fetchCommands(500),
      fetchEvents(500),
      fetchIncidents(300),
    ]);

  if (flowResult.status === "fulfilled") {
    directFlow = flowResult.value;
  }

  if (commandsResult.status === "fulfilled") {
    allCommands = Array.isArray(commandsResult.value?.commands)
      ? commandsResult.value.commands
      : [];
  }

  if (eventsResult.status === "fulfilled") {
    allEvents = Array.isArray(eventsResult.value?.events)
      ? eventsResult.value.events
      : [];
  }

  if (incidentsResult.status === "fulfilled") {
    allIncidents = Array.isArray(incidentsResult.value?.incidents)
      ? incidentsResult.value.incidents
      : [];
  }

  const syntheticFlowFromId = buildSyntheticFlowDetailLocal(
    id,
    allCommands,
    allEvents,
    allIncidents
  );

  let flow: FlowDetail | null = directFlow || syntheticFlowFromId;

  if (!flow) {
    notFound();
  }

  const refinedTarget = firstNonEmpty(
    flow.flow_id,
    flow.root_event_id,
    flow.source_record_id,
    flow.source_event_id,
    id
  );

  const syntheticFlowRefined = buildSyntheticFlowDetailLocal(
    refinedTarget,
    allCommands,
    allEvents,
    allIncidents
  );

  const mergedCommands = dedupeCommands([
    ...(Array.isArray(flow.commands) ? flow.commands : []),
    ...(Array.isArray(syntheticFlowFromId?.commands) ? syntheticFlowFromId?.commands : []),
    ...(Array.isArray(syntheticFlowRefined?.commands) ? syntheticFlowRefined?.commands : []),
  ]);

  const mergedFlowId = firstNonEmpty(
    flow.flow_id,
    syntheticFlowRefined?.flow_id,
    syntheticFlowFromId?.flow_id,
    ...mergedCommands.map((command) => getCommandFlowId(command))
  );

  const mergedRootEventId = firstNonEmpty(
    flow.root_event_id,
    syntheticFlowRefined?.root_event_id,
    syntheticFlowFromId?.root_event_id,
    ...mergedCommands.map((command) => getCommandRootEventId(command))
  );

  const mergedSourceRecordId = firstNonEmpty(
    flow.source_record_id,
    flow.source_event_id,
    syntheticFlowRefined?.source_record_id,
    syntheticFlowFromId?.source_record_id,
    ...mergedCommands.map((command) => getCommandSourceEventId(command)),
    mergedRootEventId
  );

  flow = {
    ...flow,
    flow_id: mergedFlowId || undefined,
    root_event_id: mergedRootEventId || undefined,
    source_record_id: mergedSourceRecordId || undefined,
    source_event_id: mergedSourceRecordId || undefined,
    commands: mergedCommands,
    count: mergedCommands.length > 0 ? mergedCommands.length : flow.count,
    stats:
      mergedCommands.length > 0
        ? buildCommandStats(mergedCommands)
        : flow.stats,
    reading_mode:
      mergedCommands.length > 0
        ? "enriched"
        : flow.reading_mode === "registry-only"
          ? "registry-only"
          : "registry-only",
    is_partial: mergedCommands.length === 0,
  };

  const flowId = toText(flow.flow_id);
  const rootEventId = toText(flow.root_event_id);
  const sourceRecordId =
    toText(flow.source_record_id) || toText(flow.source_event_id) || rootEventId;

  const identifiers = uniqueStrings([
    id,
    flow.id,
    flowId,
    rootEventId,
    sourceRecordId,
    ...mergedCommands.flatMap((command) => commandCandidates(command)),
  ]);

  const linkedCommandIds = uniqueStrings(mergedCommands.map((command) => command.id));

  const sourceEvent =
    allEvents.find((event) => matchEvent(event, identifiers, linkedCommandIds)) ||
    null;

  const timelineBase = mergedCommands.map(normalizeTimelineItem);
  const sortedTimeline = sortTimeline(timelineBase).map((item, index, arr) => ({
    ...item,
    isRoot: index === 0,
    isTerminal: index === arr.length - 1,
  }));

  const incidents = dedupeIncidents(
    allIncidents.filter((incident) =>
      incidentCandidates(incident).some((candidate) => identifiers.includes(candidate))
    )
  );

  const readingMode =
    flow.reading_mode === "registry-only" || sortedTimeline.length === 0
      ? "registry-only"
      : "enriched";

  const isPartial =
    toBoolean(flow.is_partial, false) ||
    readingMode === "registry-only" ||
    sortedTimeline.length === 0;

  const title = buildTitle(flow, sourceEvent, id);
  const resolvedStatus = resolveFlowStatus(flow, sortedTimeline);
  const durationMs = getDurationMs(sortedTimeline);
  const lastActivityTs = getLastKnownTimestamp(sortedTimeline);

  const doneCount = sortedTimeline.filter((item) =>
    ["processed", "done", "success", "completed"].includes(item.status.toLowerCase())
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
    toNumber(flow.count, 0) > 0 ? toNumber(flow.count, 0) : sortedTimeline.length;

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

  const graphCommands = sortedTimeline.map((item) => ({
    id: item.id,
    capability: item.capability,
    status: item.status,
    parent_command_id: item.parentCommandId,
    flow_id: item.flowId || flowId || rootEventId || sourceRecordId || id,
  }));

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

          {isPartial ? (
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300">
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
          <div className={emptyStateClassName()}>
            Graphe indisponible pour ce flow pour le moment.
          </div>
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
              <div className="mt-2 text-zinc-200">
                {graphCommands.length > 0
                  ? "Disponible"
                  : "Indisponible pour ce flow pour le moment."}
              </div>
            </div>

            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Timeline</div>
              <div className="mt-2 text-zinc-200">
                {sortedTimeline.length > 0
                  ? `${sortedTimeline.length} étape${sortedTimeline.length > 1 ? "s" : ""}`
                  : "Aucune étape détaillée disponible."}
              </div>
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
