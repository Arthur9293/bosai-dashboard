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

function getRunRecordId(run: RunRecord): string {
  return (
    toText(run.id) ||
    toText(run.ID) ||
    toText(run.record_id) ||
    toText(run.Record_ID) ||
    ""
  );
}

function getRunId(run: RunRecord): string {
  return (
    toText(run.run_id) ||
    toText(run.Run_ID) ||
    toText(run.runId) ||
    toText(run.RunId) ||
    ""
  );
}

function getRunCapability(run: RunRecord): string {
  return (
    toText(run.capability) ||
    toText(run.Capability) ||
    toText(run.name) ||
    toText(run.Name) ||
    "Unknown capability"
  );
}

function getRunStatus(run: RunRecord): string {
  return (
    toText(run.status) ||
    toText(run.Status) ||
    toText(run.status_select) ||
    toText(run.Status_select) ||
    "unknown"
  );
}

function getRunWorker(run: RunRecord): string {
  return toText(run.worker) || toText(run.Worker) || "—";
}

function getRunPriority(run: RunRecord): string {
  const value =
    toText(run.priority) ||
    toText(run.Priority) ||
    toText(run.priority_score) ||
    toText(run.Priority_Score);

  return value || "—";
}

function getRunCreatedAt(run: RunRecord): string {
  return (
    toText(run.created_at) ||
    toText(run.Created_At) ||
    toText(run.started_at) ||
    toText(run.Started_At) ||
    ""
  );
}

function getRunStartedAt(run: RunRecord): string {
  return toText(run.started_at) || toText(run.Started_At) || "";
}

function getRunFinishedAt(run: RunRecord): string {
  return toText(run.finished_at) || toText(run.Finished_At) || "";
}

function getRunWorkspace(run: RunRecord): string {
  return (
    toText(run.workspace_id) ||
    toText(run.Workspace_ID) ||
    toText(run.workspace) ||
    toText(run.Workspace) ||
    "—"
  );
}

function getRunAppName(run: RunRecord): string {
  return toText(run.app_name) || toText(run.App_Name) || "—";
}

function getRunAppVersion(run: RunRecord): string {
  return toText(run.app_version) || toText(run.App_Version) || "—";
}

function getRunIdempotencyKey(run: RunRecord): string {
  return (
    toText(run.idempotency_key) ||
    toText(run.Idempotency_Key) ||
    toText(run.idempotencyKey) ||
    "—"
  );
}

function getRunDryRun(run: RunRecord): boolean {
  return (
    toBoolean(run.dry_run) ||
    toBoolean(run.Dry_Run) ||
    toBoolean(run.dryRun) ||
    false
  );
}

function getRunInput(run: RunRecord): unknown {
  return (
    run.input ??
    run.Input ??
    run.input_json ??
    run.Input_JSON ??
    run.payload ??
    run.Payload ??
    {}
  );
}

function getRunResult(run: RunRecord): unknown {
  return (
    run.result ??
    run.Result ??
    run.result_json ??
    run.Result_JSON ??
    run.output ??
    run.Output ??
    {}
  );
}

function getRunDurationMs(run: RunRecord): number {
  const direct =
    toNumber(run.duration_ms) ||
    toNumber(run.Duration_ms) ||
    toNumber(run.durationMs);

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const startedAt = new Date(getRunStartedAt(run) || 0).getTime();
  const finishedAt = new Date(getRunFinishedAt(run) || 0).getTime();

  if (
    Number.isFinite(startedAt) &&
    Number.isFinite(finishedAt) &&
    startedAt > 0 &&
    finishedAt >= startedAt
  ) {
    return finishedAt - startedAt;
  }

  return 0;
}

/* ------------------------------- Commands ------------------------------- */

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandRunRecordId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.run_record_id) ||
    toText(input.run_record_id) ||
    toText(input.runRecordId) ||
    toText(result.run_record_id) ||
    toText(result.runRecordId) ||
    ""
  );
}

function getCommandRunId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.linked_run) ||
    toText(input.run_id) ||
    toText(input.runId) ||
    toText(result.run_id) ||
    toText(result.runId) ||
    ""
  );
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

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.root_event_id) ||
    toText(input.root_event_id) ||
    toText(input.rootEventId) ||
    toText(result.root_event_id) ||
    toText(result.rootEventId) ||
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

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toText(command.capability) ||
    toText(input.capability) ||
    toText(result.capability) ||
    "Unknown capability"
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

/* -------------------------------- Events -------------------------------- */

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventRunId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toText(event.run_id) ||
    toText(record.run_id) ||
    toText(record.Run_ID) ||
    toText(payload.run_id) ||
    toText(payload.runId) ||
    toText(payload.run_record_id) ||
    toText(payload.runRecordId) ||
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

function getEventCapability(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toText(event.mapped_capability) ||
    toText(payload.mapped_capability) ||
    toText(payload.capability) ||
    "—"
  );
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

function getEventStatus(event: EventItem): string {
  return toText(event.status) || "unknown";
}

/* ------------------------------- Incidents ------------------------------- */

function getIncidentStatus(incident: IncidentItem): string {
  const direct = String(incident.status || incident.statut_incident || "").trim();
  if (direct) return direct;

  const sla = String(incident.sla_status || "").trim().toLowerCase();
  const remaining =
    typeof incident.sla_remaining_minutes === "number"
      ? incident.sla_remaining_minutes
      : undefined;

  if (sla === "breached") return "Open";
  if (remaining !== undefined && remaining < 0) return "Open";

  return "—";
}

function getIncidentTitle(incident: IncidentItem): string {
  return incident.title || incident.name || incident.error_id || "Untitled incident";
}

/* -------------------------------- Hrefs -------------------------------- */

