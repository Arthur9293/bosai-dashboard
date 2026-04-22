import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchCommandById,
  fetchCommands,
  fetchEvents,
  fetchIncidents,
  type CommandItem,
  type EventItem,
  type IncidentItem,
  type WorkspaceScopeOptions,
} from "@/lib/api";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";

export const dynamic = "force-dynamic";

type SearchParams = {
  workspace_id?: string | string[];
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_event_id?: string | string[];
  from?: string | string[];
};

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
  searchParams?: Promise<SearchParams> | SearchParams;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return "rounded-[28px] border border-white/10 bg-black/20 p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

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
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function neutralPillClassName() {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-zinc-300";
}

function technicalValueClassName() {
  return "break-all [overflow-wrap:anywhere] font-mono text-zinc-200";
}

function metaBoxClassName() {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function payloadPreviewClassName() {
  return "mt-3 max-h-[320px] overflow-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-xs text-zinc-300";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = String(value || "").trim();
    if (text) search.set(key, text);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
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

function toText(value: unknown, fallback = "—"): string {
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

function toTextOrEmpty(value: unknown): string {
  return toText(value, "");
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((value) => set.has(value));
}

function pickBestMatch<T>(items: T[], scorer: (item: T) => number): T | null {
  let bestItem: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const score = scorer(item);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

function compactTechnicalId(value: string, max = 28): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const start = Math.max(10, Math.floor((max - 3) / 2));
  const end = Math.max(6, max - start - 3);

  return `${clean.slice(0, start)}...${clean.slice(-end)}`;
}

function humanStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (
    ["done", "success", "completed", "processed", "resolved"].includes(normalized)
  ) {
    return "Succès";
  }

  if (["running", "processing"].includes(normalized)) {
    return "En cours";
  }

  if (["queued", "queue", "pending", "new"].includes(normalized)) {
    return "En file";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "Retry";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "Échec";
  }

  if (normalized === "ignored") {
    return "Ignorée";
  }

  return normalized ? normalized.toUpperCase() : "UNKNOWN";
}

function getCommandStatusBucketValue(status: string) {
  const normalized = status.trim().toLowerCase();

  if (["queued", "queue", "pending", "new"].includes(normalized)) return "queued";
  if (["running", "processing"].includes(normalized)) return "running";
  if (["retry", "retriable"].includes(normalized)) return "retry";
  if (["error", "failed", "dead", "blocked"].includes(normalized)) return "failed";
  if (
    ["processed", "done", "success", "completed", "resolved"].includes(normalized)
  ) {
    return "done";
  }

  return "other";
}

function getCommandStatusBadgeKind(status: string): DashboardStatusKind {
  const bucket = getCommandStatusBucketValue(status);

  if (bucket === "queued") return "queued";
  if (bucket === "running") return "running";
  if (bucket === "retry") return "retry";
  if (bucket === "failed") return "failed";
  if (bucket === "done") return "success";
  return "unknown";
}

function safeDecodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractCommandsFromResponse(data: unknown): CommandItem[] {
  if (!data || typeof data !== "object") return [];

  const raw = data as Record<string, unknown>;
  const candidates = [
    raw.commands,
    raw.items,
    raw.data,
    raw.results,
    raw.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as CommandItem[];
    }
  }

  return [];
}

/* ----------------------------- Command helpers ---------------------------- */

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.status) ||
    toTextOrEmpty(result.status) ||
    toTextOrEmpty(result.status_select) ||
    toTextOrEmpty(input.status) ||
    "unknown"
  );
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.capability) ||
    toTextOrEmpty(input.capability) ||
    toTextOrEmpty(result.capability) ||
    "unknown_capability"
  );
}

function getCommandWorkspace(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.workspace_id) ||
    toTextOrEmpty(input.workspace_id) ||
    toTextOrEmpty(input.workspaceId) ||
    toTextOrEmpty(input.workspace) ||
    toTextOrEmpty(result.workspace_id) ||
    toTextOrEmpty(result.workspaceId) ||
    toTextOrEmpty(result.workspace) ||
    "—"
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.flow_id) ||
    toTextOrEmpty(input.flow_id) ||
    toTextOrEmpty(input.flowId) ||
    toTextOrEmpty(result.flow_id) ||
    toTextOrEmpty(result.flowId) ||
    ""
  );
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.root_event_id) ||
    toTextOrEmpty(input.root_event_id) ||
    toTextOrEmpty(input.rootEventId) ||
    toTextOrEmpty(result.root_event_id) ||
    toTextOrEmpty(result.rootEventId) ||
    ""
  );
}

function getCommandSourceEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toTextOrEmpty(record.source_event_id) ||
    toTextOrEmpty(record.Source_Event_ID) ||
    toTextOrEmpty(input.source_event_id) ||
    toTextOrEmpty(input.sourceEventId) ||
    toTextOrEmpty(input.event_id) ||
    toTextOrEmpty(input.eventId) ||
    toTextOrEmpty(result.source_event_id) ||
    toTextOrEmpty(result.sourceEventId) ||
    toTextOrEmpty(result.event_id) ||
    toTextOrEmpty(result.eventId) ||
    ""
  );
}

function getCommandRunId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.run_record_id) ||
    toTextOrEmpty(command.linked_run) ||
    toTextOrEmpty(input.run_record_id) ||
    toTextOrEmpty(input.runRecordId) ||
    toTextOrEmpty(input.run_id) ||
    toTextOrEmpty(input.runId) ||
    toTextOrEmpty(input.linked_run) ||
    toTextOrEmpty(result.run_record_id) ||
    toTextOrEmpty(result.runRecordId) ||
    toTextOrEmpty(result.run_id) ||
    toTextOrEmpty(result.runId) ||
    toTextOrEmpty(result.linked_run) ||
    "—"
  );
}

function getCommandParentId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.parent_command_id) ||
    toTextOrEmpty(input.parent_command_id) ||
    toTextOrEmpty(input.parentCommandId) ||
    toTextOrEmpty(result.parent_command_id) ||
    toTextOrEmpty(result.parentCommandId) ||
    ""
  );
}

function getCommandToolKey(command: CommandItem): string {
  return toTextOrEmpty(command.tool_key);
}

function getCommandToolMode(command: CommandItem): string {
  return toTextOrEmpty(command.tool_mode);
}

function getCommandCreatedAt(command: CommandItem): string {
  return toTextOrEmpty(command.created_at);
}

function getCommandUpdatedAt(command: CommandItem): string {
  return toTextOrEmpty(command.updated_at);
}

function getCommandStartedAt(command: CommandItem): string {
  return toTextOrEmpty(command.started_at);
}

function getCommandFinishedAt(command: CommandItem): string {
  return toTextOrEmpty(command.finished_at);
}

function getCommandError(command: CommandItem): string {
  return toTextOrEmpty(command.error);
}

function getCommandTitle(command: CommandItem): string {
  return (
    toTextOrEmpty(command.name) ||
    getCommandCapability(command) ||
    "Command detail"
  );
}

function getCommandSummaryLine(command: CommandItem): string {
  const status = humanStatusLabel(getCommandStatus(command));
  const capability = getCommandCapability(command).replace(/_/g, " ");
  const workspace = getCommandWorkspace(command);

  return `${status} · ${capability} · ${workspace}`;
}

function getCommandCommandCandidates(command: CommandItem): string[] {
  return uniq([String(command.id || ""), getCommandParentId(command)]);
}

function getCommandRouteCandidates(command: CommandItem): string[] {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(command.id),
    toTextOrEmpty(record.command_id),
    toTextOrEmpty(record.Command_ID),
    toTextOrEmpty(record.linked_command),
    toTextOrEmpty(record.Linked_Command),
    toTextOrEmpty(record.record_id),
    toTextOrEmpty(record.Record_ID),
    toTextOrEmpty(input.command_id),
    toTextOrEmpty(input.commandId),
    toTextOrEmpty(input.linked_command),
    toTextOrEmpty(input.linkedCommand),
    toTextOrEmpty(result.command_id),
    toTextOrEmpty(result.commandId),
    toTextOrEmpty(result.linked_command),
    toTextOrEmpty(result.linkedCommand),
  ]);
}

function matchesCommandRouteId(command: CommandItem, candidateId: string): boolean {
  const needle = candidateId.trim();
  if (!needle) return false;
  return getCommandRouteCandidates(command).includes(needle);
}

