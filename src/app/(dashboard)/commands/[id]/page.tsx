import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchIncidents,
  type CommandItem,
  type IncidentItem,
} from "@/lib/api";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
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

function getFields(obj: unknown) {
  if (!obj || typeof obj !== "object") return {};
  const fields = (obj as Record<string, unknown>).fields;
  return fields && typeof fields === "object"
    ? (fields as Record<string, unknown>)
    : {};
}

function pick(obj: unknown, keys: string[]) {
  const top = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  const fields = getFields(obj);

  for (const key of keys) {
    const topValue = top[key];
    if (topValue !== undefined && topValue !== null && String(topValue).trim() !== "") {
      return topValue;
    }

    const fieldValue = fields[key];
    if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== "") {
      return fieldValue;
    }
  }

  return undefined;
}

function getCommandRecordId(command: CommandItem) {
  return toOptionalText(pick(command, ["id"]));
}

function getCommandPublicId(command: CommandItem) {
  return toOptionalText(
    pick(command, ["command_id", "commandId", "Command_ID"])
  );
}

function getCapability(command: CommandItem) {
  return (
    toOptionalText(pick(command, ["capability", "Capability"])) ||
    "unknown_command"
  );
}

function getStatusRaw(command: CommandItem) {
  return toOptionalText(pick(command, ["status", "Status_select", "status_select"]));
}

function getStatusNormalized(command: CommandItem) {
  const raw = getStatusRaw(command).toLowerCase();

  if (["done", "success", "ok", "resolved"].includes(raw)) return "done";
  if (["running", "in_progress"].includes(raw)) return "running";
  if (["queued", "queue", "pending"].includes(raw)) return "queued";
  if (["retry"].includes(raw)) return "retry";
  if (["blocked"].includes(raw)) return "blocked";
  if (["unsupported"].includes(raw)) return "unsupported";
  if (["error", "failed", "dead"].includes(raw)) return "failed";

  return raw || "unknown";
}

function getStatusLabel(command: CommandItem) {
  const normalized = getStatusNormalized(command);

  if (normalized === "done") return "DONE";
  if (normalized === "running") return "RUNNING";
  if (normalized === "queued") return "QUEUED";
  if (normalized === "retry") return "RETRY";
  if (normalized === "blocked") return "BLOCKED";
  if (normalized === "unsupported") return "UNSUPPORTED";
  if (normalized === "failed") return "FAILED";

  return normalized.toUpperCase() || "UNKNOWN";
}