function buildFlowHref(
  relatedCommands: CommandItem[],
  relatedEvents: EventItem[],
  relatedIncidents: IncidentItem[]
): string {
  const fromCommand =
    relatedCommands.find((item) => getCommandFlowId(item))?.flow_id ||
    relatedCommands.find((item) => getCommandRootEventId(item))?.root_event_id ||
    relatedCommands.find((item) => getCommandSourceEventId(item))?.source_event_id;

  if (fromCommand) {
    return `/flows/${encodeURIComponent(String(fromCommand))}`;
  }

  const fromEvent =
    relatedEvents.find((item) => getEventFlowId(item))?.flow_id ||
    relatedEvents.find((item) => getEventRootEventId(item))?.root_event_id ||
    relatedEvents.find((item) => getEventSourceRecordId(item))?.source_record_id ||
    relatedEvents.find((item) => item.source_event_id)?.source_event_id;

  if (fromEvent) {
    return `/flows/${encodeURIComponent(String(fromEvent))}`;
  }

  const fromIncident =
    relatedIncidents.find((item) => item.flow_id)?.flow_id ||
    relatedIncidents.find((item) => item.root_event_id)?.root_event_id ||
    relatedIncidents.find((item) => item.source_record_id)?.source_record_id;

  if (fromIncident) {
    return `/flows/${encodeURIComponent(String(fromIncident))}`;
  }

  return "";
}

function buildEventHref(relatedEvents: EventItem[]): string {
  const eventId = relatedEvents[0]?.id;
  return eventId ? `/events/${encodeURIComponent(String(eventId))}` : "";
}

function buildCommandHref(relatedCommands: CommandItem[]): string {
  const commandId = relatedCommands[0]?.id;
  return commandId ? `/commands/${encodeURIComponent(String(commandId))}` : "";
}

function buildIncidentHref(relatedIncidents: IncidentItem[]): string {
  const incidentId = relatedIncidents[0]?.id;
  return incidentId ? `/incidents/${encodeURIComponent(String(incidentId))}` : "";
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
        return (
          getRunRecordId(record) === id ||
          getRunId(record) === id
        );
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
  const inputJson = stringifyPretty(getRunInput(run));
  const resultJson = stringifyPretty(getRunResult(run));

  let relatedCommands: CommandItem[] = [];
  let relatedEvents: EventItem[] = [];
  let relatedIncidents: IncidentItem[] = [];

  try {
    const commandsData = await fetchCommands(500);
    const commands = Array.isArray(commandsData?.commands)
      ? commandsData.commands
      : [];

    relatedCommands = commands.filter((command) => {
      const commandRunRecordId = getCommandRunRecordId(command);
      const commandRunId = getCommandRunId(command);

      return Boolean(
        (recordId && commandRunRecordId === recordId) ||
          (runId && commandRunId === runId) ||
          (runId && commandRunRecordId === runId) ||
          (recordId && commandRunId === recordId)
      );
    });
  } catch {
    relatedCommands = [];
  }

  try {
    const eventsData = await fetchEvents(500);
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];
    const relatedCommandIds = relatedCommands.map((item) => String(item.id || ""));

    relatedEvents = events.filter((event) => {
      const eventRunId = getEventRunId(event);
      const linkedCommand = getEventLinkedCommand(event);

      return Boolean(
        (runId && eventRunId === runId) ||
          (recordId && eventRunId === recordId) ||
          (linkedCommand && relatedCommandIds.includes(linkedCommand))
      );
    });
  } catch {
    relatedEvents = [];
  }

  try {
    const incidentsData = await fetchIncidents(300);
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];
    const relatedCommandIds = relatedCommands.map((item) => String(item.id || ""));

    relatedIncidents = incidents.filter((incident) => {
      const incidentRunRecordId = toText(incident.run_record_id);
      const incidentLinkedRun = toText(incident.linked_run);
      const incidentRunId = toText(incident.run_id);
      const incidentCommandId = toText(incident.command_id);
      const incidentLinkedCommand = toText(incident.linked_command);

      return Boolean(
        (recordId && incidentRunRecordId === recordId) ||
          (runId && incidentLinkedRun === runId) ||
          (recordId && incidentLinkedRun === recordId) ||
          (runId && incidentRunId === runId) ||
          (incidentCommandId && relatedCommandIds.includes(incidentCommandId)) ||
          (incidentLinkedCommand && relatedCommandIds.includes(incidentLinkedCommand))
      );
    });
  } catch {
    relatedIncidents = [];
  }

  const flowHref = buildFlowHref(relatedCommands, relatedEvents, relatedIncidents);
  const eventHref = buildEventHref(relatedEvents);
  const commandHref = buildCommandHref(relatedCommands);
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
            Record ID: <span className="break-all text-zinc-200">{recordId || "—"}</span>
          </div>
          <div>
            Run ID: <span className="break-all text-zinc-200">{runId || "—"}</span>
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
          <div className="md:col-span-2 xl:col-span-3">
            Idempotency key:{" "}
            <span className="break-all text-zinc-200">{idempotencyKey}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related commands</div>

          {relatedCommands.length === 0 ? (
            <div className={emptyStateClassName()}>
              Aucune command liée détectée pour ce run.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedCommands.slice(0, 5).map((command) => (
                <Link
                  key={String(command.id)}
                  href={`/commands/${encodeURIComponent(String(command.id))}`}
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
                        {String(command.id || "—")}
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
              ))}
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
              {relatedIncidents.slice(0, 5).map((incident) => (
                <Link
                  key={String(incident.id)}
                  href={`/incidents/${encodeURIComponent(String(incident.id))}`}
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
                        {String(incident.id || "—")}
                      </span>
                    </div>
                    <div>
                      SLA:{" "}
                      <span className="text-zinc-200">
                        {toText(incident.sla_status, "—")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
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
