import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchEvents,
  type CommandItem,
  type EventItem,
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
  variant: "default" | "primary" | "soft" = "default",
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

  return `${base} border border-white/10 bg-white/5 text-white hover:bg-white/10`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
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

function tone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (["processed", "done", "success"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued", "pending", "new"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["ignored"].includes(s)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventType(event: EventItem): string {
  return (
    toTextOrEmpty(event.event_type) ||
    toTextOrEmpty(event.type) ||
    toTextOrEmpty(getEventPayload(event).event_type) ||
    toTextOrEmpty(getEventPayload(event).type) ||
    "Event detail"
  );
}

function getEventStatus(event: EventItem): string {
  return toTextOrEmpty(event.status) || "unknown";
}

function getEventCapability(event: EventItem): string {
  return (
    toTextOrEmpty(event.mapped_capability) ||
    toTextOrEmpty(getEventPayload(event).mapped_capability) ||
    toTextOrEmpty(getEventPayload(event).capability) ||
    "—"
  );
}

function getEventWorkspace(event: EventItem): string {
  return (
    toTextOrEmpty(event.workspace_id) ||
    toTextOrEmpty(getEventPayload(event).workspace_id) ||
    toTextOrEmpty(getEventPayload(event).workspaceId) ||
    "—"
  );
}

function getEventSource(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.source) ||
    toTextOrEmpty(getEventPayload(event).source) ||
    "—"
  );
}

function getEventRunId(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.run_id) ||
    toTextOrEmpty(getEventPayload(event).run_id) ||
    toTextOrEmpty(getEventPayload(event).runRecordId) ||
    "—"
  );
}

function getLinkedCommandValue(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.command_id) ||
    toTextOrEmpty(record.command_id) ||
    toTextOrEmpty(record.Command_ID) ||
    toTextOrEmpty(record.linked_command) ||
    toTextOrEmpty(record.Linked_Command) ||
    toTextOrEmpty(getEventPayload(event).command_id) ||
    toTextOrEmpty(getEventPayload(event).commandId) ||
    ""
  );
}

function getFlowTarget(event: EventItem): string {
  if (event.flow_id && String(event.flow_id).trim()) {
    return String(event.flow_id).trim();
  }

  if (event.root_event_id && String(event.root_event_id).trim()) {
    return String(event.root_event_id).trim();
  }

  const payload = getEventPayload(event);

  const candidate =
    payload["flow_id"] ??
    payload["flowid"] ??
    payload["flowId"] ??
    payload["root_event_id"] ??
    payload["rootEventId"];

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  return "";
}

function getRootEventId(event: EventItem): string {
  return (
    toTextOrEmpty(event.root_event_id) ||
    toTextOrEmpty(getEventPayload(event).root_event_id) ||
    toTextOrEmpty(getEventPayload(event).rootEventId) ||
    ""
  );
}

function getCreatedAt(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.created_at) ||
    toTextOrEmpty(record.Created_At) ||
    ""
  );
}

function getUpdatedAt(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.updated_at) ||
    toTextOrEmpty(record.Updated_At) ||
    toTextOrEmpty(event.processed_at) ||
    ""
  );
}

function getProcessedAt(event: EventItem): string {
  return toTextOrEmpty(event.processed_at) || "";
}

function stringifyPretty(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: String(value) }, null, 2);
  }
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandRootEventId(command: CommandItem): string {
  return (
    toTextOrEmpty(command.root_event_id) ||
    toTextOrEmpty(getCommandInput(command).root_event_id) ||
    toTextOrEmpty(getCommandInput(command).rootEventId) ||
    toTextOrEmpty(getCommandResult(command).root_event_id) ||
    toTextOrEmpty(getCommandResult(command).rootEventId) ||
    ""
  );
}

function getCommandSourceEventId(command: CommandItem): string {
  const record = command as Record<string, unknown>;

  return (
    toTextOrEmpty(record.source_event_id) ||
    toTextOrEmpty(record.Source_Event_ID) ||
    toTextOrEmpty(getCommandInput(command).source_event_id) ||
    toTextOrEmpty(getCommandInput(command).sourceEventId) ||
    toTextOrEmpty(getCommandInput(command).event_id) ||
    toTextOrEmpty(getCommandInput(command).eventId) ||
    toTextOrEmpty(getCommandResult(command).source_event_id) ||
    toTextOrEmpty(getCommandResult(command).sourceEventId) ||
    toTextOrEmpty(getCommandResult(command).event_id) ||
    toTextOrEmpty(getCommandResult(command).eventId) ||
    ""
  );
}

function getCommandFlowId(command: CommandItem): string {
  return (
    toTextOrEmpty(command.flow_id) ||
    toTextOrEmpty(getCommandInput(command).flow_id) ||
    toTextOrEmpty(getCommandInput(command).flowId) ||
    toTextOrEmpty(getCommandResult(command).flow_id) ||
    toTextOrEmpty(getCommandResult(command).flowId) ||
    ""
  );
}

function getCommandWorkspace(command: CommandItem): string {
  return (
    toTextOrEmpty(command.workspace_id) ||
    toTextOrEmpty(getCommandInput(command).workspace_id) ||
    toTextOrEmpty(getCommandInput(command).workspaceId) ||
    toTextOrEmpty(getCommandResult(command).workspace_id) ||
    toTextOrEmpty(getCommandResult(command).workspaceId) ||
    ""
  );
}

function getCommandStartedAt(command: CommandItem): string {
  return toTextOrEmpty(command.started_at);
}