function getCommandRunCandidates(command: CommandItem): string[] {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return uniq([
    getCommandRunId(command),
    toTextOrEmpty(input.run_record_id),
    toTextOrEmpty(input.runRecordId),
    toTextOrEmpty(input.run_id),
    toTextOrEmpty(input.runId),
    toTextOrEmpty(input.linked_run),
    toTextOrEmpty(result.run_record_id),
    toTextOrEmpty(result.runRecordId),
    toTextOrEmpty(result.run_id),
    toTextOrEmpty(result.runId),
    toTextOrEmpty(result.linked_run),
  ]).filter((value) => value !== "—");
}

function getCommandFlowCandidates(command: CommandItem): string[] {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return uniq([
    getCommandFlowId(command),
    getCommandRootEventId(command),
    getCommandSourceEventId(command),
    toTextOrEmpty(input.flow_id),
    toTextOrEmpty(input.flowId),
    toTextOrEmpty(input.root_event_id),
    toTextOrEmpty(input.rootEventId),
    toTextOrEmpty(input.source_event_id),
    toTextOrEmpty(input.sourceEventId),
    toTextOrEmpty(input.event_id),
    toTextOrEmpty(input.eventId),
    toTextOrEmpty(result.flow_id),
    toTextOrEmpty(result.flowId),
    toTextOrEmpty(result.root_event_id),
    toTextOrEmpty(result.rootEventId),
    toTextOrEmpty(result.source_event_id),
    toTextOrEmpty(result.sourceEventId),
    toTextOrEmpty(result.event_id),
    toTextOrEmpty(result.eventId),
  ]);
}

/* ------------------------------ Event helpers ----------------------------- */

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventWorkspace(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.workspace_id) ||
    toTextOrEmpty(record.Workspace_ID) ||
    toTextOrEmpty(record.workspace) ||
    toTextOrEmpty(payload.workspace_id) ||
    toTextOrEmpty(payload.workspaceId) ||
    toTextOrEmpty(payload.workspace) ||
    ""
  );
}

function getEventCommandCandidates(event: EventItem): string[] {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(event.command_id),
    toTextOrEmpty(record.command_id),
    toTextOrEmpty(record.Command_ID),
    toTextOrEmpty(record.linked_command),
    toTextOrEmpty(record.Linked_Command),
    toTextOrEmpty(payload.command_id),
    toTextOrEmpty(payload.commandId),
    toTextOrEmpty(payload.linked_command),
    toTextOrEmpty(payload.linkedCommand),
    toTextOrEmpty(payload.parent_command_id),
    toTextOrEmpty(payload.parentCommandId),
  ]);
}

function getEventRunCandidates(event: EventItem): string[] {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(record.run_record_id),
    toTextOrEmpty(record.Run_Record_ID),
    toTextOrEmpty(record.linked_run),
    toTextOrEmpty(record.Linked_Run),
    toTextOrEmpty(payload.run_record_id),
    toTextOrEmpty(payload.runRecordId),
    toTextOrEmpty(payload.run_id),
    toTextOrEmpty(payload.runId),
    toTextOrEmpty(payload.linked_run),
    toTextOrEmpty(payload.linkedRun),
  ]);
}

function getEventFlowCandidates(event: EventItem): string[] {
  const payload = getEventPayload(event);

  return uniq([
    toTextOrEmpty(event.id),
    toTextOrEmpty(event.root_event_id),
    toTextOrEmpty(event.source_record_id),
    toTextOrEmpty(event.source_event_id),
    toTextOrEmpty(event.flow_id),
    toTextOrEmpty(payload.root_event_id),
    toTextOrEmpty(payload.rootEventId),
    toTextOrEmpty(payload.source_record_id),
    toTextOrEmpty(payload.sourceRecordId),
    toTextOrEmpty(payload.source_event_id),
    toTextOrEmpty(payload.sourceEventId),
    toTextOrEmpty(payload.event_id),
    toTextOrEmpty(payload.eventId),
    toTextOrEmpty(payload.flow_id),
    toTextOrEmpty(payload.flowId),
  ]);
}

