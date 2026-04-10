import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchEvents,
  fetchIncidents,
  fetchRuns,
  type CommandItem,
  type EventItem,
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

type RunRecord = Record<string, unknown>;

function cardClassName(): string {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function softPanelClassName(): string {
  return "rounded-2xl border border-white/10 bg-black/20 p-4";
}

function emptyStateClassName(): string {
  return "rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-sm text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" = "default",
  disabled = false
): string {
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

function pickText(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value, "");
    if (text) return text;
  }
  return "";
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function intersects(left: string[], right: string[]): boolean {
  const set = new Set(left.filter(Boolean));
  return right.some((value) => Boolean(value) && set.has(value));
}

function toNumber(value: unknown, fallback = Number.NaN): number {
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

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
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

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

/* --------------------------------- Run --------------------------------- */

function getRunInputObj(run: RunRecord): Record<string, unknown> {
  return parseMaybeJson(
    run.input ??
      run.Input ??
      run.input_json ??
      run.Input_JSON ??
      run.payload ??
      run.Payload
  );
}

function getRunResultObj(run: RunRecord): Record<string, unknown> {
  return parseMaybeJson(
    run.result ??
      run.Result ??
      run.result_json ??
      run.Result_JSON ??
      run.output ??
      run.Output
  );
}

function getRunRecordId(run: RunRecord): string {
  return pickText(run.id, run.ID, run.record_id, run.Record_ID);
}

function getRunId(run: RunRecord): string {
  return pickText(run.run_id, run.Run_ID, run.runId, run.RunId);
}

function getRunCapability(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.capability,
      run.Capability,
      run.name,
      run.Name,
      input.capability,
      input.Capability,
      result.capability,
      result.Capability
    ) || "Unknown capability"
  );
}

function getRunStatus(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.status,
      run.Status,
      run.status_select,
      run.Status_select,
      result.status,
      result.status_select,
      result.Status_select,
      input.status
    ) || "unknown"
  );
}

function getRunWorker(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.worker,
      run.Worker,
      input.worker,
      input.Worker,
      result.worker,
      result.Worker
    ) || "—"
  );
}

function getRunPriority(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.priority,
      run.Priority,
      run.priority_score,
      run.Priority_Score,
      input.priority,
      input.Priority,
      result.priority,
      result.Priority
    ) || "—"
  );
}

function getRunCreatedAt(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.created_at,
    run.Created_At,
    run.started_at,
    run.Started_At,
    input.created_at,
    input.Created_At,
    result.created_at,
    result.Created_At
  );
}

function getRunStartedAt(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.started_at,
    run.Started_At,
    input.started_at,
    input.Started_At,
    result.started_at,
    result.Started_At
  );
}

function getRunFinishedAt(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.finished_at,
    run.Finished_At,
    input.finished_at,
    input.Finished_At,
    result.finished_at,
    result.Finished_At
  );
}

function getRunWorkspace(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.workspace_id,
      run.Workspace_ID,
      run.workspace,
      run.Workspace,
      input.workspace_id,
      input.workspaceId,
      input.Workspace_ID,
      input.workspace,
      result.workspace_id,
      result.workspaceId,
      result.Workspace_ID,
      result.workspace
    ) || "—"
  );
}

function getRunAppName(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.app_name,
      run.App_Name,
      input.app_name,
      input.appName,
      input.App_Name,
      result.app_name,
      result.appName,
      result.App_Name
    ) || "—"
  );
}

function getRunAppVersion(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.app_version,
      run.App_Version,
      input.app_version,
      input.appVersion,
      input.App_Version,
      result.app_version,
      result.appVersion,
      result.App_Version
    ) || "—"
  );
}

function getRunIdempotencyKey(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    pickText(
      run.idempotency_key,
      run.Idempotency_Key,
      run.idempotencyKey,
      input.idempotency_key,
      input.idempotencyKey,
      input.Idempotency_Key,
      result.idempotency_key,
      result.idempotencyKey,
      result.Idempotency_Key
    ) || "—"
  );
}

function getRunDryRun(run: RunRecord): boolean {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return (
    toBoolean(run.dry_run) ||
    toBoolean(run.Dry_Run) ||
    toBoolean(run.dryRun) ||
    toBoolean(input.dry_run) ||
    toBoolean(input.dryRun) ||
    toBoolean(result.dry_run) ||
    toBoolean(result.dryRun) ||
    false
  );
}

