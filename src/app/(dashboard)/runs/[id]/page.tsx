import Link from "next/link";
import { cookies } from "next/headers";
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
import {
  ControlPlaneShell,
  EmptyStatePanel,
  SectionCard,
  SectionCountPill,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
import {
  appendWorkspaceIdToHref,
  resolveWorkspaceContext,
  workspaceMatchesOrUnscoped,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

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

type SearchParams = Record<string, string | string[] | undefined>;
type RunRecord = Record<string, unknown>;

type ShellTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

function firstDefined(record: RunRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return undefined;
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

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function intersects(left: string[], right: string[]): boolean {
  const set = new Set(left.filter(Boolean));
  return right.some((value) => Boolean(value) && set.has(value));
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
  } catch {}

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

function makeWrapFriendly(value: string): string {
  return value.replace(/([/_\-.])/g, "$1\u200B");
}

function sectionFrameClassName(
  tone: "default" | "attention" | "neutral" = "default"
): string {
  if (tone === "attention") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  if (tone === "neutral") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.06),transparent_46%),linear-gradient(180deg,rgba(7,18,43,0.68)_0%,rgba(3,8,22,0.54)_100%)]";
  }

  return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function asidePanelClassName(): string {
  return "bg-[radial-gradient(100%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_52%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function metaBoxClassName(): string {
  return "min-w-0 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-white/35";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
): string {
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

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function preClassName(): string {
  return "max-h-[420px] overflow-x-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-zinc-300";
}

function safeResolveRunDetailActiveWorkspaceId(args: {
  searchParams: SearchParams;
  cookieValues: Record<string, string | undefined>;
}): string {
  try {
    return resolveWorkspaceContext(args).activeWorkspaceId || "";
  } catch {
    return "";
  }
}

function extractRunRecordsFromUnknown(payload: unknown): RunRecord[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is RunRecord =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item)
    );
  }

  if (typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.runs,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is RunRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      );
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["runs", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner.filter(
            (item): item is RunRecord =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item)
          );
        }
      }
    }
  }

  return [];
}

function extractCommandItemsFromUnknown(payload: unknown): CommandItem[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.commands,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as CommandItem[];
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["commands", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner as CommandItem[];
        }
      }
    }
  }

  return [];
}

function extractEventItemsFromUnknown(payload: unknown): EventItem[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.events,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as EventItem[];
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["events", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner as EventItem[];
        }
      }
    }
  }

  return [];
}

function extractIncidentItemsFromUnknown(payload: unknown): IncidentItem[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.incidents,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as IncidentItem[];
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["incidents", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner as IncidentItem[];
        }
      }
    }
  }

  return [];
}

/* Run */

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
  return pickText(run.created_at, run.Created_At, run.started_at, run.Started_At);
}

function getRunStartedAt(run: RunRecord): string {
  return pickText(run.started_at, run.Started_At, getRunCreatedAt(run));
}

function getRunFinishedAt(run: RunRecord): string {
  return pickText(run.finished_at, run.Finished_At);
}

function getRunUpdatedAt(run: RunRecord): string {
  return pickText(run.updated_at, run.Updated_At, getRunFinishedAt(run));
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
    ) || ""
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

/* Commands */

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandId(command: CommandItem): string {
  return toText((command as Record<string, unknown>).id);
}

function getCommandRunRecordId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.run_record_id,
    record.Run_Record_ID,
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
    record.Linked_Run,
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
    record.Flow_ID,
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
    record.Root_Event_ID,
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

function getCommandWorkspace(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return pickText(
    record.workspace_id,
    record.Workspace_ID,
    input.workspace_id,
    input.workspaceId,
    result.workspace_id,
    result.workspaceId
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

/* Events */

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventId(event: EventItem): string {
  return toText((event as Record<string, unknown>).id);
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
    record.Flow_ID,
    payload.flow_id,
    payload.flowId,
    payload.flowid
  );
}

function getEventRootEventId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(
    record.root_event_id,
    record.Root_Event_ID,
    payload.root_event_id,
    payload.rootEventId
  );
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
    pickText(
      record.mapped_capability,
      payload.mapped_capability,
      payload.capability
    ) || "—"
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
  return toText((event as Record<string, unknown>).status, "unknown");
}

