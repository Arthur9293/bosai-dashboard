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
  syntheticSource?: "event";
};

function cardClassName() {
  return "rounded-[28px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(6,18,45,0.78)_0%,rgba(4,10,26,0.64)_100%)] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaBoxClassName() {
  return "rounded-[20px] border border-cyan-500/10 bg-[linear-gradient(180deg,rgba(8,20,48,0.72)_0%,rgba(3,9,24,0.55)_100%)] px-4 py-4";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function blueSectionClassName() {
  return "bg-[radial-gradient(80%_120%_at_100%_0%,rgba(14,165,233,0.10),transparent_58%),linear-gradient(180deg,rgba(7,18,43,0.62)_0%,rgba(3,8,22,0.50)_100%)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
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

function flowStatusBadgeKind(status?: string): DashboardStatusKind {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "success";
  }

  if (["running", "processing"].includes(normalized)) {
    return "running";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return "queued";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "retry";
  }

  if (["error", "failed", "dead", "blocked", "escalated"].includes(normalized)) {
    return "failed";
  }

  if (["partial"].includes(normalized)) {
    return "retry";
  }

  return "unknown";
}

function flowStatusLabel(status?: string): string {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "PROCESSED";
  }

  if (["running", "processing"].includes(normalized)) {
    return "RUNNING";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return "QUEUED";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "RETRY";
  }

  if (["error", "failed", "dead", "blocked", "escalated"].includes(normalized)) {
    return "FAILED";
  }

  if (["partial"].includes(normalized)) {
    return "PARTIAL";
  }

  return normalized ? normalized.toUpperCase() : "UNKNOWN";
}

function flowStatusTone(status?: string):
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted" {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "success";
  }

  if (["running", "processing"].includes(normalized)) {
    return "info";
  }

  if (["queued", "pending", "new", "retry", "retriable", "partial"].includes(normalized)) {
    return "warning";
  }

  if (["error", "failed", "dead", "blocked", "escalated"].includes(normalized)) {
    return "danger";
  }

  return "muted";
}

function modeTone(mode: "registry-only" | "enriched"):
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted" {
  return mode === "registry-only" ? "warning" : "info";
}

function incidentTone(hasIncident: boolean):
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted" {
  return hasIncident ? "danger" : "muted";
}

function incidentLabel(count: number, hasIncident: boolean) {
  if (!hasIncident || count <= 0) return "NO INCIDENT";
  if (count === 1) return "1 INCIDENT";
  return `${count} INCIDENTS`;
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

function getEventStatus(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.status) ||
    toText(payload.status) ||
    toText(payload.status_select) ||
    "unknown"
  );
}

function getEventProcessedAt(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toText(event.processed_at) ||
    toText(record.Processed_At) ||
    toText(event.updated_at) ||
    toText(record.Updated_At) ||
    toText(event.created_at) ||
    toText(record.Created_At) ||
    toText(payload.processed_at) ||
    ""
  );
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
    toText(event.id) ||
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

function getEventWorkspaceId(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.workspace_id) ||
    toText(payload.workspace_id) ||
    toText(payload.workspaceId) ||
    "production"
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
  const record = command as Record<string, unknown>;

  return (
    toText(command.flow_id) ||
    toText(record.flow_id) ||
    toText(record.Flow_ID) ||
    toText(input.flow_id) ||
    toText(input.flowId) ||
    toText(input.flowid) ||
    toText(result.flow_id) ||
    toText(result.FlowId) ||
    toText(result.flowId) ||
    toText(result.flowid) ||
    ""
  );
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toText(command.root_event_id) ||
    toText(record.root_event_id) ||
    toText(record.Root_Event_ID) ||
    toText(input.root_event_id) ||
    toText(input.rootEventId) ||
    toText(input.rooteventid) ||
    toText(result.root_event_id) ||
    toText(result.rootEventId) ||
    toText(result.rooteventid) ||
    getCommandSourceEventId(command) ||
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
    toText(input.sourceeventid) ||
    toText(input.event_id) ||
    toText(input.eventId) ||
    toText(input.eventid) ||
    toText(result.source_event_id) ||
    toText(result.sourceEventId) ||
    toText(result.sourceeventid) ||
    toText(result.event_id) ||
    toText(result.eventId) ||
    toText(result.eventid) ||
    ""
  );
}