function getRunInput(run: RunRecord): unknown {
  return run.input ?? run.Input ?? run.input_json ?? run.Input_JSON ?? {};
}

function getRunResult(run: RunRecord): unknown {
  return run.result ?? run.Result ?? run.result_json ?? run.Result_JSON ?? {};
}

function getRunDurationMs(run: RunRecord): number {
  const direct =
    toNumber(run.duration_ms) ||
    toNumber(run.Duration_ms) ||
    toNumber(run.durationMs);

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const startedAt = toTs(getRunStartedAt(run));
  const finishedAt = toTs(getRunFinishedAt(run));

  if (startedAt > 0 && finishedAt >= startedAt) {
    return finishedAt - startedAt;
  }

  return 0;
}

function getRunFlowId(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.flow_id,
    run.Flow_ID,
    input.flow_id,
    input.flowId,
    input.Flow_ID,
    result.flow_id,
    result.flowId,
    result.Flow_ID
  );
}

function getRunRootEventId(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.root_event_id,
    run.Root_Event_ID,
    input.root_event_id,
    input.rootEventId,
    input.Root_Event_ID,
    result.root_event_id,
    result.rootEventId,
    result.Root_Event_ID
  );
}

function getRunSourceEventId(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.source_event_id,
    run.Source_Event_ID,
    run.source_record_id,
    run.Source_Record_ID,
    input.source_event_id,
    input.sourceEventId,
    input.Source_Event_ID,
    input.source_record_id,
    input.sourceRecordId,
    input.Source_Record_ID,
    result.source_event_id,
    result.sourceEventId,
    result.Source_Event_ID,
    result.source_record_id,
    result.sourceRecordId,
    result.Source_Record_ID
  );
}

function getRunLinkedCommandId(run: RunRecord): string {
  const input = getRunInputObj(run);
  const result = getRunResultObj(run);

  return pickText(
    run.command_id,
    run.Command_ID,
    run.linked_command,
    run.Linked_Command,
    input.command_id,
    input.commandId,
    input.Command_ID,
    input.linked_command,
    input.Linked_Command,
    result.command_id,
    result.commandId,
    result.Command_ID,
    result.linked_command,
    result.Linked_Command
  );
}

function getRunMatchKeys(run: RunRecord): string[] {
  return uniq([
    getRunRecordId(run),
    getRunId(run),
    getRunFlowId(run),
    getRunRootEventId(run),
    getRunSourceEventId(run),
    getRunLinkedCommandId(run),
  ]);
}

/* ------------------------------- Commands ------------------------------- */

function getCommandId(command: CommandItem): string {
  const record = command as Record<string, unknown>;
  return toText(record.id);
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandRunRecordId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.run_record_id,
    input.run_record_id,
    input.runRecordId,
    result.run_record_id,
    result.runRecordId
  );
}

function getCommandRunId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.linked_run,
    input.run_id,
    input.runId,
    result.run_id,
    result.runId
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.flow_id,
    input.flow_id,
    input.flowId,
    result.flow_id,
    result.flowId
  );
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.root_event_id,
    input.root_event_id,
    input.rootEventId,
    result.root_event_id,
    result.rootEventId
  );
}

function getCommandSourceEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.source_event_id,
    record.Source_Event_ID,
    input.source_event_id,
    input.sourceEventId,
    input.event_id,
    input.eventId,
    result.source_event_id,
    result.sourceEventId,
    result.event_id,
    result.eventId
  );
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    pickText(record.capability, input.capability, result.capability) ||
    "Unknown capability"
  );
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    pickText(record.status, result.status, result.status_select, input.status) ||
    "unknown"
  );
}

function getCommandMatchKeys(command: CommandItem): string[] {
  return uniq([
    getCommandId(command),
    getCommandRunRecordId(command),
    getCommandRunId(command),
    getCommandFlowId(command),
    getCommandRootEventId(command),
    getCommandSourceEventId(command),
  ]);
}

