import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchIncidents,
  type CommandItem,
  type CommandsResponse,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function buttonClassName(variant: "default" | "primary" = "default") {
  if (variant === "primary") {
    return "inline-flex w-full justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toText(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toOptionalText(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text || "";
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return ["true", "1", "yes", "oui"].includes(v);
  }
  return false;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function prettyDuration(ms: unknown) {
  const duration = toNumber(ms, 0);
  if (duration <= 0) return "—";

  const totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function parseMaybeJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return value;
}

function prettyJson(value: unknown) {
  const parsed = parseMaybeJson(value);

  if (parsed === null || parsed === undefined || parsed === "") {
    return "—";
  }

  if (typeof parsed === "string") {
    return parsed;
  }

  try {
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(parsed);
  }
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const text = toOptionalText(value);
    if (text) return text;
  }
  return "";
}

function pickFirstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function getCommandRecord(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.id, rec.record_id, rec.Record_ID);
}

function getCommandCapability(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.capability, rec.Capability, rec.name, rec.Name) || "command";
}

function getCommandStatusRaw(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.status, rec.Status, rec.status_select, rec.Status_select);
}

function getCommandStatusLabel(command: CommandItem) {
  const status = getCommandStatusRaw(command).toLowerCase();

  if (status === "done" || status === "success") return "DONE";
  if (status === "running") return "RUNNING";
  if (status === "queued" || status === "queue") return "QUEUED";
  if (status === "retry") return "RETRY";
  if (status === "error" || status === "failed") return "ERROR";
  if (status === "blocked") return "BLOCKED";
  if (status === "unsupported") return "UNSUPPORTED";

  return (getCommandStatusRaw(command) || "UNKNOWN").toUpperCase();
}

function getCommandStatusTone(command: CommandItem) {
  const status = getCommandStatusRaw(command).toLowerCase();

  if (status === "done" || status === "success") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (status === "retry") {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (status === "blocked") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "error" || status === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getCommandWorker(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.worker, rec.Worker) || "—";
}

function getCommandWorkspace(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.workspace_id, rec.workspaceId, rec.Workspace_ID) || "production";
}

function getCommandCreatedAt(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.created_at, rec.Created_At);
}

function getCommandStartedAt(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.started_at, rec.Started_At);
}

function getCommandFinishedAt(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstText(rec.finished_at, rec.Finished_At);
}

function getCommandDurationMs(command: CommandItem) {
  const rec = asRecord(command);
  return pickFirstNumber(rec.duration_ms, rec.Duration_ms);
}

function getCommandLastError(command: CommandItem) {
  const rec = asRecord(command);
  return (
    pickFirstText(rec.last_error, rec.Last_Error) ||
    pickFirstText(asRecord(getCommandResultObject(command)).reason) ||
    "—"
  );
}

function getCommandRunRecord(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInputObject(command);
  const result = getCommandResultObject(command);

  return (
    pickFirstText(
      rec.run_record_id,
      rec.linked_run,
      rec.run_id,
      rec.Run_Record_ID,
      rec.Linked_Run,
      asRecord(input).run_record_id,
      asRecord(result).run_record_id
    ) || "—"
  );
}

function getCommandParentCommand(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInputObject(command);
  const result = getCommandResultObject(command);

  return (
    pickFirstText(
      rec.parent_command_id,
      rec.Parent_Command_ID,
      asRecord(input).parent_command_id,
      asRecord(result).parent_command_id
    ) || "—"
  );
}

function getCommandFlowId(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInputObject(command);
  const result = getCommandResultObject(command);

  return pickFirstText(
    rec.flow_id,
    rec.flowId,
    rec.Flow_ID,
    asRecord(input).flow_id,
    asRecord(input).flowId,
    asRecord(result).flow_id,
    asRecord(result).flowId
  );
}

function getCommandRootEventId(command: CommandItem) {
  const rec = asRecord(command);
  const input = getCommandInputObject(command);
  const result = getCommandResultObject(command);

  return pickFirstText(
    rec.root_event_id,
    rec.rootEventId,
    rec.Root_Event_ID,
    asRecord(input).root_event_id,
    asRecord(input).rootEventId,
    asRecord(result).root_event_id,
    asRecord(result).rootEventId
  );
}

function getCommandInputValue(command: CommandItem) {
  const rec = asRecord(command);
  return (
    rec.input ??
    rec.input_json ??
    rec.command_input_json ??
    rec.payload_json ??
    rec.Input_JSON ??
    rec.Command_Input_JSON ??
    rec.Payload_JSON ??
    null
  );
}

function getCommandResultValue(command: CommandItem) {
  const rec = asRecord(command);
  return (
    rec.result ??
    rec.result_json ??
    rec.Result_JSON ??
    null
  );
}