function getEventWorkspace(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return pickText(
    record.workspace_id,
    record.Workspace_ID,
    payload.workspace_id,
    payload.workspaceId
  );
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

/* Incidents */

function getIncidentId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).id);
}

function getIncidentTitle(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;
  return (
    pickText(record.title, record.name, record.error_id) || "Untitled incident"
  );
}

function getIncidentRunRecordId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).run_record_id);
}

function getIncidentLinkedRun(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).linked_run);
}

function getIncidentRunId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).run_id);
}

function getIncidentCommandId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).command_id);
}

function getIncidentLinkedCommand(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).linked_command);
}

function getIncidentFlowId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).flow_id);
}

function getIncidentRootEventId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).root_event_id);
}

function getIncidentSourceRecordId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).source_record_id);
}

function getIncidentSlaStatus(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).sla_status, "—");
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

function getIncidentWorkspace(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;

  return pickText(
    record.workspace_id,
    record.Workspace_ID,
    record.workspace,
    record.Workspace
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

/* UI helpers */

function statusBadgeKind(status?: string): DashboardStatusKind {
  const s = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(s)) {
    return "success";
  }

  if (["running", "processing"].includes(s)) return "running";
  if (["queued", "pending", "new"].includes(s)) return "queued";
  if (["retry", "retriable"].includes(s)) return "retry";

  if (["error", "failed", "dead", "blocked", "escalated"].includes(s)) {
    return "failed";
  }

  return "unknown";
}

function statusTone(status?: string): ShellTone {
  const s = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(s)) {
    return "success";
  }

  if (["running", "processing"].includes(s)) return "info";
  if (["queued", "pending", "new", "retry", "retriable"].includes(s)) {
    return "warning";
  }

  if (["error", "failed", "dead", "blocked", "escalated"].includes(s)) {
    return "danger";
  }

  return "muted";
}