function getCommandUpdatedTs(command: CommandItem): number {
  const record = command as Record<string, unknown>;
  return Math.max(
    toTs(record.finished_at as string | number | null | undefined),
    toTs(record.updated_at as string | number | null | undefined),
    toTs(record.started_at as string | number | null | undefined),
    toTs(record.created_at as string | number | null | undefined)
  );
}

/* -------------------------------- Events -------------------------------- */

function getEventId(event: EventItem): string {
  const record = event as Record<string, unknown>;
  return toText(record.id);
}

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventRunId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(
    record.run_id,
    record.Run_ID,
    payload.run_id,
    payload.runId,
    payload.run_record_id,
    payload.runRecordId
  );
}

function getEventLinkedCommand(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(
    record.command_id,
    record.Command_ID,
    record.linked_command,
    record.Linked_Command,
    payload.command_id,
    payload.commandId
  );
}

function getEventFlowId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(
    record.flow_id,
    payload.flow_id,
    payload.flowId,
    payload.flowid
  );
}

function getEventRootEventId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(record.root_event_id, payload.root_event_id, payload.rootEventId);
}

function getEventSourceRecordId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(
    record.source_record_id,
    record.Source_Record_ID,
    record.source_event_id,
    record.Source_Event_ID,
    payload.source_record_id,
    payload.sourceRecordId,
    payload.source_event_id,
    payload.sourceEventId
  );
}

function getEventCapability(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    pickText(record.mapped_capability, payload.mapped_capability, payload.capability) ||
    "—"
  );
}

function getEventType(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    pickText(record.event_type, record.type, payload.event_type, payload.type) ||
    "Event detail"
  );
}

function getEventStatus(event: EventItem): string {
  const record = event as Record<string, unknown>;
  return toText(record.status) || "unknown";
}

function getEventMatchKeys(event: EventItem): string[] {
  return uniq([
    getEventId(event),
    getEventRunId(event),
    getEventLinkedCommand(event),
    getEventFlowId(event),
    getEventRootEventId(event),
    getEventSourceRecordId(event),
  ]);
}

function getEventUpdatedTs(event: EventItem): number {
  const record = event as Record<string, unknown>;
  return Math.max(
    toTs(record.processed_at as string | number | null | undefined),
    toTs(record.updated_at as string | number | null | undefined),
    toTs(record.created_at as string | number | null | undefined)
  );
}

/* ------------------------------- Incidents ------------------------------- */

function getIncidentId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.id);
}

function getIncidentRunRecordId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.run_record_id);
}

function getIncidentLinkedRun(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.linked_run);
}

function getIncidentRunId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.run_id);
}

function getIncidentCommandId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.command_id);
}

function getIncidentLinkedCommand(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.linked_command);
}

function getIncidentFlowId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.flow_id);
}

function getIncidentRootEventId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.root_event_id);
}

function getIncidentSourceRecordId(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.source_record_id);
}

function getIncidentSlaStatus(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return toText(record.sla_status, "—");
}

function getIncidentStatus(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  const direct = String(record.status || record.statut_incident || "").trim();
  if (direct) return direct;

  const sla = String(record.sla_status || "").trim().toLowerCase();
  const remaining =
    typeof record.sla_remaining_minutes === "number"
      ? record.sla_remaining_minutes
      : undefined;

  if (sla === "breached") return "Open";
  if (remaining !== undefined && remaining < 0) return "Open";

  return "—";
}

function getIncidentTitle(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return (
    pickText(record.title, record.name, record.error_id) || "Untitled incident"
  );
}

function getIncidentMatchKeys(incident: IncidentItem): string[] {
  return uniq([
    getIncidentId(incident),
    getIncidentRunRecordId(incident),
    getIncidentLinkedRun(incident),
    getIncidentRunId(incident),
    getIncidentCommandId(incident),
    getIncidentLinkedCommand(incident),
    getIncidentFlowId(incident),
    getIncidentRootEventId(incident),
    getIncidentSourceRecordId(incident),
  ]);
}

function getIncidentUpdatedTs(incident: IncidentItem): number {
  const record = incident as Record<string, unknown>;
  return Math.max(
    toTs(record.resolved_at as string | number | null | undefined),
    toTs(record.updated_at as string | number | null | undefined),
    toTs(record.opened_at as string | number | null | undefined),
    toTs(record.created_at as string | number | null | undefined)
  );
}