function getCommandInputObject(command: CommandItem) {
  return asRecord(parseMaybeJson(getCommandInputValue(command)));
}

function getCommandResultObject(command: CommandItem) {
  return asRecord(parseMaybeJson(getCommandResultValue(command)));
}

function getDecisionStatus(command: CommandItem) {
  const result = getCommandResultObject(command);
  const input = getCommandInputObject(command);

  return pickFirstText(result.decision, input.decision);
}

function getDecisionReason(command: CommandItem) {
  const result = getCommandResultObject(command);
  const input = getCommandInputObject(command);

  return pickFirstText(result.reason, input.reason);
}

function getDecisionSeverity(command: CommandItem) {
  const result = getCommandResultObject(command);
  const input = getCommandInputObject(command);

  return pickFirstText(result.severity, input.severity);
}

function getDecisionCategory(command: CommandItem) {
  const result = getCommandResultObject(command);
  const input = getCommandInputObject(command);

  return pickFirstText(result.category, input.category);
}

function getDecisionHttpStatus(command: CommandItem) {
  const result = getCommandResultObject(command);
  const input = getCommandInputObject(command);

  const value = pickFirstText(result.http_status, input.http_status);
  return value || "—";
}

function getIncidentCreateOk(command: CommandItem) {
  const result = getCommandResultObject(command);
  return toBoolean(result.incident_create_ok);
}

function getIncidentRecordIdFromCommand(command: CommandItem) {
  const result = getCommandResultObject(command);
  return pickFirstText(result.incident_record_id);
}

function getSpawnedCount(command: CommandItem) {
  const result = getCommandResultObject(command);
  const spawnSummary = asRecord(result.spawn_summary);

  return pickFirstNumber(result.spawned_count, spawnSummary.spawned);
}

function getFirstNextCapability(command: CommandItem) {
  const result = getCommandResultObject(command);
  const nextCommands = Array.isArray(result.next_commands) ? result.next_commands : [];

  for (const item of nextCommands) {
    const rec = asRecord(item);
    const capability = pickFirstText(rec.capability);
    if (capability) return capability;
  }

  return "";
}

function getLinkedIncidentCandidates(incident: IncidentItem) {
  const rec = asRecord(incident);

  return [
    pickFirstText(rec.id),
    pickFirstText(rec.command_id),
    pickFirstText(rec.linked_command),
    pickFirstText(rec.flow_id),
    pickFirstText(rec.root_event_id),
    pickFirstText(rec.run_record_id),
    pickFirstText(rec.linked_run),
  ].filter(Boolean);
}

function getLinkedIncidents(incidents: IncidentItem[], command: CommandItem) {
  const commandRecord = getCommandRecord(command);
  const flowId = getCommandFlowId(command);
  const rootEventId = getCommandRootEventId(command);
  const runRecord = getCommandRunRecord(command);
  const incidentRecordId = getIncidentRecordIdFromCommand(command);

  const lookup = new Set(
    [commandRecord, flowId, rootEventId, runRecord, incidentRecordId]
      .map((v) => v.trim())
      .filter(Boolean)
  );

  if (lookup.size === 0) return [];

  return incidents.filter((incident) =>
    getLinkedIncidentCandidates(incident).some((candidate) => lookup.has(candidate))
  );
}

function getIncidentTitle(incident: IncidentItem) {
  const rec = asRecord(incident);
  return pickFirstText(rec.title, rec.name, rec.error_id) || "Incident";
}