function statusTone(command: CommandItem) {
  const status = getStatusNormalized(command);

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

  if (status === "blocked") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "unsupported") {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (status === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getWorkspace(command: CommandItem) {
  return (
    toOptionalText(pick(command, ["workspace_id", "workspace", "Workspace_ID"])) ||
    "production"
  );
}

function getWorker(command: CommandItem) {
  return toText(pick(command, ["worker", "Worker"]));
}

function getFlowId(command: CommandItem) {
  return toOptionalText(pick(command, ["flow_id", "flowId", "Flow_ID"]));
}

function getRootEventId(command: CommandItem) {
  return toOptionalText(
    pick(command, ["root_event_id", "rootEventId", "Root_Event_ID"])
  );
}

function getRunRecord(command: CommandItem) {
  return toText(
    pick(command, [
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Linked_Run",
      "Run_Record_ID",
      "Run_ID",
    ])
  );
}

function getParentCommandId(command: CommandItem) {
  return toOptionalText(
    pick(command, [
      "parent_command_id",
      "parentCommandId",
      "Parent_Command_ID",
      "parent_id",
      "parentId",
    ])
  );
}

function getCreatedAt(command: CommandItem) {
  return toOptionalText(pick(command, ["created_at", "Created_At"]));
}

function getStartedAt(command: CommandItem) {
  return toOptionalText(pick(command, ["started_at", "Started_At"]));
}

function getFinishedAt(command: CommandItem) {
  return toOptionalText(pick(command, ["finished_at", "Finished_At"]));
}

function getUpdatedAt(command: CommandItem) {
  return toOptionalText(pick(command, ["updated_at", "Updated_At"]));
}

function getRetryCount(command: CommandItem) {
  return toNumber(pick(command, ["retry_count", "Retry_Count"]), 0);
}

function getLastError(command: CommandItem) {
  return toOptionalText(pick(command, ["last_error", "Last_Error"]));
}

function getDurationMs(command: CommandItem) {
  const explicit = toNumber(pick(command, ["duration_ms", "Duration_ms"]), -1);
  if (explicit >= 0) return explicit;

  const startedAt = getStartedAt(command);
  const finishedAt = getFinishedAt(command) || getUpdatedAt(command);

  if (!startedAt || !finishedAt) return 0;

  const startedTs = new Date(startedAt).getTime();
  const finishedTs = new Date(finishedAt).getTime();

  if (Number.isNaN(startedTs) || Number.isNaN(finishedTs)) return 0;

  return Math.max(0, finishedTs - startedTs);
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

function getInputValue(command: CommandItem) {
  return pick(command, ["input", "input_json", "Input_JSON", "payload_json", "Payload_JSON"]);
}

function getResultValue(command: CommandItem) {
  return pick(command, ["result", "result_json", "Result_JSON"]);
}

function stringifyPreview(value: unknown, limit = 2400) {
  if (value === null || value === undefined || value === "") return "";

  let text = "";

  if (typeof value === "string") {
    text = value.trim();
  } else {
    try {
      text = JSON.stringify(value, null, 2);
    } catch {
      text = String(value);
    }
  }

  if (!text) return "";
  if (text.length <= limit) return text;

  return `${text.slice(0, limit)}\n…`;
}

function getIncidentRecordId(incident: IncidentItem) {
  return toOptionalText(pick(incident, ["id"]));
}

function getIncidentCommandRecord(incident: IncidentItem) {
  return toOptionalText(
    pick(incident, [
      "command_id",
      "commandId",
      "Command_ID",
      "linked_command",
      "linkedCommand",
      "Linked_Command",
    ])
  );
}

function getIncidentFlowId(incident: IncidentItem) {
  return toOptionalText(pick(incident, ["flow_id", "flowId", "Flow_ID"]));
}

function getIncidentRootEventId(incident: IncidentItem) {
  return toOptionalText(
    pick(incident, ["root_event_id", "rootEventId", "Root_Event_ID"])
  );
}

function getIncidentTitle(incident: IncidentItem) {
  return (
    toOptionalText(pick(incident, ["title", "Title", "name", "Name", "error_id"])) ||
    "Untitled incident"
  );
}

function matchIncidentsToCommand(
  incidents: IncidentItem[],
  command: CommandItem
) {
  const commandRecordId = getCommandRecordId(command);
  const commandPublicId = getCommandPublicId(command);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);

  return incidents.filter((incident) => {
    const incidentCommand = getIncidentCommandRecord(incident);
    const incidentFlowId = getIncidentFlowId(incident);
    const incidentRootEventId = getIncidentRootEventId(incident);

    if (
      incidentCommand &&
      (incidentCommand === commandRecordId || incidentCommand === commandPublicId)
    ) {
      return true;
    }

    if (flowId && incidentFlowId && incidentFlowId === flowId) {
      return true;
    }

    if (rootEventId && incidentRootEventId && incidentRootEventId === rootEventId) {
      return true;
    }

    return false;
  });
}

function getIncidentsHref(command: CommandItem) {
  const params = new URLSearchParams();

  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const commandId = getCommandRecordId(command) || getCommandPublicId(command);

  if (flowId) {
    params.set("flow_id", flowId);
  }

  if (rootEventId) {
    params.set("root_event_id", rootEventId);
  }

  if (commandId) {
    params.set("command_id", commandId);
  }

  params.set("from", "commands");

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

function getFlowHref(command: CommandItem) {
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const target = flowId || rootEventId;

  if (!target) return "";

  return `/flows/${encodeURIComponent(target)}`;
}

export default async function CommandDetailPage({ params }: PageProps) {
  const { id } = await params;

  let commandsData: { commands?: CommandItem[] } | null = null;
  let incidentsData: { incidents?: IncidentItem[] } | null = null;

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
    commands.find((item) => getCommandRecordId(item) === id) ||
    commands.find((item) => getCommandPublicId(item) === id);

  if (!command) {
    notFound();
  }

  const commandRecordId = getCommandRecordId(command);
  const commandPublicId = getCommandPublicId(command);
  const capability = getCapability(command);
  const statusLabel = getStatusLabel(command);
  const workspace = getWorkspace(command);
  const worker = getWorker(command);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const runRecord = getRunRecord(command);
  const parentCommandId = getParentCommandId(command);
  const createdAt = getCreatedAt(command);
  const startedAt = getStartedAt(command);
  const finishedAt = getFinishedAt(command);
  const updatedAt = getUpdatedAt(command);
  const retryCount = getRetryCount(command);
  const lastError = getLastError(command);
  const durationMs = getDurationMs(command);
  const flowHref = getFlowHref(command);
  const relatedIncidents = matchIncidentsToCommand(incidents, command).sort((a, b) =>
    getIncidentRecordId(b).localeCompare(getIncidentRecordId(a))
  );
  const incidentsHref = getIncidentsHref(command);
  const firstIncident = relatedIncidents[0];
  const inputPreview = stringifyPreview(getInputValue(command));
  const resultPreview = stringifyPreview(getResultValue(command));

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
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              command
            )}`}
          >
            {statusLabel}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            Worker {worker}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {workspace}
          </span>

          {relatedIncidents.length > 0 ? (
            <Link
              href={
                relatedIncidents.length === 1 && firstIncident
                  ? `/incidents/${encodeURIComponent(getIncidentRecordId(firstIncident))}`
                  : incidentsHref
              }
              className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
            >
              {relatedIncidents.length > 1
                ? `Voir les ${relatedIncidents.length} incidents`
                : "Voir l’incident lié"}
            </Link>
          ) : null}
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
            {formatDate(finishedAt || updatedAt)}
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
            <div className="break-all">
              Record ID: <span className="text-zinc-200">{toText(commandRecordId)}</span>
            </div>
            <div className="break-all">
              Command ID: <span className="text-zinc-200">{toText(commandPublicId)}</span>
            </div>
            <div>
              Retry count: <span className="text-zinc-200">{retryCount}</span>
            </div>
            <div className="break-all">
              Parent command: <span className="text-zinc-200">{toText(parentCommandId)}</span>
            </div>
            <div className="break-all md:col-span-2">
              Run record: <span className="text-zinc-200">{toText(runRecord)}</span>
            </div>
            <div className="break-all md:col-span-2">
              Last error: <span className="text-zinc-200">{toText(lastError)}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Liens flow
          </div>

          <div className="space-y-3 text-sm text-zinc-400">
            <div className="break-all">
              Flow:{" "}
              {flowHref && flowId ? (
                <Link
                  href={flowHref}
                  className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowId}
                </Link>
              ) : (
                <span className="text-zinc-200">—</span>
              )}
            </div>

            <div className="break-all">
              Root event: <span className="text-zinc-200">{toText(rootEventId)}</span>
            </div>

            <div className="break-all">
              Run record: <span className="text-zinc-200">{toText(runRecord)}</span>
            </div>

            <div className="break-all">
              Parent command:{" "}
              {parentCommandId ? (
                <Link
                  href={`/commands/${encodeURIComponent(parentCommandId)}`}
                  className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {parentCommandId}
                </Link>
              ) : (
                <span className="text-zinc-200">—</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Input preview</div>

          {inputPreview ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-300">
              {inputPreview}
            </pre>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
              Aucun input exploitable.
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Result preview</div>

          {resultPreview ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-300">
              {resultPreview}
            </pre>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
              Aucun résultat exploitable.
            </div>
          )}
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Incidents liés
        </div>

        {relatedIncidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
            Aucun incident lié détecté pour cette command.
          </div>
        ) : (
          <div className="space-y-3">
            {relatedIncidents.slice(0, 3).map((incident) => {
              const incidentId = getIncidentRecordId(incident);

              return (
                <div
                  key={incidentId}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="break-all text-sm text-zinc-400">
                        Incident ID: {incidentId}
                      </div>
                      <div className="break-all text-base font-medium text-white">
                        {getIncidentTitle(incident)}
                      </div>
                    </div>

                    <Link
                      href={`/incidents/${encodeURIComponent(incidentId)}`}
                      className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
                    >
                      Ouvrir l’incident
                    </Link>
                  </div>
                </div>
              );
            })}

            {relatedIncidents.length > 3 ? (
              <div>
                <Link
                  href={incidentsHref}
                  className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
                >
                  Voir tous les incidents liés
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="flex flex-col gap-3">
          <Link
            href="/commands"
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Retour à la liste commands
          </Link>

          <Link
            href="/commands"
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Voir toutes les commands
          </Link>

          {flowHref ? (
            <Link
              href={flowHref}
              className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Retour au flow source
            </Link>
          ) : null}

          {flowHref ? (
            <Link
              href={flowHref}
              className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ouvrir le flow lié
            </Link>
          ) : null}

          {relatedIncidents.length > 0 ? (
            <Link
              href={
                relatedIncidents.length === 1 && firstIncident
                  ? `/incidents/${encodeURIComponent(getIncidentRecordId(firstIncident))}`
                  : incidentsHref
              }
              className="inline-flex w-full justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15"
            >
              {relatedIncidents.length > 1
                ? "Ouvrir les incidents liés"
                : "Ouvrir l’incident lié"}
            </Link>
          ) : null}

          {parentCommandId ? (
            <Link
              href={`/commands/${encodeURIComponent(parentCommandId)}`}
              className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Ouvrir la command parente
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