/* -------------------------------- Hrefs -------------------------------- */

function buildFlowHref(
  run: RunRecord,
  relatedCommands: CommandItem[],
  relatedEvents: EventItem[],
  relatedIncidents: IncidentItem[]
): string {
  const direct = pickText(
    getRunFlowId(run),
    getRunRootEventId(run),
    getRunSourceEventId(run)
  );

  if (direct) {
    return `/flows/${encodeURIComponent(direct)}`;
  }

  const fromCommand = pickText(
    ...relatedCommands.flatMap((item) => [
      getCommandFlowId(item),
      getCommandRootEventId(item),
      getCommandSourceEventId(item),
    ])
  );

  if (fromCommand) {
    return `/flows/${encodeURIComponent(fromCommand)}`;
  }

  const fromEvent = pickText(
    ...relatedEvents.flatMap((item) => [
      getEventFlowId(item),
      getEventRootEventId(item),
      getEventSourceRecordId(item),
    ])
  );

  if (fromEvent) {
    return `/flows/${encodeURIComponent(fromEvent)}`;
  }

  const fromIncident = pickText(
    ...relatedIncidents.flatMap((item) => [
      getIncidentFlowId(item),
      getIncidentRootEventId(item),
      getIncidentSourceRecordId(item),
    ])
  );

  if (fromIncident) {
    return `/flows/${encodeURIComponent(fromIncident)}`;
  }

  return "";
}

function buildEventHref(
  run: RunRecord,
  relatedEvents: EventItem[]
): string {
  const relatedId = relatedEvents[0] ? getEventId(relatedEvents[0]) : "";
  if (relatedId) return `/events/${encodeURIComponent(relatedId)}`;

  const fallback = pickText(getRunRootEventId(run), getRunSourceEventId(run));
  if (fallback) return `/events/${encodeURIComponent(fallback)}`;

  return "";
}

function buildCommandHref(
  run: RunRecord,
  relatedCommands: CommandItem[]
): string {
  const relatedId = relatedCommands[0] ? getCommandId(relatedCommands[0]) : "";
  if (relatedId) return `/commands/${encodeURIComponent(relatedId)}`;

  const fallback = getRunLinkedCommandId(run);
  if (fallback) return `/commands/${encodeURIComponent(fallback)}`;

  return "";
}

function buildIncidentHref(relatedIncidents: IncidentItem[]): string {
  const incidentId = relatedIncidents[0] ? getIncidentId(relatedIncidents[0]) : "";
  return incidentId ? `/incidents/${encodeURIComponent(incidentId)}` : "";
}

