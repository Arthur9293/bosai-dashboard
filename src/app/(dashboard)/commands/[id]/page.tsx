import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchIncidents,
  type CommandItem,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const clean = text(value);
    if (clean) return clean;
  }

  return "";
}

function uniqueTexts(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => text(v)).filter(Boolean)));
}

function flattenTextValues(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const clean = text(value);
    return clean ? [clean] : [];
  }

  if (Array.isArray(value)) {
    return uniqueTexts(value.flatMap((item) => flattenTextValues(item)));
  }

  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;

    return uniqueTexts([
      ...flattenTextValues(rec.id),
      ...flattenTextValues(rec.recordId),
      ...flattenTextValues(rec.record_id),
      ...flattenTextValues(rec.value),
      ...flattenTextValues(rec.name),
      ...flattenTextValues(rec.text),
      ...flattenTextValues(rec.label),
    ]);
  }

  return [];
}

function recordTexts(obj: unknown, keys: string[]): string[] {
  const rec = asRecord(obj);
  return uniqueTexts(keys.flatMap((key) => flattenTextValues(rec[key])));
}

function recordText(obj: unknown, keys: string[]): string {
  return recordTexts(obj, keys)[0] || "";
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
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
    } catch {}
  }

  return {};
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function getSearchText(
  searchParams: Record<string, string | string[] | undefined>,
  keys: string[]
): string {
  for (const key of keys) {
    const raw = searchParams[key];
    if (typeof raw === "string") {
      const clean = raw.trim();
      if (clean) return clean;
    }

    if (Array.isArray(raw)) {
      const clean = raw.map((v) => v.trim()).find(Boolean);
      if (clean) return clean;
    }
  }

  return "";
}

function formatDate(value?: string | number | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function toTs(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function formatDuration(ms?: number) {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  const rec = asRecord(command);

  return (
    parseJsonRecord(rec.input) ||
    parseJsonRecord(rec.input_json) ||
    parseJsonRecord(rec.payload_json) ||
    parseJsonRecord(rec.command_input_json) ||
    {}
  );
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  const rec = asRecord(command);

  return (
    parseJsonRecord(rec.result) ||
    parseJsonRecord(rec.result_json) ||
    parseJsonRecord(rec.output_json) ||
    {}
  );
}

function getCommandTitle(command: CommandItem) {
  const rec = asRecord(command);

  return (
    firstText(
      rec.name,
      rec.capability,
      rec.command_name,
      rec.command_id,
      rec.id
    ) || "Untitled command"
  );
}

function getCommandStatusRaw(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.status, rec.status_select);
}

function getCommandStatusNormalized(command: CommandItem) {
  const raw = getCommandStatusRaw(command).toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(raw)) return "done";
  if (["running", "in_progress"].includes(raw)) return "running";
  if (["queued", "queue", "pending"].includes(raw)) return "queued";
  if (["retry"].includes(raw)) return "retry";
  if (["error", "failed", "dead", "blocked", "unsupported"].includes(raw)) {
    return raw;
  }

  return raw || "unknown";
}

function getCommandStatusLabel(command: CommandItem) {
  return getCommandStatusNormalized(command).toUpperCase();
}

function statusTone(command: CommandItem) {
  const status = getCommandStatusNormalized(command);

  if (status === "done") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (status === "queued") {
    return "bg-zinc-800 text-zinc-300 border border-zinc-700";
  }

  if (status === "retry") {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["error", "failed", "dead", "blocked", "unsupported"].includes(status)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getCreatedAt(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.created_at, rec.createdAt);
}

function getStartedAt(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.started_at, rec.startedAt, rec.created_at);
}

function getFinishedAt(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.finished_at, rec.finishedAt, rec.updated_at);
}

function getDurationMs(command: CommandItem) {
  const rec = asRecord(command);

  const explicit =
    typeof rec.duration_ms === "number"
      ? rec.duration_ms
      : typeof rec.durationMs === "number"
      ? rec.durationMs
      : undefined;

  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return explicit;
  }

  const start = toTs(getStartedAt(command));
  const end = toTs(getFinishedAt(command));

  if (start > 0 && end > 0 && end >= start) {
    return end - start;
  }

  return 0;
}

function getWorkspaceId(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    firstText(
      rec.workspace_id,
      rec.workspaceId,
      rec.workspace,
      input.workspace_id,
      input.workspaceId,
      input.workspace,
      result.workspace_id,
      result.workspaceId,
      result.workspace
    ) || "production"
  );
}

function getWorker(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.worker, rec.worker_id, rec.workerId) || "—";
}

function getRecordId(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.id) || "—";
}

