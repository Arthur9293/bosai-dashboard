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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toText(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "ok"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }

  return fallback;
}

function formatDate(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function tryParseObject(value: unknown): Record<string, unknown> {
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

function prettyJson(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function pickText(
  sources: Array<Record<string, unknown>>,
  keys: string[],
  fallback = ""
) {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      const text = toText(value, "");
      if (text) return text;
    }
  }

  return fallback;
}

function pickNumber(
  sources: Array<Record<string, unknown>>,
  keys: string[],
  fallback = 0
) {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      const number = toNumber(value, Number.NaN);
      if (!Number.isNaN(number)) return number;
    }
  }

  return fallback;
}

function pickBoolean(
  sources: Array<Record<string, unknown>>,
  keys: string[],
  fallback = false
) {
  for (const source of sources) {
    for (const key of keys) {
      if (key in source) {
        return toBoolean(source[key], fallback);
      }
    }
  }

  return fallback;
}

function collectTexts(
  sources: Array<Record<string, unknown>>,
  keys: string[]
): string[] {
  const values = new Set<string>();

  for (const source of sources) {
    for (const key of keys) {
      const raw = source[key];

      if (Array.isArray(raw)) {
        for (const item of raw) {
          const text = toText(item, "");
          if (text) values.add(text);
        }
        continue;
      }

      const text = toText(raw, "");
      if (text) values.add(text);
    }
  }

  return Array.from(values);
}

function getCommandRecord(command: CommandItem) {
  const top = asRecord(command);
  const input = tryParseObject(top.input ?? top.input_json ?? top.payload_json);
  const result = tryParseObject(top.result ?? top.result_json);

  const sources = [top, input, result];

  return {
    top,
    input,
    result,
    sources,
  };
}

function getCommandTitle(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["capability", "name", "title"], "Commande");
}

function getCommandStatus(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["status", "status_select"], "unknown");
}

function getCommandStatusLabel(command: CommandItem) {
  return getCommandStatus(command).toUpperCase();
}

function commandStatusTone(command: CommandItem) {
  const status = getCommandStatus(command).toLowerCase();

  if (["done", "success", "ok"].includes(status)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "in_progress"].includes(status)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry"].includes(status)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["failed", "error", "blocked", "dead"].includes(status)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getWorker(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["worker", "worker_id"], "—");
}

function getWorkspace(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["workspace_id", "workspace"], "production");
}

function getRecordId(command: CommandItem) {
  const top = asRecord(command);
  return toText(top.id);
}

function getCommandId(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["command_id", "Command_ID"], "—");
}

function getParentCommandId(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(
    sources,
    ["parent_command_id", "parent_id", "linked_command_id"],
    "—"
  );
}

function getCreatedAt(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["created_at", "Created_At"], "");
}

function getStartedAt(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["started_at", "Started_At"], "");
}

function getFinishedAt(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["finished_at", "Finished_At"], "");
}

function getDurationMs(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickNumber(sources, ["duration_ms", "Duration_ms"], 0);
}

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getFlowId(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["flow_id", "Flow_ID"], "");
}

function getRootEventId(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["root_event_id", "Root_Event_ID", "event_id"], "");
}

function getRunRecordId(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(
    sources,
    ["run_record_id", "linked_run", "run_id", "Run_Record_ID"],
    "—"
  );
}

function getLastError(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(
    sources,
    ["last_error", "error", "reason", "Last_Error"],
    "—"
  );
}

function getRetryCount(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  const direct = pickNumber(sources, ["retry_count", "Retry_Count"], Number.NaN);
  return Number.isNaN(direct) ? "—" : String(direct);
}

function getDecision(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["decision"], "—");
}

function getReason(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["reason"], "—");
}

function getSeverity(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["severity"], "—");
}

function getCategory(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["category"], "—");
}

function getHttpStatus(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  const value = pickNumber(sources, ["http_status"], Number.NaN);
  return Number.isNaN(value) ? "—" : String(value);
}