export default async function RunDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let run: RunRecord | null = null;

  try {
    const runsData = await fetchRuns();
    const runs = Array.isArray(runsData?.runs) ? runsData.runs : [];

    run =
      runs.find((item) => {
        const record = item as RunRecord;
        return getRunRecordId(record) === id || getRunId(record) === id;
      }) || null;
  } catch {
    run = null;
  }

  if (!run) {
    notFound();
  }

  const recordId = getRunRecordId(run);
  const runId = getRunId(run);
  const capability = getRunCapability(run);
  const status = getRunStatus(run);
  const worker = getRunWorker(run);
  const priority = getRunPriority(run);
  const workspace = getRunWorkspace(run);
  const appName = getRunAppName(run);
  const appVersion = getRunAppVersion(run);
  const idempotencyKey = getRunIdempotencyKey(run);
  const dryRun = getRunDryRun(run);
  const createdAt = getRunCreatedAt(run);
  const startedAt = getRunStartedAt(run);
  const finishedAt = getRunFinishedAt(run);
  const durationMs = getRunDurationMs(run);
  const flowId = getRunFlowId(run);
  const rootEventId = getRunRootEventId(run);
  const sourceEventId = getRunSourceEventId(run);
  const linkedCommandId = getRunLinkedCommandId(run);
  const inputJson = stringifyPretty(getRunInput(run));
  const resultJson = stringifyPretty(getRunResult(run));

  const runMatchKeys = getRunMatchKeys(run);

  let relatedCommands: CommandItem[] = [];
  let relatedEvents: EventItem[] = [];
  let relatedIncidents: IncidentItem[] = [];

  try {
    const commandsData = await fetchCommands(500);
    const commands = Array.isArray(commandsData?.commands)
      ? commandsData.commands
      : [];

    relatedCommands = commands
      .filter((command) => {
        const commandKeys = getCommandMatchKeys(command);

        return (
          intersects(runMatchKeys, commandKeys) ||
          (linkedCommandId && getCommandId(command) === linkedCommandId)
        );
      })
      .sort((a, b) => getCommandUpdatedTs(b) - getCommandUpdatedTs(a));
  } catch {
    relatedCommands = [];
  }

  try {
    const eventsData = await fetchEvents(500);
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];
    const relatedCommandIds = uniq(
      relatedCommands.map((item) => getCommandId(item)).filter(Boolean)
    );

    relatedEvents = events
      .filter((event) => {
        const eventKeys = getEventMatchKeys(event);
        const linkedCommand = getEventLinkedCommand(event);

        return (
          intersects(runMatchKeys, eventKeys) ||
          (linkedCommand && relatedCommandIds.includes(linkedCommand))
        );
      })
      .sort((a, b) => getEventUpdatedTs(b) - getEventUpdatedTs(a));
  } catch {
    relatedEvents = [];
  }

  try {
    const incidentsData = await fetchIncidents(300);
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];
    const relatedCommandIds = uniq(
      relatedCommands.map((item) => getCommandId(item)).filter(Boolean)
    );

    relatedIncidents = incidents
      .filter((incident) => {
        const incidentKeys = getIncidentMatchKeys(incident);
        const incidentCommandId = getIncidentCommandId(incident);
        const incidentLinkedCommand = getIncidentLinkedCommand(incident);

        return (
          intersects(runMatchKeys, incidentKeys) ||
          (incidentCommandId && relatedCommandIds.includes(incidentCommandId)) ||
          (incidentLinkedCommand &&
            relatedCommandIds.includes(incidentLinkedCommand))
        );
      })
      .sort((a, b) => getIncidentUpdatedTs(b) - getIncidentUpdatedTs(a));
  } catch {
    relatedIncidents = [];
  }

  const flowHref = buildFlowHref(
    run,
    relatedCommands,
    relatedEvents,
    relatedIncidents
  );
  const eventHref = buildEventHref(run, relatedEvents);
  const commandHref = buildCommandHref(run, relatedCommands);
  const incidentHref = buildIncidentHref(relatedIncidents);

  const hasFlow = flowHref !== "";
  const hasEvent = eventHref !== "";
  const hasCommand = commandHref !== "";
  const hasIncident = incidentHref !== "";

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/runs"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Runs
          </Link>{" "}
          / {capability}
        </div>

        <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {capability}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              status
            )}`}
          >
            {toText(status, "unknown").toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            RUN DETAIL
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {dryRun ? "DRY RUN" : "LIVE"}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(createdAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Started</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(startedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Finished</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(finishedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Duration</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDuration(durationMs)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Run identity</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Record ID:{" "}
            <span className="break-all text-zinc-200">{recordId || "—"}</span>
          </div>
          <div>
            Run ID:{" "}
            <span className="break-all text-zinc-200">{runId || "—"}</span>
          </div>
          <div>
            Capability: <span className="text-zinc-200">{capability}</span>
          </div>
          <div>
            Status: <span className="text-zinc-200">{status || "—"}</span>
          </div>
          <div>
            Worker: <span className="text-zinc-200">{worker}</span>
          </div>
          <div>
            Priority: <span className="text-zinc-200">{priority}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspace}</span>
          </div>
          <div>
            App: <span className="text-zinc-200">{appName}</span>
          </div>
          <div>
            Version: <span className="text-zinc-200">{appVersion}</span>
          </div>
          <div>
            Flow ID: <span className="break-all text-zinc-200">{flowId || "—"}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-200">{rootEventId || "—"}</span>
          </div>
          <div>
            Source event:{" "}
            <span className="break-all text-zinc-200">{sourceEventId || "—"}</span>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            Idempotency key:{" "}
            <span className="break-all text-zinc-200">{idempotencyKey}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related commands</div>

          {relatedCommands.length === 0 ? (
            <div className={emptyStateClassName()}>
              Aucune command liée détectée pour ce run.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedCommands.slice(0, 5).map((command, index) => {
                const commandId = getCommandId(command);

                return (
                  <Link
                    key={commandId || `command-${index}`}
                    href={`/commands/${encodeURIComponent(commandId)}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="break-words text-lg font-semibold text-white">
                        {getCommandCapability(command)}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                          getCommandStatus(command)
                        )}`}
                      >
                        {toText(getCommandStatus(command), "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2">
                      <div>
                        ID:{" "}
                        <span className="break-all text-zinc-200">
                          {commandId || "—"}
                        </span>
                      </div>
                      <div>
                        Flow:{" "}
                        <span className="break-all text-zinc-200">
                          {getCommandFlowId(command) || "—"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related events</div>

          {relatedEvents.length === 0 ? (
            <div className={emptyStateClassName()}>
              Aucun event lié détecté pour ce run.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedEvents.slice(0, 5).map((event, index) => {
                const eventId = getEventId(event);

                return (
                  <Link
                    key={eventId || `event-${index}`}
                    href={`/events/${encodeURIComponent(eventId)}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="break-words text-lg font-semibold text-white">
                        {getEventType(event)}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                          getEventStatus(event)
                        )}`}
                      >
                        {toText(getEventStatus(event), "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2">
                      <div>
                        ID:{" "}
                        <span className="break-all text-zinc-200">
                          {eventId || "—"}
                        </span>
                      </div>
                      <div>
                        Capability:{" "}
                        <span className="break-all text-zinc-200">
                          {getEventCapability(event) || "—"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related incidents</div>

          {relatedIncidents.length === 0 ? (
            <div className={emptyStateClassName()}>
              Aucun incident lié détecté pour ce run.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedIncidents.slice(0, 5).map((incident, index) => {
                const incidentId = getIncidentId(incident);

                return (
                  <Link
                    key={incidentId || `incident-${index}`}
                    href={`/incidents/${encodeURIComponent(incidentId)}`}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="break-words text-lg font-semibold text-white">
                        {getIncidentTitle(incident)}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                          getIncidentStatus(incident)
                        )}`}
                      >
                        {toText(getIncidentStatus(incident), "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2">
                      <div>
                        ID:{" "}
                        <span className="break-all text-zinc-200">
                          {incidentId || "—"}
                        </span>
                      </div>
                      <div>
                        SLA:{" "}
                        <span className="text-zinc-200">
                          {getIncidentSlaStatus(incident)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Input preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{inputJson}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Result preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{resultJson}
          </pre>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xl font-semibold text-white">Résumé rapide</div>

        <div className="space-y-3 text-sm text-zinc-300">
          <div className={softPanelClassName()}>
            <div className="text-zinc-400">Commands détectées</div>
            <div className="mt-2 text-zinc-200">{relatedCommands.length}</div>
          </div>

          <div className={softPanelClassName()}>
            <div className="text-zinc-400">Events détectés</div>
            <div className="mt-2 text-zinc-200">{relatedEvents.length}</div>
          </div>

          <div className={softPanelClassName()}>
            <div className="text-zinc-400">Incidents détectés</div>
            <div className="mt-2 text-zinc-200">{relatedIncidents.length}</div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="flex flex-col gap-3">
          <Link href="/runs" className={actionLinkClassName("default")}>
            Retour à la liste runs
          </Link>

          <Link href="/runs" className={actionLinkClassName("primary")}>
            Voir tous les runs
          </Link>

          {hasFlow ? (
            <Link href={flowHref} className={actionLinkClassName("default")}>
              Ouvrir le flow lié
            </Link>
          ) : (
            <span className={actionLinkClassName("default", true)}>
              Ouvrir le flow lié
            </span>
          )}

          {hasEvent ? (
            <Link href={eventHref} className={actionLinkClassName("default")}>
              Ouvrir l’event lié
            </Link>
          ) : (
            <span className={actionLinkClassName("default", true)}>
              Ouvrir l’event lié
            </span>
          )}

          {hasCommand ? (
            <Link href={commandHref} className={actionLinkClassName("default")}>
              Ouvrir la command liée
            </Link>
          ) : (
            <span className={actionLinkClassName("default", true)}>
              Ouvrir la command liée
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
      </section>
    </div>
  );
}