function getCommandPublicId(command: CommandItem) {
  const rec = asRecord(command);
  return firstText(rec.command_id, rec.commandId, rec.Command_ID) || "—";
}

function getRetryCount(command: CommandItem) {
  const rec = asRecord(command);

  const raw =
    typeof rec.retry_count === "number"
      ? rec.retry_count
      : typeof rec.retryCount === "number"
      ? rec.retryCount
      : typeof rec.retry_count === "string"
      ? Number(rec.retry_count)
      : typeof rec.retryCount === "string"
      ? Number(rec.retryCount)
      : 0;

  return Number.isFinite(raw) ? raw : 0;
}

function getParentCommand(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInput(command);

  return (
    firstText(
      rec.parent_command_id,
      rec.parentCommandId,
      rec.parent_id,
      input.parent_command_id,
      input.parentCommandId,
      input.parent_id
    ) || "—"
  );
}

function getRunRecord(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    firstText(
      rec.run_record_id,
      rec.runRecordId,
      rec.linked_run,
      rec.run_id,
      input.run_record_id,
      input.runRecordId,
      input.linked_run,
      input.run_id,
      result.run_record_id,
      result.runRecordId,
      result.linked_run,
      result.run_id
    ) || "—"
  );
}

function getLastError(command: CommandItem) {
  const rec = asRecord(command);
  const result = getCommandResult(command);

  return (
    firstText(
      rec.last_error,
      rec.lastError,
      result.last_error,
      result.lastError,
      result.error,
      result.reason
    ) || "—"
  );
}

function getFlowId(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    firstText(
      rec.flow_id,
      rec.flowId,
      input.flow_id,
      input.flowId,
      result.flow_id,
      result.flowId
    ) || ""
  );
}

function getRootEventId(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    firstText(
      rec.root_event_id,
      rec.rootEventId,
      input.root_event_id,
      input.rootEventId,
      input.event_id,
      result.root_event_id,
      result.rootEventId,
      result.event_id
    ) || ""
  );
}

function getFlowBackHref(
  searchParams: Record<string, string | string[] | undefined>,
  command: CommandItem
) {
  const explicitSource = getSearchText(searchParams, [
    "source_flow_id",
    "sourceFlowId",
    "flow_source_id",
    "flowSourceId",
    "from_flow_id",
    "fromFlowId",
    "flow_source",
    "flowSource",
  ]);

  const fallback = firstText(getFlowId(command), getRootEventId(command));

  const target = explicitSource || fallback;
  return target ? `/flows/${encodeURIComponent(target)}` : "/flows";
}

function getCommandsBackHref(
  searchParams: Record<string, string | string[] | undefined>
) {
  const explicitReturn = getSearchText(searchParams, [
    "return_to",
    "returnTo",
    "back_to",
    "backTo",
  ]);

  if (explicitReturn.startsWith("/")) {
    return explicitReturn;
  }

  return "/commands";
}

