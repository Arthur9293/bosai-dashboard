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
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-base font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-white transition hover:bg-white/10";
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

function formatDurationMs(value: unknown) {
  const ms = toNumber(value, NaN);
  if (!Number.isFinite(ms) || ms <= 0) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function parseJsonMaybe(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }

  return [];
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function prettyJson(value: unknown) {
  if (value === null || value === undefined) {
    return "{}";
  }

  const parsed = parseJsonMaybe(value);

  if (parsed !== null) {
    try {
      return JSON.stringify(parsed, null, 2);
    } catch {
      return "{}";
    }
  }

  if (typeof value === "string") {
    return value.trim() || "{}";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function statusTone(status: string) {
  const normalized = status.trim().toLowerCase();

  if (["done", "success", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "in_progress", "processing"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["error", "failed", "blocked"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function incidentStatusTone(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "resolved") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (normalized === "escalated") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (normalized === "open") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function incidentSeverityTone(severity: string) {
  const normalized = severity.trim().toLowerCase();

  if (normalized === "critical") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (normalized === "high") {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (normalized === "medium") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (normalized === "low") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function incidentSlaTone(label: string) {
  const normalized = label.trim().toLowerCase();

  if (normalized === "resolved" || normalized === "ok") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (normalized === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (normalized === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (normalized === "open") {
    return "bg-zinc-800 text-zinc-300 border border-zinc-700";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getIncidentTitle(incident: IncidentItem) {
  return (
    incident.title ||
    incident.name ||
    incident.error_id ||
    "Untitled incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem) {
  return (incident.status || incident.statut_incident || "").trim();
}

function getIncidentSeverityRaw(incident: IncidentItem) {
  return (incident.severity || "").trim();
}

function getIncidentStatusNormalized(incident: IncidentItem) {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = (incident.sla_status || "").trim().toLowerCase();
  const hasResolvedAt = Boolean(incident.resolved_at);

  if (hasResolvedAt) return "resolved";

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

  if (!raw) {
    if ((incident.sla_status || "").toLowerCase() === "breached") {
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

function getIncidentSlaLabel(incident: IncidentItem) {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "RESOLVED";

  const sla = (incident.sla_status || "").trim();
  if (sla) return sla.toUpperCase();

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "BREACHED";
  }

  return "OPEN";
}

function getIncidentWorkspace(incident: IncidentItem) {
  return firstNonEmptyString(incident.workspace_id, incident.workspace, "—");
}

function getIncidentFlowId(incident: IncidentItem) {
  return firstNonEmptyString(incident.flow_id);
}

function getIncidentRootEventId(incident: IncidentItem) {
  return firstNonEmptyString(incident.root_event_id);
}

function getIncidentRunRecordId(incident: IncidentItem) {
  return firstNonEmptyString(
    incident.run_record_id,
    incident.linked_run,
    incident.run_id
  );
}

function getIncidentCommandIds(incident: IncidentItem) {
  const ids = new Set<string>();

  const direct = firstNonEmptyString(incident.command_id, incident.linked_command);
  if (direct) ids.add(direct);

  for (const item of toStringArray((incident as Record<string, unknown>).linked_command)) {
    ids.add(item);
  }

  return Array.from(ids);
}

function getIncidentOpenedAt(incident: IncidentItem) {
  return incident.opened_at || incident.created_at;
}

function isLegacyNoiseIncident(incident: IncidentItem) {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = (incident.category || "").trim().toLowerCase();
  const reason = (incident.reason || "").trim().toLowerCase();
  const errorId = (incident.error_id || "").trim();
  const resolutionNote = (incident.resolution_note || "").trim();
  const lastAction = (incident.last_action || "").trim();
  const flowId = getIncidentFlowId(incident);
  const rootEventId = getIncidentRootEventId(incident);
  const commandIds = getIncidentCommandIds(incident);
  const runRecord = getIncidentRunRecordId(incident);

  const isGenericTitle = title === "incident" || title === "untitled incident";
  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";
  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const hasNoLinking =
    !flowId &&
    !rootEventId &&
    !runRecord &&
    commandIds.length === 0;

  const hasStrongBusinessSignal =
    errorId !== "" ||
    resolutionNote !== "" ||
    lastAction !== "" ||
    category === "http_failure" ||
    reason === "http_5xx_exhausted" ||
    reason === "http_status_error" ||
    reason === "forbidden_host" ||
    !hasNoLinking;

  return isGenericTitle && isGenericCategory && isGenericReason && !hasStrongBusinessSignal;
}

type NormalizedCommand = {
  raw: CommandItem;
  recordId: string;
  commandId: string;
  capability: string;
  status: string;
  worker: string;
  workspace: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number | null;
  flowId: string;
  rootEventId: string;
  runRecordId: string;
  parentCommandId: string;
  incidentRecordId: string;
  incidentCreateOk: boolean | null;
  lastError: string;
  decision: string;
  reason: string;
  severity: string;
  category: string;
  httpStatus: string;
  spawnedCount: string;
  nextCapability: string;
  inputPreview: string;
  resultPreview: string;
};

function normalizeCommand(command: CommandItem): NormalizedCommand {
  const raw = command as Record<string, unknown>;
  const inputPayload = asRecord(
    parseJsonMaybe(
      raw.input_json ??
        raw.command_input_json ??
        raw.payload_json ??
        raw.input ??
        null
    )
  );
  const resultPayload = asRecord(
    parseJsonMaybe(
      raw.result_json ??
        raw.result ??
        raw.output_json ??
        raw.output ??
        null
    )
  );

  const spawnSummary = asRecord(resultPayload.spawn_summary);
  const nextCommands = Array.isArray(resultPayload.next_commands)
    ? resultPayload.next_commands
    : [];
  const firstNextCommand = asRecord(nextCommands[0]);

  const recordId = firstNonEmptyString(raw.id);
  const commandId = firstNonEmptyString(
    raw.command_id,
    inputPayload.command_id,
    inputPayload.commandId,
    inputPayload.commandid,
    resultPayload.command_id,
    resultPayload.commandId,
    resultPayload.commandid,
    recordId
  );

  const createdAt = firstNonEmptyString(
    raw.created_at,
    raw.createdAt,
    inputPayload.created_at,
    resultPayload.created_at
  );

  const startedAt = firstNonEmptyString(
    raw.started_at,
    raw.startedAt,
    inputPayload.started_at,
    resultPayload.started_at
  );

  const finishedAt = firstNonEmptyString(
    raw.finished_at,
    raw.finishedAt,
    inputPayload.finished_at,
    resultPayload.finished_at
  );

  let durationMs =
    Number.isFinite(toNumber(raw.duration_ms, NaN))
      ? toNumber(raw.duration_ms, NaN)
      : Number.isFinite(toNumber(raw.durationMs, NaN))
        ? toNumber(raw.durationMs, NaN)
        : NaN;

  if (!Number.isFinite(durationMs) && startedAt && finishedAt) {
    const startTs = new Date(startedAt).getTime();
    const endTs = new Date(finishedAt).getTime();

    if (Number.isFinite(startTs) && Number.isFinite(endTs) && endTs >= startTs) {
      durationMs = endTs - startTs;
    }
  }

  return {
    raw: command,
    recordId,
    commandId,
    capability: firstNonEmptyString(raw.capability, raw.name, "command"),
    status: firstNonEmptyString(raw.status, "unknown"),
    worker: firstNonEmptyString(raw.worker, raw.worker_id, "—"),
    workspace: firstNonEmptyString(
      raw.workspace_id,
      raw.workspace,
      inputPayload.workspace_id,
      inputPayload.workspaceId,
      inputPayload.workspaceid,
      resultPayload.workspace_id,
      resultPayload.workspaceId,
      "production"
    ),
    createdAt,
    startedAt,
    finishedAt,
    durationMs: Number.isFinite(durationMs) ? durationMs : null,
    flowId: firstNonEmptyString(
      raw.flow_id,
      raw.flowid,
      raw.flowId,
      inputPayload.flow_id,
      inputPayload.flowid,
      inputPayload.flowId,
      resultPayload.flow_id,
      resultPayload.flowid,
      resultPayload.flowId
    ),
    rootEventId: firstNonEmptyString(
      raw.root_event_id,
      raw.rootEventId,
      raw.rooteventid,
      inputPayload.root_event_id,
      inputPayload.rootEventId,
      inputPayload.rooteventid,
      inputPayload.event_id,
      inputPayload.eventId,
      inputPayload.eventid,
      resultPayload.root_event_id,
      resultPayload.rootEventId,
      resultPayload.rooteventid,
      resultPayload.event_id,
      resultPayload.eventId,
      resultPayload.eventid
    ),
    runRecordId: firstNonEmptyString(
      raw.run_record_id,
      raw.runRecordId,
      raw.runrecordid,
      inputPayload.run_record_id,
      inputPayload.runRecordId,
      inputPayload.runrecordid,
      inputPayload.linked_run,
      resultPayload.run_record_id,
      resultPayload.runRecordId,
      resultPayload.runrecordid,
      resultPayload.linked_run
    ),
    parentCommandId: firstNonEmptyString(
      raw.parent_command_id,
      raw.parentCommandId,
      raw.parentcommandid,
      inputPayload.parent_command_id,
      inputPayload.parentCommandId,
      inputPayload.parentcommandid,
      resultPayload.parent_command_id,
      resultPayload.parentCommandId,
      resultPayload.parentcommandid
    ),
    incidentRecordId: firstNonEmptyString(
      raw.incident_record_id,
      raw.incidentRecordId,
      raw.incidentrecordid,
      inputPayload.incident_record_id,
      inputPayload.incidentRecordId,
      inputPayload.incidentrecordid,
      resultPayload.incident_record_id,
      resultPayload.incidentRecordId,
      resultPayload.incidentrecordid
    ),
    incidentCreateOk:
      typeof resultPayload.incident_create_ok === "boolean"
        ? (resultPayload.incident_create_ok as boolean)
        : typeof inputPayload.incident_create_ok === "boolean"
          ? (inputPayload.incident_create_ok as boolean)
          : null,
    lastError: firstNonEmptyString(
      raw.last_error,
      raw.error,
      resultPayload.last_error,
      resultPayload.error,
      inputPayload.last_error,
      inputPayload.error
    ),
    decision: firstNonEmptyString(resultPayload.decision, inputPayload.decision),
    reason: firstNonEmptyString(resultPayload.reason, inputPayload.reason),
    severity: firstNonEmptyString(resultPayload.severity, inputPayload.severity),
    category: firstNonEmptyString(resultPayload.category, inputPayload.category),
    httpStatus: firstNonEmptyString(
      resultPayload.http_status,
      inputPayload.http_status,
      raw.http_status
    ),
    spawnedCount: firstNonEmptyString(
      resultPayload.spawned_count,
      spawnSummary.spawned,
      inputPayload.spawned_count
    ),
    nextCapability: firstNonEmptyString(
      firstNextCommand.capability,
      resultPayload.next_capability,
      inputPayload.next_capability,
      inputPayload.nextaction
    ),
    inputPreview: prettyJson(
      raw.input_json ?? raw.command_input_json ?? raw.payload_json ?? raw.input ?? {}
    ),
    resultPreview: prettyJson(
      raw.result_json ?? raw.result ?? raw.output_json ?? raw.output ?? {}
    ),
  };
}

type MatchedIncident = {
  incident: IncidentItem;
  score: number;
};

function scoreIncidentMatch(
  incident: IncidentItem,
  command: NormalizedCommand
): number {
  const incidentId = firstNonEmptyString(incident.id);
  const incidentFlowId = getIncidentFlowId(incident);
  const incidentRootEventId = getIncidentRootEventId(incident);
  const incidentRunRecordId = getIncidentRunRecordId(incident);
  const incidentWorkspace = getIncidentWorkspace(incident);
  const incidentCommandIds = getIncidentCommandIds(incident);

  const normalizedCommandRecordId = normalizeKey(command.recordId);
  const normalizedCommandId = normalizeKey(command.commandId);
  const normalizedIncidentRecordId = normalizeKey(command.incidentRecordId);
  const normalizedFlowId = normalizeKey(command.flowId);
  const normalizedRootEventId = normalizeKey(command.rootEventId);
  const normalizedRunRecordId = normalizeKey(command.runRecordId);
  const normalizedWorkspace = normalizeKey(command.workspace);

  let score = 0;

  if (
    normalizedIncidentRecordId &&
    normalizeKey(incidentId) === normalizedIncidentRecordId
  ) {
    score += 1000;
  }

  const incidentCommandKeySet = new Set(incidentCommandIds.map(normalizeKey));
  if (
    normalizedCommandRecordId &&
    incidentCommandKeySet.has(normalizedCommandRecordId)
  ) {
    score += 700;
  }

  if (normalizedCommandId && incidentCommandKeySet.has(normalizedCommandId)) {
    score += 700;
  }

  if (
    normalizedRunRecordId &&
    normalizeKey(incidentRunRecordId) === normalizedRunRecordId
  ) {
    score += 500;
  }

  if (normalizedFlowId && normalizeKey(incidentFlowId) === normalizedFlowId) {
    score += 350;
  }

  if (
    normalizedRootEventId &&
    normalizeKey(incidentRootEventId) === normalizedRootEventId
  ) {
    score += 300;
  }

  if (
    normalizedWorkspace &&
    normalizeKey(incidentWorkspace) === normalizedWorkspace
  ) {
    score += 80;
  }

  return score;
}

function findLinkedIncidents(
  incidents: IncidentItem[],
  command: NormalizedCommand
): MatchedIncident[] {
  const matched = incidents
    .map((incident) => ({
      incident,
      score: scoreIncidentMatch(incident, command),
    }))
    .filter((item) => item.score >= 500)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const unique: MatchedIncident[] = [];

  for (const item of matched) {
    const id = item.incident.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(item);
  }

  return unique;
}

function LinkedIncidentCard({ incident }: { incident: IncidentItem }) {
  const title = getIncidentTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const slaLabel = getIncidentSlaLabel(incident);
  const openedAt = getIncidentOpenedAt(incident);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="space-y-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Incident lié
        </div>

        <div className="space-y-3">
          <Link
            href={`/incidents/${encodeURIComponent(incident.id)}`}
            className="block text-lg font-semibold text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
          >
            {title}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentStatusTone(
                getIncidentStatusNormalized(incident)
              )}`}
            >
              {statusLabel}
            </span>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentSeverityTone(
                getIncidentSeverityNormalized(incident)
              )}`}
            >
              {severityLabel}
            </span>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentSlaTone(
                getIncidentSlaLabel(incident)
              )}`}
            >
              SLA {slaLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            Opened: <span className="text-zinc-200">{formatDate(openedAt)}</span>
          </div>
          <div>
            Workspace:{" "}
            <span className="text-zinc-200">{getIncidentWorkspace(incident)}</span>
          </div>
          <div className="break-all">
            Flow:{" "}
            <span className="text-zinc-200">
              {getIncidentFlowId(incident) || "—"}
            </span>
          </div>
          <div className="break-all">
            Root event:{" "}
            <span className="text-zinc-200">
              {getIncidentRootEventId(incident) || "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/incidents/${encodeURIComponent(incident.id)}`}
            className={buttonClassName()}
          >
            Ouvrir l’incident
          </Link>
        </div>
      </div>
    </article>
  );
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

  const command = commands.find((item) => item.id === id);

  if (!command) {
    notFound();
  }

  const normalized = normalizeCommand(command);

  const usableIncidents = incidents.filter((item) => !isLegacyNoiseIncident(item));
  const linkedIncidents = findLinkedIncidents(usableIncidents, normalized);

  const canOpenFlow = Boolean(normalized.flowId || normalized.rootEventId);
  const flowTarget = normalized.flowId || normalized.rootEventId;

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
          / {normalized.capability}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {normalized.capability}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              normalized.status
            )}`}
          >
            {normalized.status.toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            Worker {normalized.worker}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            {normalized.workspace}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(normalized.createdAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Started</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(normalized.startedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Finished</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(normalized.finishedAt)}
          </div>
        </div>

        <div className="xl:col-span-3">
          <div className={cardClassName()}>
            <div className="text-sm text-zinc-400">Durée totale</div>
            <div className="mt-3 text-xl font-semibold text-white">
              {formatDurationMs(normalized.durationMs)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Contexte command
          </div>

          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              Capability: <span className="text-zinc-200">{normalized.capability}</span>
            </div>
            <div>
              Status: <span className="text-zinc-200">{normalized.status.toUpperCase()}</span>
            </div>
            <div>
              Worker: <span className="text-zinc-200">{normalized.worker}</span>
            </div>
            <div>
              Workspace: <span className="text-zinc-200">{normalized.workspace}</span>
            </div>
            <div className="break-all">
              Record ID: <span className="text-zinc-200">{normalized.recordId || "—"}</span>
            </div>
            <div className="break-all">
              Command ID: <span className="text-zinc-200">{normalized.commandId || "—"}</span>
            </div>
            <div>
              Retry count: <span className="text-zinc-200">0</span>
            </div>
            <div className="break-all">
              Parent command:{" "}
              <span className="text-zinc-200">{normalized.parentCommandId || "—"}</span>
            </div>
            <div className="break-all">
              Run record: <span className="text-zinc-200">{normalized.runRecordId || "—"}</span>
            </div>
            <div>
              Last error: <span className="text-zinc-200">{normalized.lastError || "—"}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Liens flow
          </div>

          <div className="space-y-3 text-sm text-zinc-400">
            <div className="break-all">
              Flow: <span className="text-zinc-200">{normalized.flowId || "—"}</span>
            </div>
            <div className="break-all">
              Root event:{" "}
              <span className="text-zinc-200">{normalized.rootEventId || "—"}</span>
            </div>
            <div className="break-all">
              Run record:{" "}
              <span className="text-zinc-200">{normalized.runRecordId || "—"}</span>
            </div>
            <div className="break-all">
              Parent command:{" "}
              <span className="text-zinc-200">{normalized.parentCommandId || "—"}</span>
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
            Decision: <span className="text-zinc-200">{normalized.decision || "—"}</span>
          </div>
          <div>
            Reason: <span className="text-zinc-200">{normalized.reason || "—"}</span>
          </div>
          <div>
            Severity: <span className="text-zinc-200">{normalized.severity || "—"}</span>
          </div>
          <div>
            Category: <span className="text-zinc-200">{normalized.category || "—"}</span>
          </div>
          <div>
            HTTP status: <span className="text-zinc-200">{normalized.httpStatus || "—"}</span>
          </div>
          <div>
            incident_create_ok:{" "}
            <span className="text-zinc-200">
              {normalized.incidentCreateOk === null
                ? "—"
                : String(normalized.incidentCreateOk)}
            </span>
          </div>
          <div className="break-all">
            incident_record_id:{" "}
            <span className="text-zinc-200">
              {normalized.incidentRecordId || "—"}
            </span>
          </div>
          <div>
            spawned_count:{" "}
            <span className="text-zinc-200">{normalized.spawnedCount || "—"}</span>
          </div>
          <div className="md:col-span-2">
            next capability:{" "}
            <span className="text-zinc-200">{normalized.nextCapability || "—"}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Input preview</div>
        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-200">
{normalized.inputPreview}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Result preview</div>
        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-200">
{normalized.resultPreview}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Incidents liés</div>

        {linkedIncidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-base text-zinc-400">
            <div>Aucun incident lié détecté pour cette command.</div>

            <div className="mt-4 space-y-2 text-zinc-500">
              <div>
                Vérification secondaire effectuée via{" "}
                <span className="text-zinc-300">flow_id</span>,{" "}
                <span className="text-zinc-300">root_event_id</span> et{" "}
                <span className="text-zinc-300">run_record_id</span>.
              </div>

              <div>
                incident_record_id est{" "}
                <span className="text-zinc-300">
                  {normalized.incidentRecordId || "absent"}
                </span>.
              </div>

              <div>
                incident_create_ok ={" "}
                <span className="text-zinc-300">
                  {normalized.incidentCreateOk === null
                    ? "—"
                    : String(normalized.incidentCreateOk)}
                </span>
                .
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {linkedIncidents.map(({ incident }) => (
              <LinkedIncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/commands" className={buttonClassName()}>
            Retour à la liste commands
          </Link>

          <Link href="/commands" className={buttonClassName()}>
            Voir toutes les commands
          </Link>

          {canOpenFlow && flowTarget ? (
            <Link
              href={`/flows/${encodeURIComponent(flowTarget)}`}
              className={buttonClassName()}
            >
              Retour au flow source
            </Link>
          ) : (
            <div className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-zinc-500">
              Retour au flow source
            </div>
          )}

          {canOpenFlow && flowTarget ? (
            <Link
              href={`/flows/${encodeURIComponent(flowTarget)}`}
              className={buttonClassName("primary")}
            >
              Ouvrir le flow lié
            </Link>
          ) : (
            <div className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-zinc-500">
              Ouvrir le flow lié
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