function getCommandWorkspaceId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toText(command.workspace_id) ||
    toText(record.workspace_id) ||
    toText(record.Workspace_ID) ||
    toText(input.workspace_id) ||
    toText(input.workspaceId) ||
    toText(input.workspaceid) ||
    toText(input.workspace) ||
    toText(result.workspace_id) ||
    toText(result.workspaceId) ||
    toText(result.workspaceid) ||
    toText(result.workspace) ||
    ""
  );
}

function getCommandStepIndex(command: CommandItem): number {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  const candidates: unknown[] = [
    command.step_index,
    input.step_index,
    input.stepIndex,
    input.stepindex,
    result.step_index,
    result.stepIndex,
    result.stepindex,
  ];

  for (const candidate of candidates) {
    const parsed = toNumber(candidate, Number.NaN);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function matchCommand(command: CommandItem, identifiers: string[]): boolean {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  const candidates = [
    toText(command.id),
    toText(command.flow_id),
    toText(command.root_event_id),
    toText(command.source_event_id),
    toText(record.id),
    toText(record.flow_id),
    toText(record.Flow_ID),
    toText(record.root_event_id),
    toText(record.Root_Event_ID),
    toText(record.source_event_id),
    toText(record.Source_Event_ID),
    toText(record.source_record_id),
    toText(record.Source_Record_ID),
    toText(input.flow_id),
    toText(input.flowId),
    toText(input.flowid),
    toText(input.root_event_id),
    toText(input.rootEventId),
    toText(input.rooteventid),
    toText(input.source_event_id),
    toText(input.sourceEventId),
    toText(input.sourceeventid),
    toText(input.source_record_id),
    toText(input.sourceRecordId),
    toText(input.event_id),
    toText(input.eventId),
    toText(input.eventid),
    toText(result.flow_id),
    toText(result.flowId),
    toText(result.flowid),
    toText(result.root_event_id),
    toText(result.rootEventId),
    toText(result.rooteventid),
    toText(result.source_event_id),
    toText(result.sourceEventId),
    toText(result.sourceeventid),
    toText(result.source_record_id),
    toText(result.sourceRecordId),
    toText(result.event_id),
    toText(result.eventId),
    toText(result.eventid),
  ].filter(Boolean);

  return candidates.some((candidate) => identifiers.includes(candidate));
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

  const flowId = getCommandFlowId(command);
  const sourceEventId = getCommandSourceEventId(command);
  const rootEventId = getCommandRootEventId(command);
  const workspaceId = getCommandWorkspaceId(command) || "production";

  const parentCommandId =
    toText(command.parent_command_id) ||
    toText(input.parent_command_id) ||
    toText(input.parentCommandId) ||
    toText(result.parent_command_id) ||
    toText(result.parentCommandId) ||
    "";

  return {
    id,
    capability,
    status,
    worker: toText(command.worker) || "—",
    createdAt: toText(command.created_at),
    startedAt: toText(command.started_at),
    finishedAt: toText(command.finished_at),
    stepIndex: getCommandStepIndex(command),
    parentCommandId,
    flowId,
    rootEventId,
    sourceEventId,
    workspaceId,
    inputJson: stringifyPretty(command.input ?? {}),
    resultJson: stringifyPretty(command.result ?? {}),
    isRoot: false,
    isTerminal: false,
  };
}

function buildSyntheticTimelineItemFromEvent(
  event: EventItem,
  flow: FlowDetail,
  fallbackId: string
): TimelineItem {
  const processedAt = getEventProcessedAt(event);
  const linkedCommand = getEventLinkedCommand(event);

  const flowId =
    toText(flow.flow_id) ||
    getEventFlowId(event) ||
    getEventRootEventId(event) ||
    getEventSourceRecordId(event) ||
    fallbackId;

  const rootEventId =
    toText(flow.root_event_id) ||
    getEventRootEventId(event) ||
    getEventSourceRecordId(event) ||
    fallbackId;

  const sourceEventId = getEventSourceRecordId(event) || getEventRootEventId(event);

  return {
    id: linkedCommand || toText(event.id) || fallbackId,
    capability: getEventCapability(event) || getEventType(event) || "event_source",
    status: getEventStatus(event) || "processed",
    worker: "—",
    createdAt: processedAt,
    startedAt: processedAt,
    finishedAt: processedAt,
    stepIndex: 0,
    parentCommandId: "",
    flowId,
    rootEventId,
    sourceEventId,
    workspaceId: toText(flow.workspace_id) || getEventWorkspaceId(event) || "production",
    inputJson: stringifyPretty(event.payload ?? {}),
    resultJson: stringifyPretty({
      source: "synthetic_from_event",
      event_id: event.id,
      linked_command: linkedCommand || null,
      note: "Étape reconstituée depuis l’event source pour éviter le 404.",
    }),
    isRoot: false,
    isTerminal: false,
    syntheticSource: "event",
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
    const ts = new Date(getEventProcessedAt(sourceEvent) || 0).getTime();
    if (Number.isFinite(ts) && ts > 0) {
      return ts;
    }
  }

  return 0;
}

function resolveFlowStatus(
  flow: FlowDetail,
  items: TimelineItem[],
  sourceEvent: EventItem | null
): string {
  if (
    items.some((item) =>
      ["error", "failed", "dead", "blocked"].includes(item.status.toLowerCase())
    )
  ) {
    return "failed";
  }

  if (items.some((item) => ["retry", "retriable"].includes(item.status.toLowerCase()))) {
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
      ["processed", "done", "success", "completed"].includes(item.status.toLowerCase())
    )
  ) {
    return "processed";
  }

  if (sourceEvent) {
    const sourceStatus = getEventStatus(sourceEvent).toLowerCase();

    if (["processed", "done", "success", "completed"].includes(sourceStatus)) {
      return "processed";
    }

    if (["running", "queued", "pending", "processing", "new"].includes(sourceStatus)) {
      return "running";
    }

    if (["error", "failed", "dead", "blocked"].includes(sourceStatus)) {
      return "failed";
    }

    if (["retry", "retriable"].includes(sourceStatus)) {
      return "retry";
    }
  }

  const flowStats =
    flow.stats && typeof flow.stats === "object" ? flow.stats : undefined;

  if (flowStats) {
    const running = toNumber(flowStats.running, 0) + toNumber(flowStats.queued, 0) > 0;
    const failed = toNumber(flowStats.error, 0) + toNumber(flowStats.dead, 0) > 0;
    const retry = toNumber(flowStats.retry, 0) > 0;
    const done = toNumber(flowStats.done, 0) > 0;

    if (failed) return "failed";
    if (retry) return "retry";
    if (running) return "running";
    if (done) return "processed";
  }

  if (flow.reading_mode === "registry-only" || toBoolean(flow.is_partial, false)) {
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

function buildTitle(flow: FlowDetail, sourceEvent: EventItem | null, id: string): string {
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

function formatTitleSegment(segment: string): string {
  const lower = segment.trim().toLowerCase();

  if (!lower) return "";
  if (lower === "http") return "HTTP";

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function buildHeroTitle(flow: FlowDetail, sourceEvent: EventItem | null, id: string): string {
  const rawTitle = buildTitle(flow, sourceEvent, id).trim();

  if (!rawTitle) return "Flow";

  const normalized = rawTitle.replace(/^flow[_\-. ]*/i, "");
  const parts = normalized
    .split(/[_\-. ]+/)
    .map(formatTitleSegment)
    .filter(Boolean);

  if (parts.length === 0) return "Flow";
  return `Flow · ${parts.join(" · ")}`;
}

function makeWrapFriendlyTitle(value: string): string {
  return value.replace(/([/_\-.])/g, "$1\u200B");
}

function buildSafeEventHref(sourceEvent: EventItem | null): string {
  if (!sourceEvent?.id) {
    return "";
  }

  return `/events/${encodeURIComponent(sourceEvent.id)}`;
}

function TimelineCard({
  item,
  resolvedFlowId,
}: {
  item: TimelineItem;
  resolvedFlowId: string;
}) {
  return (
    <article
      id={`cmd-${item.id}`}
      className={`${cardClassName()} min-w-0 scroll-mt-24 overflow-hidden`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words text-xl font-semibold text-white [overflow-wrap:anywhere]">
            {item.capability}
          </h3>

          <DashboardStatusBadge
            kind={flowStatusBadgeKind(item.status)}
            label={flowStatusLabel(item.status)}
          />

          <DashboardStatusBadge kind="queued" label={`STEP ${item.stepIndex}`} />

          {item.isRoot ? <DashboardStatusBadge kind="unknown" label="ROOT" /> : null}
          {item.isTerminal ? <DashboardStatusBadge kind="unknown" label="TERMINAL" /> : null}
          {item.syntheticSource === "event" ? (
            <DashboardStatusBadge kind="retry" label="SOURCE EVENT" />
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Started</div>
            <div className="mt-2 text-zinc-100">
              {formatDate(item.startedAt || item.createdAt)}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Finished</div>
            <div className="mt-2 text-zinc-100">{formatDate(item.finishedAt)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Worker</div>
            <div className="mt-2 text-zinc-100">{item.worker || "—"}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-2 break-all text-zinc-100">
              {item.flowId || resolvedFlowId || "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <div className={metaLabelClassName()}>Command ID</div>
            <div className="mt-1 break-all text-zinc-200">{item.id || "—"}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Parent</div>
            <div className="mt-1 break-all text-zinc-200">{item.parentCommandId || "—"}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Root event</div>
            <div className="mt-1 break-all text-zinc-200">{item.rootEventId || "—"}</div>
          </div>
        </div>

        <details className="rounded-[20px] border border-white/10 bg-black/20">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-zinc-300">
            Voir input / result
          </summary>

          <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 xl:grid-cols-2">
            <div>
              <div className={metaLabelClassName()}>Input</div>
              <pre className="mt-2 overflow-x-auto rounded-[16px] border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{item.inputJson}
              </pre>
            </div>

            <div>
              <div className={metaLabelClassName()}>Result</div>
              <pre className="mt-2 overflow-x-auto rounded-[16px] border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{item.resultJson}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </article>
  );
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

  let discoveredCommands: CommandItem[] = [];

  try {
    const commandsData = await fetchCommands(500);
    const allCommands = Array.isArray((commandsData as { commands?: CommandItem[] })?.commands)
      ? ((commandsData as { commands?: CommandItem[] }).commands as CommandItem[])
      : Array.isArray(commandsData)
        ? (commandsData as CommandItem[])
        : [];

    const identifiers = [id, flowId, rootEventId, sourceRecordId].filter(Boolean);

    discoveredCommands = dedupeCommands(
      allCommands.filter((command) => matchCommand(command, identifiers))
    );
  } catch {
    discoveredCommands = [];
  }

  const mergedCommands = dedupeCommands([...baseCommands, ...discoveredCommands]);
  const timelineBase = mergedCommands.map(normalizeTimelineItem);

  let sourceEvent: EventItem | null = null;

  try {
    const eventsData = await fetchEvents(500);
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

    const identifiers = [id, flowId, rootEventId, sourceRecordId].filter(Boolean);
    const linkedCommands = mergedCommands.map((item) => toText(item.id)).filter(Boolean);

    sourceEvent =
      events.find((event) => matchEvent(event, identifiers, linkedCommands)) || null;
  } catch {
    sourceEvent = null;
  }

  const reconstructedTimeline =
    timelineBase.length === 0 && sourceEvent
      ? [buildSyntheticTimelineItemFromEvent(sourceEvent, flow, id)]
      : [];

  const sortedTimeline = sortTimeline([...timelineBase, ...reconstructedTimeline]).map(
    (item, index, arr) => ({
      ...item,
      isRoot: index === 0,
      isTerminal: index === arr.length - 1,
    })
  );

  const resolvedFlowId =
    sortedTimeline[0]?.flowId ||
    flowId ||
    (sourceEvent ? getEventFlowId(sourceEvent) : "") ||
    rootEventId ||
    sourceRecordId ||
    id;

  const resolvedRootEventId =
    sortedTimeline[0]?.rootEventId ||
    rootEventId ||
    (sourceEvent ? getEventRootEventId(sourceEvent) : "") ||
    sourceRecordId ||
    resolvedFlowId ||
    id;

  const resolvedSourceRecordId =
    sourceRecordId ||
    (sourceEvent ? getEventSourceRecordId(sourceEvent) : "") ||
    resolvedRootEventId ||
    resolvedFlowId ||
    id;

  const resolvedWorkspaceId =
    sortedTimeline.find((item) => toText(item.workspaceId))?.workspaceId ||
    (sourceEvent ? getEventWorkspaceId(sourceEvent) : "") ||
    toText(flow.workspace_id) ||
    "production";

  let incidents: IncidentItem[] = [];

  try {
    const incidentsData = await fetchIncidents(300);
    const allIncidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];

    const identifiers = [
      id,
      resolvedFlowId,
      resolvedRootEventId,
      resolvedSourceRecordId,
      sourceEvent ? getEventLinkedCommand(sourceEvent) : "",
      ...mergedCommands.map((command) => toText(command.id)),
    ].filter(Boolean);

    incidents = dedupeIncidents(
      allIncidents.filter((incident) => {
        const candidates = [
          toText(incident.id),
          toText(incident.flow_id),
          toText(incident.root_event_id),
          toText((incident as Record<string, unknown>).source_record_id),
          toText(incident.command_id),
          toText(incident.linked_command),
        ].filter(Boolean);

        return candidates.some((candidate) => identifiers.includes(candidate));
      })
    );
  } catch {
    incidents = [];
  }

  const hasDetailedCommands = mergedCommands.length > 0;
  const readingMode: "registry-only" | "enriched" = hasDetailedCommands
    ? "enriched"
    : "registry-only";

  const isPartialObservability = !hasDetailedCommands;

  const title = makeWrapFriendlyTitle(buildHeroTitle(flow, sourceEvent, id));
  const resolvedStatus = resolveFlowStatus(flow, sortedTimeline, sourceEvent);
  const durationMs = getDurationMs(sortedTimeline);
  const lastActivityTs = getLastKnownTimestamp(sortedTimeline, sourceEvent);

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

  const displayedSteps = sortedTimeline.length;

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

  const graphCommands = hasDetailedCommands
    ? sortedTimeline.map((item) => ({
        id: item.id,
        capability: item.capability,
        status: item.status,
        parent_command_id: item.parentCommandId,
        flow_id: item.flowId || resolvedFlowId,
      }))
    : [];

  const sourceEventHref = buildSafeEventHref(sourceEvent);

  const incidentsHref = (() => {
    const params = new URLSearchParams();

    if (resolvedFlowId) params.set("flow_id", resolvedFlowId);
    if (resolvedRootEventId) params.set("root_event_id", resolvedRootEventId);
    if (resolvedSourceRecordId) params.set("source_record_id", resolvedSourceRecordId);
    params.set("from", "flow_detail");

    return `/incidents?${params.toString()}`;
  })();

  const timelineSummaryText =
    sortedTimeline.length === 0
      ? "Aucune étape détaillée disponible."
      : readingMode === "registry-only"
        ? `${sortedTimeline.length} étape${sortedTimeline.length > 1 ? "s" : ""} reconstituée${sortedTimeline.length > 1 ? "s" : ""}`
        : `${sortedTimeline.length} étape${sortedTimeline.length > 1 ? "s" : ""}`;

  const graphSummaryText =
    readingMode === "registry-only"
      ? "Indisponible en lecture registre uniquement."
      : graphCommands.length > 0
        ? "Disponible"
        : "Indisponible pour ce flow pour le moment.";

  return (
    <ControlPlaneShell
      className="relative"
      eyebrow="BOSAI Control Plane"
      title={title}
      description="Lecture détaillée d’un flow BOSAI avec timeline, graphe d’exécution, objets liés et fallback registre si nécessaire."
      badges={[
        {
          label: flowStatusLabel(resolvedStatus),
          tone: flowStatusTone(resolvedStatus),
        },
        {
          label: readingMode === "registry-only" ? "REGISTRY-ONLY" : "ENRICHED",
          tone: modeTone(readingMode),
        },
        {
          label: incidentLabel(incidentCount, hasIncident),
          tone: incidentTone(hasIncident),
        },
      ]}
      metrics={[
        { label: "Étapes", value: displayedSteps, toneClass: "text-white" },
        { label: "Terminées", value: doneCount, toneClass: "text-emerald-300" },
        { label: "En cours", value: runningCount, toneClass: "text-sky-300" },
        { label: "Échecs", value: failedCount, toneClass: "text-rose-300" },
      ]}
      actions={
        <>
          <Link href="/flows" className={actionLinkClassName("soft")}>
            Retour aux flows
          </Link>

          {sourceEventHref ? (
            <Link href={sourceEventHref} className={actionLinkClassName("soft")}>
              Retour à l’event source
            </Link>
          ) : null}

          {hasIncident ? (
            <Link href={incidentsHref} className={actionLinkClassName("danger")}>
              Voir les incidents
            </Link>
          ) : null}
        </>
      }
      aside={
        <div className="hidden xl:block xl:space-y-6">
          <SidePanelCard title="Lecture flow">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={flowStatusBadgeKind(resolvedStatus)}
                  label={flowStatusLabel(resolvedStatus)}
                />
                <DashboardStatusBadge
                  kind={readingMode === "registry-only" ? "retry" : "running"}
                  label={readingMode === "registry-only" ? "REGISTRY-ONLY" : "ENRICHED"}
                />
                <DashboardStatusBadge
                  kind={hasIncident ? "incident" : "unknown"}
                  label={incidentLabel(incidentCount, hasIncident)}
                />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Workspace : <span className="text-white/90">{resolvedWorkspaceId}</span>
                </div>
                <div>
                  Root :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(resolvedRootEventId || "—")}
                  </span>
                </div>
                <div>
                  Dernière activité :{" "}
                  <span className="text-white/90">
                    {lastActivityTs > 0 ? formatDate(lastActivityTs) : "—"}
                  </span>
                </div>
                <div>
                  Durée : <span className="text-white/90">{formatDuration(durationMs)}</span>
                </div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Résumé rapide">
            <div className="space-y-3 text-sm leading-6 text-white/65">
              <div>
                Timeline : <span className="text-white/90">{timelineSummaryText}</span>
              </div>
              <div>
                Graphe : <span className="text-white/90">{graphSummaryText}</span>
              </div>
              <div>
                Racine : <span className="text-white/90">{rootCapability}</span>
              </div>
              <div>
                Terminal : <span className="text-white/90">{terminalCapability}</span>
              </div>
            </div>
          </SidePanelCard>
        </div>
      }
    >
      {isPartialObservability ? (
        <SectionCard
          title="Observabilité partielle"
          description="Ce flow est présent dans le registre BOSAI mais sa chaîne détaillée n’a pas encore été complètement reconstruite."
          tone="attention"
        >
          <div className="space-y-3 text-sm leading-6 text-zinc-300">
            <p>
              La page utilise l’event source, les commands et les incidents comme fallback
              pour éviter le 404 et préserver la navigation.
            </p>
            <p>
              Dès qu’une chaîne complète sera disponible, cette vue passera
              automatiquement en mode enrichi.
            </p>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Overview"
        description="Identité principale du flow, contexte d’exécution et statut de lecture."
        action={<SectionCountPill value={displayedSteps} tone="info" />}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Durée</div>
            <div className="mt-2 text-zinc-100">{formatDuration(durationMs)}</div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Dernière activité</div>
            <div className="mt-2 text-zinc-100">
              {lastActivityTs > 0 ? formatDate(lastActivityTs) : "—"}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Workspace</div>
            <div className="mt-2 text-zinc-100">{resolvedWorkspaceId}</div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Mode</div>
            <div className="mt-2 text-zinc-100">
              {readingMode === "registry-only" ? "Registre uniquement" : "Enrichi"}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <div className={metaLabelClassName()}>Flow key</div>
            <div className="mt-1 break-all text-zinc-200">{resolvedFlowId}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Root event</div>
            <div className="mt-1 break-all text-zinc-200">{resolvedRootEventId || "—"}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Source record</div>
            <div className="mt-1 break-all text-zinc-200">{resolvedSourceRecordId || "—"}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Capacité racine</div>
            <div className="mt-1 text-zinc-200">{rootCapability}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Capacité terminale</div>
            <div className="mt-1 text-zinc-200">{terminalCapability}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Dernier statut</div>
            <div className="mt-1 text-zinc-200">{flowStatusLabel(resolvedStatus)}</div>
          </div>
        </div>
      </SectionCard>

      {sourceEvent ? (
        <SectionCard
          title="Event source"
          description="Event d’origine utilisé pour ancrer la lecture du flow et ses liens de navigation."
          tone="neutral"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Type</div>
              <div className="mt-2 text-zinc-100">{getEventType(sourceEvent)}</div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Capability</div>
              <div className="mt-2 text-zinc-100">{getEventCapability(sourceEvent)}</div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Processed</div>
              <div className="mt-2 text-zinc-100">
                {formatDate(getEventProcessedAt(sourceEvent))}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Linked command</div>
              <div className="mt-2 break-all text-zinc-100">
                {getEventLinkedCommand(sourceEvent) || "—"}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              <div className={metaLabelClassName()}>Event ID</div>
              <div className="mt-1 break-all text-zinc-200">{sourceEvent.id}</div>
            </div>

            <div>
              <div className={metaLabelClassName()}>Source</div>
              <div className="mt-1 text-zinc-200">{getEventSource(sourceEvent)}</div>
            </div>
          </div>

          {sourceEventHref ? (
            <div className="mt-5">
              <Link href={sourceEventHref} className={actionLinkClassName("soft")}>
                Ouvrir l’event source
              </Link>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Graphe d’exécution"
        description="Lecture visuelle du flow. Touchez un nœud pour retrouver l’étape dans la timeline."
        action={<SectionCountPill value={graphCommands.length} tone="info" />}
        className={blueSectionClassName()}
      >
        {graphCommands.length > 0 ? (
          <FlowGraphClient commands={graphCommands} />
        ) : (
          <EmptyStatePanel
            title="Graphe indisponible"
            description={graphSummaryText}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Timeline d’exécution"
        description="Étapes ordonnées du flow, avec statut, parentage et payloads techniques."
        action={<SectionCountPill value={sortedTimeline.length} tone="info" />}
        className={blueSectionClassName()}
      >
        {sortedTimeline.length === 0 ? (
          <EmptyStatePanel
            title="Aucune étape détaillée"
            description="Aucune command n’a été reconstituée pour ce flow pour le moment."
          />
        ) : (
          <div className="space-y-4">
            {sortedTimeline.map((item) => (
              <TimelineCard
                key={`${item.id}-${item.stepIndex}`}
                item={item}
                resolvedFlowId={resolvedFlowId}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <div className="hidden xl:block">
        <SectionCard
          title="Résumé pipeline"
          description="Cibles BOSAI utiles et objets liés pour la navigation croisée."
          tone="neutral"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Flow target</div>
              <div className="mt-2 break-all text-zinc-100">{resolvedFlowId}</div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Root event</div>
              <div className="mt-2 break-all text-zinc-100">
                {resolvedRootEventId || "—"}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Source record</div>
              <div className="mt-2 break-all text-zinc-100">
                {resolvedSourceRecordId || "—"}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Incidents</div>
              <div className="mt-2 text-zinc-100">{incidentLabel(incidentCount, hasIncident)}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="hidden xl:block">
        <SectionCard
          title="Navigation"
          description="Navigation croisée depuis ce flow vers les objets liés."
          tone="neutral"
        >
          <div className="flex flex-col gap-3">
            <Link href="/flows" className={actionLinkClassName("soft")}>
              Retour aux flows
            </Link>

            {hasIncident ? (
              <Link href={incidentsHref} className={actionLinkClassName("danger")}>
                Voir les incidents
              </Link>
            ) : (
              <span className={actionLinkClassName("danger", true)}>
                Voir les incidents
              </span>
            )}

            {sourceEventHref ? (
              <Link href={sourceEventHref} className={actionLinkClassName("soft")}>
                Ouvrir l’event source
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir l’event source
              </span>
            )}
          </div>
        </SectionCard>
      </div>
    </ControlPlaneShell>
  );
}