function scoreEventMatch(event: EventItem, command: CommandItem): number {
  let score = 0;

  const commandCommandCandidates = getCommandCommandCandidates(command);
  const commandRunCandidates = getCommandRunCandidates(command);
  const commandFlowCandidates = getCommandFlowCandidates(command);
  const commandWorkspace = getCommandWorkspace(command);

  const eventCommandCandidates = getEventCommandCandidates(event);
  const eventRunCandidates = getEventRunCandidates(event);
  const eventFlowCandidates = getEventFlowCandidates(event);
  const eventWorkspace = getEventWorkspace(event);

  if (
    commandCommandCandidates.length > 0 &&
    eventCommandCandidates.length > 0 &&
    intersects(commandCommandCandidates, eventCommandCandidates)
  ) {
    score += 100;
  }

  if (
    commandRunCandidates.length > 0 &&
    eventRunCandidates.length > 0 &&
    intersects(commandRunCandidates, eventRunCandidates)
  ) {
    score += 70;
  }

  if (
    commandFlowCandidates.length > 0 &&
    eventFlowCandidates.length > 0 &&
    intersects(commandFlowCandidates, eventFlowCandidates)
  ) {
    score += 50;
  }

  if (
    commandWorkspace &&
    commandWorkspace !== "—" &&
    eventWorkspace &&
    eventWorkspace === commandWorkspace
  ) {
    score += 10;
  }

  return score;
}

/* ----------------------------- Incident helpers --------------------------- */

function getIncidentWorkspace(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;

  return (
    toTextOrEmpty(record.workspace_id) ||
    toTextOrEmpty(record.Workspace_ID) ||
    toTextOrEmpty(record.workspace) ||
    toTextOrEmpty(incident.workspace_id) ||
    ""
  );
}

function getIncidentCommandCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.command_id),
    toTextOrEmpty(incident.linked_command),
    toTextOrEmpty(record.command_id),
    toTextOrEmpty(record.Command_ID),
    toTextOrEmpty(record.linked_command),
    toTextOrEmpty(record.Linked_Command),
    toTextOrEmpty(record.parent_command_id),
    toTextOrEmpty(record.Parent_Command_ID),
  ]);
}

function getIncidentRunCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.run_record_id),
    toTextOrEmpty(incident.linked_run),
    toTextOrEmpty(record.run_record_id),
    toTextOrEmpty(record.Run_Record_ID),
    toTextOrEmpty(record.linked_run),
    toTextOrEmpty(record.Linked_Run),
  ]);
}

function getIncidentFlowCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.id),
    toTextOrEmpty(incident.flow_id),
    toTextOrEmpty(incident.root_event_id),
    toTextOrEmpty(record.source_record_id),
    toTextOrEmpty(record.Source_Record_ID),
    toTextOrEmpty(record.source_event_id),
    toTextOrEmpty(record.Source_Event_ID),
    toTextOrEmpty(record.event_id),
    toTextOrEmpty(record.Event_ID),
  ]);
}

function getIncidentRouteCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.id),
    toTextOrEmpty(record.record_id),
    toTextOrEmpty(record.Record_ID),
    toTextOrEmpty(record.incident_id),
    toTextOrEmpty(record.Incident_ID),
    toTextOrEmpty(incident.error_id),
  ]);
}

function getIncidentRouteId(incident: IncidentItem): string {
  const candidates = getIncidentRouteCandidates(incident);
  const recordLike = candidates.find((value) => isRecordIdLike(value));
  if (recordLike) return recordLike;
  return candidates[0] || "";
}

function scoreIncidentMatch(incident: IncidentItem, command: CommandItem): number {
  let score = 0;

  const commandCommandCandidates = getCommandCommandCandidates(command);
  const commandRunCandidates = getCommandRunCandidates(command);
  const commandFlowCandidates = getCommandFlowCandidates(command);
  const commandWorkspace = getCommandWorkspace(command);

  const incidentCommandCandidates = getIncidentCommandCandidates(incident);
  const incidentRunCandidates = getIncidentRunCandidates(incident);
  const incidentFlowCandidates = getIncidentFlowCandidates(incident);
  const incidentWorkspace = getIncidentWorkspace(incident);

  if (
    commandCommandCandidates.length > 0 &&
    incidentCommandCandidates.length > 0 &&
    intersects(commandCommandCandidates, incidentCommandCandidates)
  ) {
    score += 100;
  }

  if (
    commandRunCandidates.length > 0 &&
    incidentRunCandidates.length > 0 &&
    intersects(commandRunCandidates, incidentRunCandidates)
  ) {
    score += 70;
  }

  if (
    commandFlowCandidates.length > 0 &&
    incidentFlowCandidates.length > 0 &&
    intersects(commandFlowCandidates, incidentFlowCandidates)
  ) {
    score += 50;
  }

  if (
    commandWorkspace &&
    commandWorkspace !== "—" &&
    incidentWorkspace &&
    incidentWorkspace === commandWorkspace
  ) {
    score += 10;
  }

  return score;
}