function getIncidentCreateOk(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  const found = pickBoolean(sources, ["incident_create_ok"], false);
  const hasExplicitField = sources.some((source) => "incident_create_ok" in source);

  if (!hasExplicitField) return "—";
  return found ? "true" : "false";
}

function getIncidentRecordId(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  return pickText(sources, ["incident_record_id"], "—");
}

function getSpawnedCount(command: CommandItem) {
  const { sources } = getCommandRecord(command);
  const value = pickNumber(sources, ["spawned_count"], Number.NaN);
  return Number.isNaN(value) ? "—" : String(value);
}

function getNextCapability(command: CommandItem) {
  const { result } = getCommandRecord(command);
  const nextCommands = result.next_commands;

  if (Array.isArray(nextCommands) && nextCommands.length > 0) {
    const first = asRecord(nextCommands[0]);
    return toText(first.capability, "—");
  }

  return "—";
}

function getInputPreview(command: CommandItem) {
  const top = asRecord(command);
  return prettyJson(top.input ?? top.input_json ?? top.payload_json ?? {});
}

function getResultPreview(command: CommandItem) {
  const top = asRecord(command);
  return prettyJson(top.result ?? top.result_json ?? {});
}

function getIncidentTitle(incident: IncidentItem) {
  const record = asRecord(incident);
  return toText(
    record.title ?? record.name ?? record.error_id,
    "Incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem) {
  const record = asRecord(incident);
  return toText(record.status ?? record.statut_incident, "").trim();
}

function getIncidentSeverityRaw(incident: IncidentItem) {
  const record = asRecord(incident);
  return toText(record.severity, "").trim();
}

function getIncidentStatusNormalized(incident: IncidentItem) {
  const record = asRecord(incident);
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = toText(record.sla_status, "").toLowerCase();
  const hasResolvedAt = Boolean(record.resolved_at);

  if (hasResolvedAt) return "resolved";

  if (!raw) {
    if (sla === "breached") return "open";
    return "open";
  }

  if (["open", "opened", "new", "active", "en cours"].includes(raw)) return "open";
  if (["escalated", "escalade", "escaladé"].includes(raw)) return "escalated";
  if (["resolved", "closed", "done", "résolu", "resolve"].includes(raw)) return "resolved";

  return raw;
}

function getIncidentSeverityNormalized(incident: IncidentItem) {
  const record = asRecord(incident);
  const raw = getIncidentSeverityRaw(incident).toLowerCase();

  if (!raw) {
    if (toText(record.sla_status, "").toLowerCase() === "breached") {
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

function getIncidentLookupKeys(incident: IncidentItem) {
  const record = asRecord(incident);

  return new Set(
    collectTexts([record], [
      "id",
      "flow_id",
      "root_event_id",
      "run_record_id",
      "linked_run",
      "run_id",
      "command_id",
      "linked_command",
      "linked_command_id",
    ])
  );
}

function getCommandLookupKeys(command: CommandItem) {
  const top = asRecord(command);
  const { input, result, sources } = getCommandRecord(command);

  return new Set(
    collectTexts([top, input, result, ...sources], [
      "id",
      "flow_id",
      "root_event_id",
      "run_record_id",
      "linked_run",
      "run_id",
      "command_id",
      "linked_command",
      "linked_command_id",
      "incident_record_id",
    ])
  );
}

function findLinkedIncidents(command: CommandItem, incidents: IncidentItem[]) {
  const commandKeys = getCommandLookupKeys(command);

  return incidents.filter((incident) => {
    const incidentKeys = getIncidentLookupKeys(incident);

    for (const key of incidentKeys) {
      if (commandKeys.has(key)) return true;
    }

    return false;
  });
}

function getIncidentLinkHref(incidentId: string, command: CommandItem) {
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const runRecordId = getRunRecordId(command);
  const params = new URLSearchParams();

  params.set("from", "commands");
  params.set("command_record_id", getRecordId(command));

  if (flowId) params.set("flow_id", flowId);
  if (rootEventId) params.set("root_event_id", rootEventId);
  if (runRecordId && runRecordId !== "—") params.set("run_record_id", runRecordId);

  return `/incidents/${encodeURIComponent(incidentId)}?${params.toString()}`;
}

function getFlowDetailHref(command: CommandItem, withContext: boolean) {
  const flowId = getFlowId(command);
  if (!flowId) return "";

  const base = `/flows/${encodeURIComponent(flowId)}`;
  if (!withContext) return base;

  const params = new URLSearchParams();
  params.set("from", "commands");
  params.set("command_record_id", getRecordId(command));

  const rootEventId = getRootEventId(command);
  const runRecordId = getRunRecordId(command);

  if (rootEventId) params.set("root_event_id", rootEventId);
  if (runRecordId && runRecordId !== "—") params.set("run_record_id", runRecordId);

  return `${base}?${params.toString()}`;
}

export default async function CommandDetailPage({ params }: PageProps) {
  const { id } = await params;

  let commandsData: Awaited<ReturnType<typeof fetchCommands>> | null = null;
  let incidentsData: Awaited<ReturnType<typeof fetchIncidents>> | null = null;

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

  const commands: CommandItem[] = Array.isArray(
    (commandsData as { commands?: unknown } | null)?.commands
  )
    ? (((commandsData as { commands?: unknown }).commands as unknown[]) || []) as CommandItem[]
    : [];

  const incidents: IncidentItem[] = Array.isArray(
    (incidentsData as { incidents?: unknown } | null)?.incidents
  )
    ? (((incidentsData as { incidents?: unknown }).incidents as unknown[]) || []) as IncidentItem[]
    : [];

  const command =
    commands.find((item) => {
      const record = asRecord(item);
      const recordId = toText(record.id, "");
      const commandId = getCommandId(item);
      return recordId === id || commandId === id;
    }) || null;

  if (!command) {
    notFound();
  }

  const title = getCommandTitle(command);
  const statusLabel = getCommandStatusLabel(command);
  const worker = getWorker(command);
  const workspace = getWorkspace(command);
  const recordId = getRecordId(command);
  const commandId = getCommandId(command);
  const parentCommandId = getParentCommandId(command);
  const createdAt = getCreatedAt(command);
  const startedAt = getStartedAt(command);
  const finishedAt = getFinishedAt(command);
  const durationMs = getDurationMs(command);
  const runRecordId = getRunRecordId(command);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const lastError = getLastError(command);

  const decision = getDecision(command);
  const reason = getReason(command);
  const severity = getSeverity(command);
  const category = getCategory(command);
  const httpStatus = getHttpStatus(command);
  const incidentCreateOk = getIncidentCreateOk(command);
  const incidentRecordId = getIncidentRecordId(command);
  const spawnedCount = getSpawnedCount(command);
  const nextCapability = getNextCapability(command);

  const linkedIncidents = findLinkedIncidents(command, incidents);

  const flowSourceHref = getFlowDetailHref(command, true);
  const flowDirectHref = getFlowDetailHref(command, false);

  const showIncidentCreateFalse =
    incidentCreateOk !== "—" && incidentCreateOk.toLowerCase() === "false";

  const showMissingIncidentRecord =
    incidentRecordId === "—" || incidentRecordId === "";

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
          / {title}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${commandStatusTone(
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
              Capability: <span className="text-zinc-200">{title}</span>
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
            <div>
              Record ID: <span className="text-zinc-200">{recordId}</span>
            </div>
            <div>
              Command ID: <span className="text-zinc-200">{commandId}</span>
            </div>
            <div>
              Retry count: <span className="text-zinc-200">{getRetryCount(command)}</span>
            </div>
            <div>
              Parent command: <span className="text-zinc-200">{parentCommandId}</span>
            </div>
            <div>
              Run record: <span className="text-zinc-200">{runRecordId}</span>
            </div>
            <div>
              Last error: <span className="text-zinc-200">{lastError}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Liens flow
          </div>

          <div className="space-y-3 text-sm text-zinc-400">
            <div className="break-all">
              Flow: <span className="text-zinc-200">{toText(flowId)}</span>
            </div>

            <div className="break-all">
              Root event: <span className="text-zinc-200">{toText(rootEventId)}</span>
            </div>

            <div className="break-all">
              Run record: <span className="text-zinc-200">{toText(runRecordId)}</span>
            </div>

            <div className="break-all">
              Parent command: <span className="text-zinc-200">{toText(parentCommandId)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Diagnostic routing
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            Decision: <span className="text-zinc-200">{decision}</span>
          </div>
          <div>
            Reason: <span className="text-zinc-200">{reason}</span>
          </div>
          <div>
            Severity: <span className="text-zinc-200">{severity}</span>
          </div>
          <div>
            Category: <span className="text-zinc-200">{category}</span>
          </div>
          <div>
            HTTP status: <span className="text-zinc-200">{httpStatus}</span>
          </div>
          <div>
            incident_create_ok:{" "}
            <span className="text-zinc-200">{incidentCreateOk}</span>
          </div>
          <div>
            incident_record_id:{" "}
            <span className="text-zinc-200">{incidentRecordId}</span>
          </div>
          <div>
            spawned_count: <span className="text-zinc-200">{spawnedCount}</span>
          </div>
          <div className="md:col-span-2">
            next capability:{" "}
            <span className="text-zinc-200">{nextCapability}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Input preview</div>

          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-zinc-200">
            {getInputPreview(command)}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Result preview</div>

          <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-zinc-200">
            {getResultPreview(command)}
          </pre>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Incidents liés</div>

        {linkedIncidents.length > 0 ? (
          <div className="space-y-4">
            {linkedIncidents.map((incident) => {
              const incidentRecord = asRecord(incident);
              const incidentId = toText(incidentRecord.id, "");

              return (
                <article
                  key={incidentId}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={getIncidentLinkHref(incidentId, command)}
                      className="break-all text-lg font-semibold text-white underline decoration-white/20 underline-offset-4 transition hover:text-zinc-200"
                    >
                      {getIncidentTitle(incident)}
                    </Link>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentStatusTone(
                        incident
                      )}`}
                    >
                      {getIncidentStatusNormalized(incident).toUpperCase()}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentSeverityTone(
                        incident
                      )}`}
                    >
                      {getIncidentSeverityNormalized(incident).toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2">
                    <div>
                      Flow: <span className="text-zinc-200">{toText(incidentRecord.flow_id)}</span>
                    </div>
                    <div>
                      Root event:{" "}
                      <span className="text-zinc-200">{toText(incidentRecord.root_event_id)}</span>
                    </div>
                    <div>
                      Run record:{" "}
                      <span className="text-zinc-200">
                        {toText(
                          incidentRecord.run_record_id ??
                            incidentRecord.linked_run ??
                            incidentRecord.run_id
                        )}
                      </span>
                    </div>
                    <div>
                      Command:{" "}
                      <span className="text-zinc-200">
                        {toText(
                          incidentRecord.command_id ??
                            incidentRecord.linked_command ??
                            incidentRecord.linked_command_id
                        )}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-400">
            <div className="font-medium text-zinc-300">
              Aucun incident lié détecté pour cette command.
            </div>

            <div className="mt-3 space-y-1">
              <div>
                Vérification secondaire effectuée via{" "}
                <span className="text-zinc-200">flow_id</span>,{" "}
                <span className="text-zinc-200">root_event_id</span> et{" "}
                <span className="text-zinc-200">run_record_id</span>.
              </div>

              {showMissingIncidentRecord ? (
                <div>
                  <span className="text-zinc-200">incident_record_id</span> est
                  absent.
                </div>
              ) : null}

              {showIncidentCreateFalse ? (
                <div>
                  <span className="text-zinc-200">incident_create_ok = false</span>.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="flex flex-col gap-3">
          <Link
            href="/commands"
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

          {flowSourceHref ? (
            <Link
              href={flowSourceHref}
              className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Retour au flow source
            </Link>
          ) : null}

          {flowDirectHref ? (
            <Link
              href={flowDirectHref}
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