function InfoBox({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className={metaBoxClassName()}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-zinc-100 ${breakAll ? "break-all" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function RelatedMiniCard({
  title,
  subtitle,
  href,
  status,
}: {
  title: string;
  subtitle: string;
  href: string;
  status: string;
}) {
  const content = (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]">
      <div className="flex flex-wrap items-center gap-2">
        <DashboardStatusBadge
          kind={statusBadgeKind(status)}
          label={toText(status, "unknown").toUpperCase()}
        />
      </div>

      <div className="mt-3 break-words text-base font-semibold leading-6 text-white">
        {title}
      </div>

      <div className="mt-2 break-all text-sm leading-6 text-zinc-400">
        {subtitle || "—"}
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function buildFlowHref(
  run: RunRecord,
  relatedCommands: CommandItem[],
  relatedEvents: EventItem[],
  relatedIncidents: IncidentItem[],
  activeWorkspaceId: string
): string {
  const direct = pickText(
    getRunFlowId(run),
    getRunRootEventId(run),
    getRunSourceEventId(run)
  );

  if (direct) {
    return appendWorkspaceIdToHref(
      `/flows/${encodeURIComponent(direct)}`,
      activeWorkspaceId
    );
  }

  const fromCommand = pickText(
    ...relatedCommands.flatMap((item) => [
      getCommandFlowId(item),
      getCommandRootEventId(item),
      getCommandSourceEventId(item),
    ])
  );

  if (fromCommand) {
    return appendWorkspaceIdToHref(
      `/flows/${encodeURIComponent(fromCommand)}`,
      activeWorkspaceId
    );
  }

  const fromEvent = pickText(
    ...relatedEvents.flatMap((item) => [
      getEventFlowId(item),
      getEventRootEventId(item),
      getEventSourceRecordId(item),
    ])
  );

  if (fromEvent) {
    return appendWorkspaceIdToHref(
      `/flows/${encodeURIComponent(fromEvent)}`,
      activeWorkspaceId
    );
  }

  const fromIncident = pickText(
    ...relatedIncidents.flatMap((item) => [
      getIncidentFlowId(item),
      getIncidentRootEventId(item),
      getIncidentSourceRecordId(item),
    ])
  );

  if (fromIncident) {
    return appendWorkspaceIdToHref(
      `/flows/${encodeURIComponent(fromIncident)}`,
      activeWorkspaceId
    );
  }

  return "";
}

function buildEventHref(
  run: RunRecord,
  relatedEvents: EventItem[],
  activeWorkspaceId: string
): string {
  const relatedId = relatedEvents[0] ? getEventId(relatedEvents[0]) : "";

  if (relatedId) {
    return appendWorkspaceIdToHref(
      `/events/${encodeURIComponent(relatedId)}`,
      activeWorkspaceId
    );
  }

  const fallback = pickText(getRunRootEventId(run), getRunSourceEventId(run));

  if (fallback) {
    return appendWorkspaceIdToHref(
      `/events/${encodeURIComponent(fallback)}`,
      activeWorkspaceId
    );
  }

  return "";
}

function buildCommandHref(
  run: RunRecord,
  relatedCommands: CommandItem[],
  activeWorkspaceId: string
): string {
  const relatedId = relatedCommands[0] ? getCommandId(relatedCommands[0]) : "";

  if (relatedId) {
    return appendWorkspaceIdToHref(
      `/commands/${encodeURIComponent(relatedId)}`,
      activeWorkspaceId
    );
  }

  const fallback = getRunLinkedCommandId(run);

  if (fallback) {
    return appendWorkspaceIdToHref(
      `/commands/${encodeURIComponent(fallback)}`,
      activeWorkspaceId
    );
  }

  return "";
}

function buildIncidentHref(
  relatedIncidents: IncidentItem[],
  activeWorkspaceId: string
): string {
  const incidentId = relatedIncidents[0] ? getIncidentId(relatedIncidents[0]) : "";

  if (!incidentId) return "";

  return appendWorkspaceIdToHref(
    `/incidents/${encodeURIComponent(incidentId)}`,
    activeWorkspaceId
  );
}

export default async function RunDetailPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const id = decodeURIComponent(resolvedParams.id);
  const cookieStore = await cookies();

  const workspace = resolveWorkspaceContext({
    searchParams: resolvedSearchParams,
    cookieValues: {
      bosai_active_workspace_id:
        cookieStore.get("bosai_active_workspace_id")?.value,
      bosai_workspace_id: cookieStore.get("bosai_workspace_id")?.value,
      workspace_id: cookieStore.get("workspace_id")?.value,
      bosai_allowed_workspace_ids:
        cookieStore.get("bosai_allowed_workspace_ids")?.value,
      allowed_workspace_ids:
        cookieStore.get("allowed_workspace_ids")?.value,
    },
  });

  const activeWorkspaceId = workspace.activeWorkspaceId || "";

  let run: RunRecord | null = null;

  try {
    const runsData = await fetchRuns();
    const runs = Array.isArray(runsData?.runs)
      ? (runsData.runs as RunRecord[])
      : [];

    const scopedRuns = runs.filter((item) =>
      workspaceMatchesOrUnscoped(getRunWorkspace(item), activeWorkspaceId)
    );

    run =
      scopedRuns.find(
        (item) => getRunRecordId(item) === id || getRunId(item) === id
      ) || null;
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
  const runWorkspace = getRunWorkspace(run) || activeWorkspaceId || "production";
  const appName = getRunAppName(run);
  const appVersion = getRunAppVersion(run);
  const idempotencyKey = getRunIdempotencyKey(run);
  const dryRun = getRunDryRun(run);
  const createdAt = getRunCreatedAt(run);
  const startedAt = getRunStartedAt(run);
  const finishedAt = getRunFinishedAt(run);
  const updatedAt = getRunUpdatedAt(run);
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
      .filter((command) =>
        workspaceMatchesOrUnscoped(getCommandWorkspace(command), activeWorkspaceId)
      )
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
      .filter((event) =>
        workspaceMatchesOrUnscoped(getEventWorkspace(event), activeWorkspaceId)
      )
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
      .filter((incident) =>
        workspaceMatchesOrUnscoped(
          getIncidentWorkspace(incident),
          activeWorkspaceId
        )
      )
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
    relatedIncidents,
    activeWorkspaceId
  );
  const eventHref = buildEventHref(run, relatedEvents, activeWorkspaceId);
  const commandHref = buildCommandHref(run, relatedCommands, activeWorkspaceId);
  const incidentHref = buildIncidentHref(relatedIncidents, activeWorkspaceId);

  const statusLabel = toText(status, "unknown").toUpperCase();
  const modeLabel = dryRun ? "DRY RUN" : "LIVE";
  const hasLinkedObjects =
    relatedCommands.length > 0 ||
    relatedEvents.length > 0 ||
    relatedIncidents.length > 0;

  const relatedCommandIds = uniq(
    relatedCommands.map((item) => getCommandId(item)).filter(Boolean)
  );
  const relatedEventIds = uniq(
    relatedEvents.map((item) => getEventId(item)).filter(Boolean)
  );
  const relatedIncidentIds = uniq(
    relatedIncidents.map((item) => getIncidentId(item)).filter(Boolean)
  );

  const debugMatchKeys = runMatchKeys.join(" · ") || "—";
  const debugRelatedCommandIds = relatedCommandIds.join(" · ") || "—";
  const debugRelatedEventIds = relatedEventIds.join(" · ") || "—";
  const debugRelatedIncidentIds = relatedIncidentIds.join(" · ") || "—";

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title={makeWrapFriendly(capability)}
      description="Lecture détaillée d’un run BOSAI avec identité, objets liés, payloads techniques et navigation croisée."
      badges={[
        { label: statusLabel, tone: statusTone(status) },
        { label: "RUN DETAIL", tone: "info" },
        { label: modeLabel, tone: dryRun ? "warning" : "success" },
      ]}
      metrics={[
        { label: "Created", value: formatDate(createdAt) },
        { label: "Started", value: formatDate(startedAt) },
        { label: "Finished", value: formatDate(finishedAt) },
        { label: "Duration", value: formatDuration(durationMs) },
      ]}
      actions={
        <>
          <Link
            href={appendWorkspaceIdToHref("/runs", activeWorkspaceId)}
            className={actionLinkClassName("soft")}
          >
            Retour aux runs
          </Link>

          {flowHref ? (
            <Link href={flowHref} className={actionLinkClassName("soft")}>
              Ouvrir le flow lié
            </Link>
          ) : null}

          {commandHref ? (
            <Link href={commandHref} className={actionLinkClassName("primary")}>
              Ouvrir la command liée
            </Link>
          ) : null}

          {incidentHref ? (
            <Link href={incidentHref} className={actionLinkClassName("danger")}>
              Ouvrir l’incident lié
            </Link>
          ) : null}
        </>
      }
      aside={
        <div className="hidden xl:block xl:space-y-6">
          <SidePanelCard title="Signal run" className={asidePanelClassName()}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={statusBadgeKind(status)}
                  label={statusLabel}
                />
                <DashboardStatusBadge
                  kind={dryRun ? "retry" : "success"}
                  label={modeLabel}
                />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Workspace :{" "}
                  <span className="text-white/90">{runWorkspace}</span>
                </div>
                <div>
                  Worker : <span className="text-white/90">{worker}</span>
                </div>
                <div>
                  Priority : <span className="text-white/90">{priority}</span>
                </div>
                <div>
                  Run ID :{" "}
                  <span className="break-all text-white/90">
                    {runId || "—"}
                  </span>
                </div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Navigation" className={asidePanelClassName()}>
            <div className="space-y-3">
              <Link
                href={appendWorkspaceIdToHref("/runs", activeWorkspaceId)}
                className={actionLinkClassName("soft")}
              >
                Retour aux runs
              </Link>

              {flowHref ? (
                <Link href={flowHref} className={actionLinkClassName("soft")}>
                  Ouvrir le flow lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir le flow lié
                </span>
              )}

              {eventHref ? (
                <Link href={eventHref} className={actionLinkClassName("soft")}>
                  Ouvrir l’event lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir l’event lié
                </span>
              )}

              {commandHref ? (
                <Link href={commandHref} className={actionLinkClassName("primary")}>
                  Ouvrir la command liée
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir la command liée
                </span>
              )}

              {incidentHref ? (
                <Link href={incidentHref} className={actionLinkClassName("danger")}>
                  Ouvrir l’incident lié
                </Link>
              ) : (
                <span className={actionLinkClassName("danger", true)}>
                  Ouvrir l’incident lié
                </span>
              )}
            </div>
          </SidePanelCard>
        </div>
      }
    >
      <SectionCard
        title="Signal run"
        description="Lecture rapide du statut, du mode et du contexte d’exécution."
        className={sectionFrameClassName("default")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Status" value={statusLabel} />
          <InfoBox label="Mode" value={modeLabel} />
          <InfoBox label="Priority" value={priority} />
          <InfoBox label="Workspace" value={runWorkspace} />
        </div>
      </SectionCard>

      <SectionCard
        title="Debug matching"
        description="Bloc temporaire pour vérifier comment le run essaie de retrouver commands, events, incidents et flow liés."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoBox label="Active workspace" value={activeWorkspaceId || "—"} />
          <InfoBox label="Run record ID" value={recordId || "—"} breakAll />
          <InfoBox label="Run ID" value={runId || "—"} breakAll />
          <InfoBox label="Flow ID" value={flowId || "—"} breakAll />
          <InfoBox label="Root event ID" value={rootEventId || "—"} breakAll />
          <InfoBox label="Source event ID" value={sourceEventId || "—"} breakAll />
          <InfoBox
            label="Linked command ID"
            value={linkedCommandId || "—"}
            breakAll
          />
          <InfoBox
            label="Related commands found"
            value={String(relatedCommands.length)}
          />
          <InfoBox
            label="Related events found"
            value={String(relatedEvents.length)}
          />
          <InfoBox
            label="Related incidents found"
            value={String(relatedIncidents.length)}
          />
          <InfoBox label="Flow href" value={flowHref || "—"} breakAll />
          <InfoBox label="Command href" value={commandHref || "—"} breakAll />
          <InfoBox label="Event href" value={eventHref || "—"} breakAll />
          <InfoBox label="Incident href" value={incidentHref || "—"} breakAll />
          <div className="md:col-span-2 xl:col-span-3">
            <InfoBox label="Run match keys" value={debugMatchKeys} breakAll />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <InfoBox
              label="Related command IDs"
              value={debugRelatedCommandIds}
              breakAll
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <InfoBox
              label="Related event IDs"
              value={debugRelatedEventIds}
              breakAll
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <InfoBox
              label="Related incident IDs"
              value={debugRelatedIncidentIds}
              breakAll
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Run identity"
        description="Identifiants et contexte principal de l’exécution."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoBox label="Record ID" value={recordId || "—"} breakAll />
          <InfoBox label="Run ID" value={runId || "—"} breakAll />
          <InfoBox label="Capability" value={capability} />
          <InfoBox label="Worker" value={worker} />
          <InfoBox label="App" value={appName} />
          <InfoBox label="Version" value={appVersion} />
          <InfoBox label="Flow ID" value={flowId || "—"} breakAll />
          <InfoBox label="Root event" value={rootEventId || "—"} breakAll />
          <InfoBox label="Source event" value={sourceEventId || "—"} breakAll />
          <div className="md:col-span-2 xl:col-span-3">
            <InfoBox
              label="Idempotency key"
              value={idempotencyKey}
              breakAll
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Objets liés"
        description="Commands, events et incidents détectés autour de ce run."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
      >
        <div className="space-y-7">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                Related commands
              </h3>
              <SectionCountPill value={relatedCommands.length} tone="info" />
            </div>

            {relatedCommands.length === 0 ? (
              <EmptyStatePanel
                title="Aucune command liée"
                description="Aucune command liée détectée pour ce run."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {relatedCommands.slice(0, 6).map((command, index) => {
                  const commandId = getCommandId(command);

                  return (
                    <RelatedMiniCard
                      key={commandId || `command-${index}`}
                      title={getCommandCapability(command)}
                      subtitle={commandId || "—"}
                      status={getCommandStatus(command)}
                      href={
                        commandId
                          ? appendWorkspaceIdToHref(
                              `/commands/${encodeURIComponent(commandId)}`,
                              activeWorkspaceId
                            )
                          : ""
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                Related events
              </h3>
              <SectionCountPill value={relatedEvents.length} tone="info" />
            </div>

            {relatedEvents.length === 0 ? (
              <EmptyStatePanel
                title="Aucun event lié"
                description="Aucun event lié détecté pour ce run."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {relatedEvents.slice(0, 6).map((event, index) => {
                  const eventId = getEventId(event);

                  return (
                    <RelatedMiniCard
                      key={eventId || `event-${index}`}
                      title={getEventType(event)}
                      subtitle={eventId || getEventCapability(event) || "—"}
                      status={getEventStatus(event)}
                      href={
                        eventId
                          ? appendWorkspaceIdToHref(
                              `/events/${encodeURIComponent(eventId)}`,
                              activeWorkspaceId
                            )
                          : ""
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                Related incidents
              </h3>
              <SectionCountPill
                value={relatedIncidents.length}
                tone={relatedIncidents.length > 0 ? "danger" : "muted"}
              />
            </div>

            {relatedIncidents.length === 0 ? (
              <EmptyStatePanel
                title="Aucun incident lié"
                description="Aucun incident lié détecté pour ce run."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {relatedIncidents.slice(0, 6).map((incident, index) => {
                  const incidentId = getIncidentId(incident);

                  return (
                    <RelatedMiniCard
                      key={incidentId || `incident-${index}`}
                      title={getIncidentTitle(incident)}
                      subtitle={incidentId || getIncidentSlaStatus(incident)}
                      status={getIncidentStatus(incident)}
                      href={
                        incidentId
                          ? appendWorkspaceIdToHref(
                              `/incidents/${encodeURIComponent(incidentId)}`,
                              activeWorkspaceId
                            )
                          : ""
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Résumé rapide"
        description="Compteurs de liaison détectés autour du run."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoBox
            label="Commands détectées"
            value={String(relatedCommands.length)}
          />
          <InfoBox label="Events détectés" value={String(relatedEvents.length)} />
          <InfoBox
            label="Incidents détectés"
            value={String(relatedIncidents.length)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Input preview"
        description="Aperçu technique conservé pour diagnostic sans casser la lecture opérationnelle."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
      >
        <pre className={preClassName()}>{inputJson}</pre>
      </SectionCard>

      <SectionCard
        title="Result preview"
        description="Aperçu technique conservé pour diagnostic sans casser la lecture opérationnelle."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
      >
        <pre className={preClassName()}>{resultJson}</pre>
      </SectionCard>

      {!hasLinkedObjects ? (
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-5 md:p-6">
          <h3 className="text-xl font-semibold text-white">
            Aucun objet lié détecté
          </h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Le run est lisible, mais aucun flow, event, command ou incident lié
            n’a été reconstruit pour le moment.
          </p>
        </div>
      ) : null}
    </ControlPlaneShell>
  );
}
