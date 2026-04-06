import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommandById,
  fetchCommands,
  fetchEvents,
  fetchIncidents,
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

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
) {
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

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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
  return Array.from(new Set(values.filter(Boolean)));
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function tone(status?: string): string {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["running", "processing"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["ignored"].includes(normalized)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
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
    toTextOrEmpty(result.workspace_id) ||
    toTextOrEmpty(result.workspaceId) ||
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
    toTextOrEmpty(result.run_record_id) ||
    toTextOrEmpty(result.runRecordId) ||
    toTextOrEmpty(result.run_id) ||
    toTextOrEmpty(result.runId) ||
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

/* ------------------------------ Event helpers ----------------------------- */

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventLinkedCommand(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.command_id) ||
    toTextOrEmpty(record.command_id) ||
    toTextOrEmpty(record.Command_ID) ||
    toTextOrEmpty(record.linked_command) ||
    toTextOrEmpty(record.Linked_Command) ||
    toTextOrEmpty(payload.command_id) ||
    toTextOrEmpty(payload.commandId) ||
    ""
  );
}

function getEventIdCandidates(event: EventItem): string[] {
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
    toTextOrEmpty(payload.flow_id),
    toTextOrEmpty(payload.flowId),
  ]);
}

/* ----------------------------- Incident helpers --------------------------- */

function getIncidentIdCandidates(incident: IncidentItem): string[] {
  return uniq([
    toTextOrEmpty(incident.id),
    toTextOrEmpty(incident.flow_id),
    toTextOrEmpty(incident.root_event_id),
    toTextOrEmpty((incident as Record<string, unknown>).source_record_id),
    toTextOrEmpty(incident.command_id),
    toTextOrEmpty(incident.linked_command),
  ]);
}

/* ------------------------------- Href helpers ----------------------------- */

function buildFlowHref(command: CommandItem): string {
  const flowId = getCommandFlowId(command);
  if (flowId) {
    return `/flows/${encodeURIComponent(flowId)}`;
  }

  const rootEventId = getCommandRootEventId(command);
  if (rootEventId) {
    return `/flows/${encodeURIComponent(rootEventId)}`;
  }

  const sourceEventId = getCommandSourceEventId(command);
  if (sourceEventId) {
    return `/flows/${encodeURIComponent(sourceEventId)}`;
  }

  if (command.id) {
    return `/flows/${encodeURIComponent(command.id)}`;
  }

  return "";
}

function buildSafeEventHref(
  matchedEvent: EventItem | null,
  command: CommandItem
): string {
  if (matchedEvent?.id) {
    return `/events/${encodeURIComponent(matchedEvent.id)}`;
  }

  const rootEventId = getCommandRootEventId(command);
  if (rootEventId && isRecordIdLike(rootEventId)) {
    return `/events/${encodeURIComponent(rootEventId)}`;
  }

  const sourceEventId = getCommandSourceEventId(command);
  if (sourceEventId && isRecordIdLike(sourceEventId)) {
    return `/events/${encodeURIComponent(sourceEventId)}`;
  }

  return "";
}

function buildIncidentHref(matchedIncident: IncidentItem | null): string {
  if (!matchedIncident?.id) return "";
  return `/incidents/${encodeURIComponent(matchedIncident.id)}`;
}

export default async function CommandDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let command: CommandItem | null = null;

  try {
    command = await fetchCommandById(id, 500);
  } catch {
    command = null;
  }

  if (!command) {
    try {
      const commandsData = await fetchCommands(500);
      const commands = Array.isArray(commandsData?.commands)
        ? commandsData.commands
        : [];

      command = commands.find((item) => String(item.id) === id) || null;
    } catch {
      command = null;
    }
  }

  if (!command) {
    notFound();
  }

  const title = getCommandTitle(command);
  const status = getCommandStatus(command);
  const capability = getCommandCapability(command);
  const workspace = getCommandWorkspace(command);
  const flowId = getCommandFlowId(command);
  const rootEventId = getCommandRootEventId(command);
  const sourceEventId = getCommandSourceEventId(command);
  const runId = getCommandRunId(command);
  const parentId = getCommandParentId(command);
  const errorText = getCommandError(command);
  const toolKey = getCommandToolKey(command);
  const toolMode = getCommandToolMode(command);

  const identifiers = uniq([
    String(command.id || ""),
    flowId,
    rootEventId,
    sourceEventId,
    runId === "—" ? "" : runId,
  ]);

  let matchedEvent: EventItem | null = null;
  try {
    const eventsData = await fetchEvents(500);
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

    matchedEvent =
      events.find((event) => {
        const linkedCommand = getEventLinkedCommand(event);
        if (linkedCommand && linkedCommand === String(command?.id || "")) {
          return true;
        }

        const candidates = getEventIdCandidates(event);
        return candidates.some((candidate) => identifiers.includes(candidate));
      }) || null;
  } catch {
    matchedEvent = null;
  }

  let matchedIncident: IncidentItem | null = null;
  try {
    const incidentsData = await fetchIncidents(300);
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];

    matchedIncident =
      incidents.find((incident) => {
        const candidates = getIncidentIdCandidates(incident);
        return candidates.some((candidate) => identifiers.includes(candidate));
      }) || null;
  } catch {
    matchedIncident = null;
  }

  const flowHref = buildFlowHref(command);
  const eventHref = buildSafeEventHref(matchedEvent, command);
  const incidentHref = buildIncidentHref(matchedIncident);

  const hasFlow = flowHref !== "";
  const hasEvent = eventHref !== "";
  const hasIncident = incidentHref !== "";

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

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              status
            )}`}
          >
            {status.toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {capability}
          </span>

          {toolKey ? (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
              TOOL {toolKey}
            </span>
          ) : null}

          {toolMode ? (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
              MODE {toolMode}
            </span>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getCommandCreatedAt(command))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Started</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getCommandStartedAt(command))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Finished</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getCommandFinishedAt(command))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Updated</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getCommandUpdatedAt(command))}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Command identity</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            ID: <span className="break-all text-zinc-200">{command.id}</span>
          </div>
          <div>
            Status: <span className="text-zinc-200">{status}</span>
          </div>
          <div>
            Capability: <span className="text-zinc-200">{capability}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspace}</span>
          </div>
          <div>
            Run: <span className="break-all text-zinc-200">{runId}</span>
          </div>
          <div>
            Parent: <span className="break-all text-zinc-200">{parentId || "—"}</span>
          </div>
          <div>
            Flow: <span className="break-all text-zinc-200">{flowId || "—"}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-200">{rootEventId || "—"}</span>
          </div>
          <div>
            Source event:{" "}
            <span className="break-all text-zinc-200">{sourceEventId || "—"}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Routing diagnostic</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            Event match:{" "}
            <span className="break-all text-zinc-200">
              {matchedEvent?.id || "Aucun event lié trouvé"}
            </span>
          </div>
          <div>
            Incident match:{" "}
            <span className="break-all text-zinc-200">
              {matchedIncident?.id || "Aucun incident lié trouvé"}
            </span>
          </div>
          <div>
            Flow target:{" "}
            <span className="break-all text-zinc-200">
              {flowId || rootEventId || sourceEventId || command.id || "—"}
            </span>
          </div>
          <div>
            Error:{" "}
            <span className="break-all text-zinc-200">
              {errorText || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Input preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(command.input ?? {})}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Result preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(command.result ?? {})}
          </pre>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/commands" className={actionLinkClassName("soft")}>
            Retour à la liste commands
          </Link>

          <Link href="/commands" className={actionLinkClassName("primary")}>
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
      </section>
    </div>
  );
}