function getCommandFinishedAt(command: CommandItem): string {
  return toTextOrEmpty(command.finished_at);
}

function getCommandCapability(command: CommandItem): string {
  return (
    toTextOrEmpty(command.capability) ||
    toTextOrEmpty(getCommandInput(command).capability) ||
    toTextOrEmpty(getCommandResult(command).capability) ||
    ""
  );
}

function buildSyntheticEventFromCommand(
  id: string,
  command: CommandItem
): EventItem {
  return {
    id,
    event_type:
      toTextOrEmpty(getCommandInput(command).event_type) ||
      toTextOrEmpty(getCommandInput(command).type) ||
      getCommandCapability(command) ||
      "synthetic_event",
    status:
      toTextOrEmpty(command.status) ||
      toTextOrEmpty(getCommandResult(command).status) ||
      "processed",
    workspace_id: getCommandWorkspace(command),
    flow_id: getCommandFlowId(command),
    root_event_id: getCommandRootEventId(command),
    command_id: command.id,
    mapped_capability: getCommandCapability(command),
    created_at: getCommandStartedAt(command) || getCommandFinishedAt(command),
    updated_at: getCommandStartedAt(command) || getCommandFinishedAt(command),
    processed_at: getCommandFinishedAt(command) || getCommandStartedAt(command),
    payload: {
      source: "synthetic_from_command",
      command_id: command.id,
      reconstructed_from_command: true,
    },
  };
}

function isSyntheticEvent(event: EventItem): boolean {
  return toTextOrEmpty(getEventPayload(event).source) === "synthetic_from_command";
}

export default async function EventDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let event: EventItem | null = null;

  try {
    const data = await fetchEvents();
    const events = Array.isArray(data?.events) ? data.events : [];
    event = events.find((item) => String(item.id) === id) || null;
  } catch {
    event = null;
  }

  if (!event) {
    try {
      const commandsData = await fetchCommands();
      const commands = Array.isArray(commandsData?.commands)
        ? commandsData.commands
        : [];

      const matchedCommand =
        commands.find((command) => getCommandRootEventId(command) === id) ||
        commands.find((command) => getCommandSourceEventId(command) === id) ||
        null;

      if (matchedCommand) {
        event = buildSyntheticEventFromCommand(id, matchedCommand);
      }
    } catch {
      event = null;
    }
  }

  if (!event) {
    notFound();
  }

  const linkedCommand = getLinkedCommandValue(event);
  const flowTarget = getFlowTarget(event);
  const rootEventId = getRootEventId(event);
  const status = getEventStatus(event);
  const synthetic = isSyntheticEvent(event);

  const hasCommand = linkedCommand !== "";
  const hasFlow = Boolean(flowTarget);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/events"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Events
          </Link>{" "}
          / {getEventCapability(event) !== "—" ? getEventCapability(event) : getEventType(event)}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {getEventCapability(event) !== "—" ? getEventCapability(event) : getEventType(event)}
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
            COMMAND CREATED
          </span>

          {synthetic ? (
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300">
              FALLBACK FROM COMMAND
            </span>
          ) : null}
        </div>

        {synthetic ? (
          <p className="mt-4 max-w-3xl text-sm text-amber-300/90 sm:text-base">
            Cet event n’est pas revenu dans la fenêtre actuelle de /events. La
            page a été reconstruite automatiquement depuis la command liée pour
            éviter le 404.
          </p>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getCreatedAt(event))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Updated</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getUpdatedAt(event))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Processed</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getProcessedAt(event))}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Event identity</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            ID: <span className="break-all text-zinc-200">{event.id}</span>
          </div>
          <div>
            Event type: <span className="text-zinc-200">{getEventType(event)}</span>
          </div>
          <div>
            Capability: <span className="text-zinc-200">{getEventCapability(event)}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{getEventWorkspace(event)}</span>
          </div>
          <div>
            Source: <span className="text-zinc-200">{getEventSource(event)}</span>
          </div>
          <div>
            Run: <span className="text-zinc-200">{getEventRunId(event)}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Pipeline linking</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            Command created: <span className="text-zinc-200">Yes</span>
          </div>
          <div>
            Linked command:{" "}
            <span className="break-all text-zinc-200">
              {linkedCommand || "—"}
            </span>
          </div>
          <div>
            Flow: <span className="break-all text-zinc-200">{flowTarget || "—"}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-200">
              {rootEventId || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Payload snapshot</div>

        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(event.payload ?? {})}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation summary</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Event ID
            </div>
            <div className="mt-3 break-all text-2xl font-semibold text-white">
              {event.id}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Flow target
            </div>
            <div className="mt-3 break-all text-2xl font-semibold text-white">
              {flowTarget || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Command target
            </div>
            <div className="mt-3 break-all text-2xl font-semibold text-white">
              {linkedCommand || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Status
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {status.toUpperCase()}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/events" className={actionLinkClassName("soft")}>
            Retour à la liste events
          </Link>

          <Link href="/events" className={actionLinkClassName("primary")}>
            Voir tous les events
          </Link>

          {hasCommand ? (
            <Link
              href={`/commands/${encodeURIComponent(linkedCommand)}`}
              className={actionLinkClassName("soft")}
            >
              Ouvrir la command liée
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir la command liée
            </span>
          )}

          {hasFlow ? (
            <Link
              href={`/flows/${encodeURIComponent(flowTarget)}`}
              className={actionLinkClassName("soft")}
            >
              Ouvrir le flow lié
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir le flow lié
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