export default async function CommandDetailPage({ params }: PageProps) {
  const { id } = await params;

  let commandsData: CommandsResponse | null = null;
  let incidentsData: IncidentsResponse | null = null;

  try {
    commandsData = await fetchCommands();
  } catch {
    commandsData = null;
  }

  try {
    incidentsData = await fetchIncidents();
  } catch {
    incidentsData = null;
  }

  const commands: CommandItem[] = Array.isArray(commandsData?.commands)
    ? commandsData.commands
    : [];

  const incidents: IncidentItem[] = Array.isArray(incidentsData?.incidents)
    ? incidentsData.incidents
    : [];

  const command =
    commands.find((item) => getCommandRecord(item) === id) ||
    commands.find((item) => toOptionalText(asRecord(item).command_id) === id) ||
    null;

  if (!command) {
    notFound();
  }

  const capability = getCommandCapability(command);
  const statusLabel = getCommandStatusLabel(command);
  const worker = getCommandWorker(command);
  const workspace = getCommandWorkspace(command);
  const createdAt = getCommandCreatedAt(command);
  const startedAt = getCommandStartedAt(command);
  const finishedAt = getCommandFinishedAt(command);
  const duration = prettyDuration(getCommandDurationMs(command));
  const runRecord = getCommandRunRecord(command);
  const parentCommand = getCommandParentCommand(command);
  const lastError = getCommandLastError(command);
  const flowId = getCommandFlowId(command);
  const rootEventId = getCommandRootEventId(command);
  const inputPreview = prettyJson(getCommandInputValue(command));
  const resultPreview = prettyJson(getCommandResultValue(command));
  const decision = getDecisionStatus(command);
  const reason = getDecisionReason(command);
  const severity = getDecisionSeverity(command);
  const category = getDecisionCategory(command);
  const httpStatus = getDecisionHttpStatus(command);
  const incidentCreateOk = getIncidentCreateOk(command);
  const incidentRecordId = getIncidentRecordIdFromCommand(command);
  const spawnedCount = getSpawnedCount(command);
  const firstNextCapability = getFirstNextCapability(command);
  const linkedIncidents = getLinkedIncidents(incidents, command);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/commands"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Commands
          </Link>{" "}
          / {capability}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {capability}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${getCommandStatusTone(
              command
            )}`}
          >
            {statusLabel}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            Worker {worker}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            {workspace}
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
          <div className="text-sm text-zinc-400">Durée totale</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {duration}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Contexte command
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            Capability: <span className="text-zinc-200">{capability}</span>
          </div>
          <div>
            Status: <span className="text-zinc-200">{statusLabel}</span>
          </div>
          <div>
            Worker: <span className="text-zinc-200">{worker}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspace}</span>
          </div>
          <div className="[overflow-wrap:anywhere]">
            Record ID: <span className="text-zinc-200">{getCommandRecord(command)}</span>
          </div>
          <div>
            Command ID:{" "}
            <span className="text-zinc-200">
              {toText(asRecord(command).command_id)}
            </span>
          </div>
          <div>
            Retry count:{" "}
            <span className="text-zinc-200">
              {toText(asRecord(command).retry_count)}
            </span>
          </div>
          <div className="[overflow-wrap:anywhere]">
            Parent command: <span className="text-zinc-200">{parentCommand}</span>
          </div>
          <div className="[overflow-wrap:anywhere]">
            Run record: <span className="text-zinc-200">{runRecord}</span>
          </div>
          <div className="[overflow-wrap:anywhere]">
            Last error: <span className="text-zinc-200">{lastError}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium text-white">
            Liens flow
          </div>

          <div className="space-y-4 text-sm text-zinc-400">
            <div className="[overflow-wrap:anywhere]">
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

            <div className="[overflow-wrap:anywhere]">
              Root event: <span className="text-zinc-200">{toText(rootEventId)}</span>
            </div>

            <div className="[overflow-wrap:anywhere]">
              Run record: <span className="text-zinc-200">{toText(runRecord)}</span>
            </div>

            <div className="[overflow-wrap:anywhere]">
              Parent command: <span className="text-zinc-200">{toText(parentCommand)}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Diagnostic routing
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Decision</span>
              <span className="text-zinc-200">{toText(decision)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Reason</span>
              <span className="text-zinc-200">{toText(reason)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Severity</span>
              <span className="text-zinc-200">{toText(severity)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Category</span>
              <span className="text-zinc-200">{toText(category)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">HTTP status</span>
              <span className="text-zinc-200">{toText(httpStatus)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">incident_create_ok</span>
              <span className="text-zinc-200">{incidentCreateOk ? "true" : "false"}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">incident_record_id</span>
              <span className="break-all text-zinc-200">{toText(incidentRecordId)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">spawned_count</span>
              <span className="text-zinc-200">{spawnedCount}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">next capability</span>
              <span className="text-zinc-200">{toText(firstNextCapability)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Input preview
          </div>

          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-200">
{inputPreview}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Result preview
          </div>

          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-200">
{resultPreview}
          </pre>
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
          <div className="space-y-3">
            {linkedIncidents.map((incident) => (
              <Link
                key={toText(asRecord(incident).id)}
                href={`/incidents/${encodeURIComponent(toText(asRecord(incident).id, ""))}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
              >
                <div className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                  Incident
                </div>
                <div className="mt-2 text-lg font-medium text-white">
                  {getIncidentTitle(incident)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Navigation
        </div>

        <div className="space-y-3">
          <Link href="/commands" className={buttonClassName()}>
            Retour à la liste commands
          </Link>

          <Link href="/commands" className={buttonClassName()}>
            Voir toutes les commands
          </Link>

          {flowId ? (
            <Link
              href={`/flows/${encodeURIComponent(flowId)}`}
              className={buttonClassName()}
            >
              Retour au flow source
            </Link>
          ) : null}

          {flowId ? (
            <Link
              href={`/flows/${encodeURIComponent(flowId)}`}
              className={buttonClassName()}
            >
              Ouvrir le flow lié
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