function getIncidentTitle(incident: IncidentItem) {
  const rec = asRecord(incident);

  return (
    firstText(rec.title, rec.name, rec.error_id, rec.errorId, rec.id) ||
    "Untitled incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem) {
  const rec = asRecord(incident);
  return firstText(rec.status, rec.statut_incident);
}

function getIncidentSeverityRaw(incident: IncidentItem) {
  const rec = asRecord(incident);
  return firstText(rec.severity);
}

function getIncidentStatusNormalized(incident: IncidentItem) {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const rec = asRecord(incident);
  const sla = firstText(rec.sla_status).toLowerCase();
  const hasResolvedAt = Boolean(firstText(rec.resolved_at));

  if (hasResolvedAt) {
    return "resolved";
  }

  if (!raw) {
    if (sla === "breached") return "open";
    return "open";
  }

  if (["open", "opened", "new", "active", "en cours"].includes(raw)) {
    return "open";
  }

  if (["escalated", "escalade", "escaladé"].includes(raw)) {
    return "escalated";
  }

  if (["resolved", "closed", "done", "résolu", "resolve"].includes(raw)) {
    return "resolved";
  }

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
  const rec = asRecord(incident);

  if (!raw) {
    if (firstText(rec.sla_status).toLowerCase() === "breached") {
      return "critical";
    }

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

function incidentStatusTone(incident: IncidentItem) {
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

function incidentSeverityTone(incident: IncidentItem) {
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

function getIncidentCandidates(incident: IncidentItem): string[] {
  const top = asRecord(incident);
  const fields = asRecord(top.fields);

  const topLevel = (keys: string[]) => recordTexts(top, keys);
  const nestedFields = (keys: string[]) => recordTexts(fields, keys);

  return uniqueTexts([
    ...topLevel(["id"]),
    ...topLevel(["title", "Title", "name", "Name"]),

    ...topLevel(["flow_id", "flowId", "Flow_ID"]),
    ...nestedFields(["flow_id", "flowId", "Flow_ID"]),

    ...topLevel(["root_event_id", "rootEventId", "Root_Event_ID"]),
    ...nestedFields(["root_event_id", "rootEventId", "Root_Event_ID"]),

    ...topLevel([
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "command_id",
      "commandId",
      "Command_ID",
    ]),
    ...nestedFields([
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "command_id",
      "commandId",
      "Command_ID",
    ]),

    ...topLevel([
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Linked_Run",
      "Run_Record_ID",
      "Run_ID",
    ]),
    ...nestedFields([
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Linked_Run",
      "Run_Record_ID",
      "Run_ID",
    ]),

    ...topLevel([
      "incident_record_id",
      "incidentRecordId",
      "Incident_Record_ID",
      "incident_record",
      "incidentRecord",
      "Incident_Record",
    ]),
    ...nestedFields([
      "incident_record_id",
      "incidentRecordId",
      "Incident_Record_ID",
      "incident_record",
      "incidentRecord",
      "Incident_Record",
    ]),

    ...topLevel(["error_id", "errorId", "Error_ID"]),
    ...nestedFields(["error_id", "errorId", "Error_ID"]),
  ]);
}

function getCommandCandidates(command: CommandItem): string[] {
  const top = asRecord(command);
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return uniqueTexts([
    String(top.id ?? ""),
    ...recordTexts(top, [
      "command_id",
      "commandId",
      "Command_ID",
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "parent_command_id",
      "parentCommandId",
      "parent_id",
    ]),
    ...recordTexts(top, [
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "linked_run",
      "linkedRun",
      "Run_Record_ID",
      "Run_ID",
      "Linked_Run",
    ]),
    ...recordTexts(top, [
      "flow_id",
      "flowId",
      "Flow_ID",
      "root_event_id",
      "rootEventId",
      "Root_Event_ID",
      "event_id",
      "eventId",
    ]),
    ...recordTexts(input, [
      "command_id",
      "commandId",
      "Command_ID",
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "linked_run",
      "linkedRun",
      "Run_Record_ID",
      "Run_ID",
      "Linked_Run",
      "flow_id",
      "flowId",
      "Flow_ID",
      "root_event_id",
      "rootEventId",
      "Root_Event_ID",
      "event_id",
      "eventId",
    ]),
    ...recordTexts(result, [
      "command_id",
      "commandId",
      "Command_ID",
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "linked_run",
      "linkedRun",
      "Run_Record_ID",
      "Run_ID",
      "Linked_Run",
      "flow_id",
      "flowId",
      "Flow_ID",
      "root_event_id",
      "rootEventId",
      "Root_Event_ID",
      "event_id",
      "eventId",
      "incident_record_id",
      "incidentRecordId",
      "Incident_Record_ID",
      "error_id",
      "errorId",
      "Error_ID",
    ]),
  ]);
}

function matchIncidentsForCommand(
  incidents: IncidentItem[],
  command: CommandItem
): IncidentItem[] {
  const lookup = new Set(getCommandCandidates(command));

  if (lookup.size === 0) return [];

  return incidents.filter((incident) =>
    getIncidentCandidates(incident).some((candidate) => lookup.has(candidate))
  );
}

export default async function CommandDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});

  let commandData: { commands?: CommandItem[] } | null = null;
  let incidentData: IncidentsResponse | null = null;

  try {
    commandData = await fetchCommands();
  } catch {
    commandData = null;
  }

  try {
    incidentData = await fetchIncidents();
  } catch {
    incidentData = null;
  }

  const commands: CommandItem[] = Array.isArray(commandData?.commands)
    ? commandData.commands
    : [];

  const incidents: IncidentItem[] = Array.isArray(incidentData?.incidents)
    ? incidentData.incidents
    : [];

  const command =
    commands.find((item) => {
      const rec = asRecord(item);
      return (
        firstText(rec.id) === id ||
        firstText(rec.command_id, rec.commandId, rec.Command_ID) === id
      );
    }) || null;

  if (!command) {
    notFound();
  }

  const inputJson = getCommandInput(command);
  const resultJson = getCommandResult(command);

  const title = getCommandTitle(command);
  const statusLabel = getCommandStatusLabel(command);
  const createdAt = getCreatedAt(command);
  const startedAt = getStartedAt(command);
  const finishedAt = getFinishedAt(command);
  const durationMs = getDurationMs(command);
  const worker = getWorker(command);
  const workspaceId = getWorkspaceId(command);
  const recordId = getRecordId(command);
  const commandPublicId = getCommandPublicId(command);
  const retryCount = getRetryCount(command);
  const parentCommand = getParentCommand(command);
  const runRecord = getRunRecord(command);
  const lastError = getLastError(command);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);

  const returnToCommandsHref = getCommandsBackHref(resolvedSearchParams);
  const flowBackHref = getFlowBackHref(resolvedSearchParams, command);
  const linkedIncidents = matchIncidentsForCommand(incidents, command);

  const inputPreview = prettyJson(
    Object.keys(inputJson).length > 0 ? inputJson : asRecord(command).input_json
  );
  const resultPreview = prettyJson(
    Object.keys(resultJson).length > 0
      ? resultJson
      : asRecord(command).result_json
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href={returnToCommandsHref}
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Commands
          </Link>{" "}
          / {title}
        </div>

        <h1 className="mt-3 break-all text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              command
            )}`}
          >
            {statusLabel}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            Worker {worker}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            {workspaceId}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="text-sm text-zinc-400">Durée totale</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDuration(durationMs)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium text-white">
            Contexte command
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              Capability:{" "}
              <span className="text-zinc-200">
                {firstText(asRecord(command).capability) || "—"}
              </span>
            </div>
            <div>
              Status: <span className="text-zinc-200">{statusLabel}</span>
            </div>
            <div>
              Worker: <span className="text-zinc-200">{worker}</span>
            </div>
            <div>
              Workspace: <span className="text-zinc-200">{workspaceId}</span>
            </div>
            <div>
              Record ID:{" "}
              <span className="break-all text-zinc-200">{recordId}</span>
            </div>
            <div>
              Command ID:{" "}
              <span className="break-all text-zinc-200">{commandPublicId}</span>
            </div>
            <div>
              Retry count: <span className="text-zinc-200">{retryCount}</span>
            </div>
            <div>
              Parent command:{" "}
              <span className="break-all text-zinc-200">{parentCommand}</span>
            </div>
            <div>
              Run record:{" "}
              <span className="break-all text-zinc-200">{runRecord}</span>
            </div>
            <div>
              Last error:{" "}
              <span className="break-all text-zinc-200">{lastError}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Liens flow
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
              Root event:{" "}
              <span className="text-zinc-200">{rootEventId || "—"}</span>
            </div>

            <div className="break-all">
              Run record:{" "}
              <span className="text-zinc-200">{runRecord || "—"}</span>
            </div>

            <div className="break-all">
              Parent command:{" "}
              <span className="text-zinc-200">{parentCommand || "—"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Input preview
          </div>

          {inputPreview ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-200">
              {inputPreview}
            </pre>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
              Aucun input disponible.
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Result preview
          </div>

          {resultPreview ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-200">
              {resultPreview}
            </pre>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
              Aucun résultat disponible.
            </div>
          )}
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Incidents liés
        </div>

        {linkedIncidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
            Aucun incident lié détecté pour cette command.
          </div>
        ) : (
          <div className="space-y-4">
            {linkedIncidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/incidents/${encodeURIComponent(incident.id)}`}
                    className="break-all text-base font-semibold text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
                  >
                    {getIncidentTitle(incident)}
                  </Link>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentStatusTone(
                      incident
                    )}`}
                  >
                    {getIncidentStatusLabel(incident)}
                  </span>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentSeverityTone(
                      incident
                    )}`}
                  >
                    {getIncidentSeverityLabel(incident)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2">
                  <div className="break-all">
                    Flow:{" "}
                    <span className="text-zinc-200">
                      {recordText(incident, ["flow_id", "flowId"]) || "—"}
                    </span>
                  </div>
                  <div className="break-all">
                    Root event:{" "}
                    <span className="text-zinc-200">
                      {recordText(incident, ["root_event_id", "rootEventId"]) ||
                        "—"}
                    </span>
                  </div>
                  <div>
                    Category:{" "}
                    <span className="text-zinc-200">
                      {recordText(incident, ["category"]) || "—"}
                    </span>
                  </div>
                  <div>
                    Reason:{" "}
                    <span className="text-zinc-200">
                      {recordText(incident, ["reason"]) || "—"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="flex flex-col gap-3">
          <Link
            href={returnToCommandsHref}
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white transition hover:bg-white/10"
          >
            Retour à la liste commands
          </Link>

          <Link
            href="/commands"
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white transition hover:bg-white/10"
          >
            Voir toutes les commands
          </Link>

          <Link
            href={flowBackHref}
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white transition hover:bg-white/10"
          >
            Retour au flow source
          </Link>

          {flowId ? (
            <Link
              href={`/flows/${encodeURIComponent(flowId)}`}
              className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Ouvrir le flow lié
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