/* ------------------------------- Href helpers ----------------------------- */

function buildFlowHref(command: CommandItem, workspaceId: string): string {
  const flowId = getCommandFlowId(command);
  if (flowId) {
    return buildHref(`/flows/${encodeURIComponent(flowId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  const rootEventId = getCommandRootEventId(command);
  if (rootEventId) {
    return buildHref(`/flows/${encodeURIComponent(rootEventId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  const sourceEventId = getCommandSourceEventId(command);
  if (sourceEventId) {
    return buildHref(`/flows/${encodeURIComponent(sourceEventId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  return "";
}

function buildSafeEventHref(
  matchedEvent: EventItem | null,
  command: CommandItem,
  workspaceId: string
): string {
  if (matchedEvent?.id) {
    return buildHref(`/events/${encodeURIComponent(matchedEvent.id)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  const rootEventId = getCommandRootEventId(command);
  if (rootEventId && isRecordIdLike(rootEventId)) {
    return buildHref(`/events/${encodeURIComponent(rootEventId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  const sourceEventId = getCommandSourceEventId(command);
  if (sourceEventId && isRecordIdLike(sourceEventId)) {
    return buildHref(`/events/${encodeURIComponent(sourceEventId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  return "";
}

function buildIncidentHref(
  matchedIncident: IncidentItem | null,
  workspaceId: string
): string {
  const incidentId = String(matchedIncident?.id || "").trim();
  if (!incidentId) return "";

  return buildHref(`/incidents/${encodeURIComponent(incidentId)}`, {
    workspace_id: workspaceId || undefined,
  });
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
    <div className={breakAll ? "break-all [overflow-wrap:anywhere]" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-3 text-xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}

function DiagnosticMeta({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className={metaLabelClassName()}>{label}</div>
      <div className="break-all [overflow-wrap:anywhere] text-zinc-200">
        {value}
      </div>
    </div>
  );
}

async function tryFetchCommandByIdScoped(
  id: string,
  options?: WorkspaceScopeOptions
): Promise<CommandItem | null> {
  try {
    return await fetchCommandById(id, {
      limit: 500,
      workspaceId: options?.workspaceId,
    });
  } catch {
    return null;
  }
}

export default async function CommandDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const rawId = String(resolvedParams.id || "").trim();
  const id = safeDecodeParam(rawId);

  const activeWorkspaceId = firstParam(resolvedSearchParams.workspace_id).trim();
  const incomingFlowId = firstParam(resolvedSearchParams.flow_id).trim();
  const incomingRootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const incomingSourceEventId = firstParam(
    resolvedSearchParams.source_event_id
  ).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  if (!id) {
    notFound();
  }

  let command: CommandItem | null = null;

  if (activeWorkspaceId) {
    command = await tryFetchCommandByIdScoped(id, {
      workspaceId: activeWorkspaceId,
    });
  } else {
    command = await tryFetchCommandByIdScoped(id);
  }

  if (!command) {
    try {
      const commandsData = await fetchCommands({
        limit: 500,
        workspaceId: activeWorkspaceId || undefined,
      });
      const commands = extractCommandsFromResponse(commandsData);
      command = commands.find((item) => matchesCommandRouteId(item, id)) || null;
    } catch {
      command = null;
    }
  }

  if (!command && !activeWorkspaceId) {
    try {
      const commandsData = await fetchCommands({ limit: 500 });
      const commands = extractCommandsFromResponse(commandsData);
      command = commands.find((item) => matchesCommandRouteId(item, id)) || null;
    } catch {
      command = null;
    }
  }

  if (!command) {
    notFound();
  }

  const title = getCommandTitle(command);
  const status = getCommandStatus(command);
  const capability = getCommandCapability(command).replace(/_/g, " ");
  const workspace = getCommandWorkspace(command);
  const flowId = getCommandFlowId(command);
  const rootEventId = getCommandRootEventId(command);
  const sourceEventId = getCommandSourceEventId(command);
  const runId = getCommandRunId(command);
  const parentId = getCommandParentId(command);
  const errorText = getCommandError(command);
  const toolKey = getCommandToolKey(command);
  const toolMode = getCommandToolMode(command);

  const effectiveWorkspaceId =
    activeWorkspaceId || (workspace !== "—" ? workspace : "");

  let matchedEvent: EventItem | null = null;
  try {
    const eventsData = await fetchEvents({
      limit: 500,
      workspaceId: effectiveWorkspaceId || undefined,
    });
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];
    matchedEvent = pickBestMatch(events, (event) => scoreEventMatch(event, command));
  } catch {
    matchedEvent = null;
  }

  let matchedIncident: IncidentItem | null = null;
  try {
    const incidentsData = await fetchIncidents({
      limit: 300,
      workspaceId: effectiveWorkspaceId || undefined,
    });
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];
    matchedIncident = pickBestMatch(incidents, (incident) =>
      scoreIncidentMatch(incident, command)
    );
  } catch {
    matchedIncident = null;
  }

  const flowHref = buildFlowHref(command, effectiveWorkspaceId);
  const eventHref = buildSafeEventHref(matchedEvent, command, effectiveWorkspaceId);
  const incidentHref = buildIncidentHref(matchedIncident, effectiveWorkspaceId);

  const hasFlow = flowHref !== "";
  const hasEvent = eventHref !== "";
  const hasIncident = incidentHref !== "";

  const commandIdText = String(command.id || "");
  const compactCommandId = compactTechnicalId(commandIdText, 30);
  const flowTarget = flowId || rootEventId || sourceEventId || "—";

  const commandsListHref = buildHref("/commands", {
    workspace_id: effectiveWorkspaceId || undefined,
    flow_id: incomingFlowId || undefined,
    root_event_id: incomingRootEventId || undefined,
    source_event_id: incomingSourceEventId || undefined,
    from: from || undefined,
  });

  const allCommandsHref = buildHref("/commands", {
    workspace_id: effectiveWorkspaceId || undefined,
  });

  return (
    <div className="space-y-8">
      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-base text-zinc-300">
              <Link
                href={commandsListHref}
                className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
              >
                Commands
              </Link>{" "}
              / {title}
            </div>

            <div className={metaLabelClassName()}>Command ID</div>
            <div
              className="break-all [overflow-wrap:anywhere] font-mono text-sm uppercase tracking-[0.18em] text-zinc-500"
              title={commandIdText}
            >
              {compactCommandId}
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="space-y-4">
              <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

              <h1 className="break-words text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {title}
              </h1>

              <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
                Lecture détaillée d’une command BOSAI, avec contexte d’exécution,
                liens de drill-down et previews techniques.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <DashboardStatusBadge
                  kind={getCommandStatusBadgeKind(status)}
                  label={humanStatusLabel(status)}
                />

                <span className={neutralPillClassName()}>{capability}</span>

                {toolKey ? (
                  <span className={neutralPillClassName()}>TOOL {toolKey}</span>
                ) : null}

                {toolMode ? (
                  <span className={neutralPillClassName()}>MODE {toolMode}</span>
                ) : null}

                <span className={neutralPillClassName()}>
                  {effectiveWorkspaceId || workspace}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Created" value={formatDate(getCommandCreatedAt(command))} />
        <StatCard label="Started" value={formatDate(getCommandStartedAt(command))} />
        <StatCard label="Finished" value={formatDate(getCommandFinishedAt(command))} />
        <StatCard label="Updated" value={formatDate(getCommandUpdatedAt(command))} />
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Overview
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Contexte principal, identifiants prioritaires et liaisons utiles de
              cette command.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Status</div>
                <div className="mt-2 text-zinc-100">{status}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Capability</div>
                <div className="mt-2 text-zinc-100">{capability}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Workspace</div>
                <div className="mt-2 text-zinc-100">
                  {effectiveWorkspaceId || workspace}
                </div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Flow</div>
                <div className={`mt-2 ${technicalValueClassName()}`}>
                  {flowId || "—"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
              <MetaItem
                label="Run"
                value={<span className={technicalValueClassName()}>{runId}</span>}
                breakAll
              />
              <MetaItem
                label="Parent"
                value={
                  <span className={technicalValueClassName()}>{parentId || "—"}</span>
                }
                breakAll
              />
              <MetaItem
                label="ID"
                value={<span className={technicalValueClassName()}>{commandIdText}</span>}
                breakAll
              />
              <MetaItem
                label="Root event"
                value={
                  <span className={technicalValueClassName()}>{rootEventId || "—"}</span>
                }
                breakAll
              />
              <MetaItem
                label="Source event"
                value={
                  <span className={technicalValueClassName()}>
                    {sourceEventId || "—"}
                  </span>
                }
                breakAll
              />

              {toolKey || toolMode ? (
                <MetaItem
                  label="Tooling"
                  value={
                    [toolKey ? `key: ${toolKey}` : "", toolMode ? `mode: ${toolMode}` : ""]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  }
                />
              ) : null}

              {errorText ? (
                <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-4">
                  <div className={metaLabelClassName()}>Error</div>
                  <div className="mt-1 break-all [overflow-wrap:anywhere] text-rose-100">
                    {errorText}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Quick actions
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Navigation rapide depuis cette command.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="space-y-3">
              <Link href={commandsListHref} className={actionLinkClassName("soft")}>
                Retour à la liste commands
              </Link>

              <Link href={allCommandsHref} className={actionLinkClassName("primary")}>
                Voir toutes les commands
              </Link>

              {hasFlow ? (
                <Link href={flowHref} className={actionLinkClassName("soft")}>
                  Ouvrir le flow lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir le flow lié
                </span>
              )}

              {hasEvent ? (
                <Link href={eventHref} className={actionLinkClassName("soft")}>
                  Ouvrir l’event source
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir l’event source
                </span>
              )}

              {hasIncident ? (
                <Link href={incidentHref} className={actionLinkClassName("danger")}>
                  Ouvrir l’incident lié
                </Link>
              ) : (
                <span className={actionLinkClassName("danger", true)}>
                  Ouvrir l’incident lié
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Routing diagnostic
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Résumé court du matching autour du flow, de l’event et de
              l’incident.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <DashboardStatusBadge
                  kind={getCommandStatusBadgeKind(status)}
                  label={humanStatusLabel(status).toUpperCase()}
                />
                <DashboardStatusBadge
                  kind={hasFlow ? "success" : "unknown"}
                  label={hasFlow ? "FLOW LINKED" : "NO FLOW LINK"}
                />
                <DashboardStatusBadge
                  kind={hasEvent ? "success" : "unknown"}
                  label={hasEvent ? "EVENT LINKED" : "NO EVENT LINK"}
                />
                <DashboardStatusBadge
                  kind={hasIncident ? "incident" : "unknown"}
                  label={hasIncident ? "INCIDENT LINKED" : "NO INCIDENT LINK"}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <DiagnosticMeta
                  label="Workspace"
                  value={effectiveWorkspaceId || workspace}
                />
                <DiagnosticMeta label="Run" value={runId} />
                <DiagnosticMeta label="Flow target" value={flowTarget} />
                <DiagnosticMeta
                  label="Matched event"
                  value={matchedEvent?.id || "Aucun event lié trouvé"}
                />
                <DiagnosticMeta
                  label="Matched incident"
                  value={matchedIncident?.id || "Aucun incident lié trouvé"}
                />
                <DiagnosticMeta label="Flow href" value={flowHref || "—"} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Technical links
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Contexte technique compact pour vérifier les correspondances et les
              liens calculés.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DiagnosticMeta label="Event href" value={eventHref || "—"} />
              <DiagnosticMeta label="Incident href" value={incidentHref || "—"} />
              <DiagnosticMeta
                label="Matched event ID"
                value={matchedEvent?.id || "Aucun event lié trouvé"}
              />
              <DiagnosticMeta
                label="Matched incident ID"
                value={matchedIncident?.id || "Aucun incident lié trouvé"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Payload previews
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Prévisualisation brute des données d’entrée et du résultat pour debug
              rapide.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5 space-y-6">
            <div>
              <div className={sectionLabelClassName()}>Input preview</div>
              <pre className={payloadPreviewClassName()}>
{stringifyPretty(command.input ?? {})}
              </pre>
            </div>

            <div>
              <div className={sectionLabelClassName()}>Result preview</div>
              <pre className={payloadPreviewClassName()}>
{stringifyPretty(command.result ?? {})}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <p className="max-w-4xl text-base text-zinc-400">
          Les correspondances flow / event / incident sont calculées en best-effort
          à partir des identifiants de command, run, flow et workspace.
        </p>
      </section>
    </div>
  );
}
