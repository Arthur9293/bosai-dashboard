import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCommands, fetchEvents } from "@/lib/api";

type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[];
  mapped_capability?: string;
  processed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  flow_id?: string | null;
  root_event_id?: string | null;
  workspace_id?: string | null;
  payload?: Record<string, unknown> | unknown;
};

type CommandItem = {
  id: string;
  flow_id?: string | null;
  root_event_id?: string | null;
  input_json?: unknown;
  command_input_json?: unknown;
  payload_json?: unknown;
  input?: unknown;
  result_json?: unknown;
  result?: unknown;
  output_json?: unknown;
  output?: unknown;
  [key: string]: unknown;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function tone(status?: string) {
  const s = (status || "").toLowerCase();

  if (["processed", "done", "success"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["new"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["ignored"].includes(s)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function buttonClassName(variant: "default" | "primary" = "default") {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-base font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-white transition hover:bg-white/10";
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        const text = String(item ?? "").trim();
        if (text) return text;
      }
      continue;
    }

    const text = String(value).trim();
    if (text) return text;
  }

  return "";
}

function parseJsonMaybe(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return {};

  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  return {};
}

function getEventType(event: EventItem) {
  return event.mapped_capability || event.event_type || event.type || "Event detail";
}

function getLinkedCommandValue(event: EventItem) {
  return firstNonEmptyString(event.command_id, event.linked_command) || "—";
}

function getCommandFlowTarget(command?: CommandItem | null) {
  if (!command) return "";

  const inputPayload = parseJsonMaybe(
    command.input_json ??
      command.command_input_json ??
      command.payload_json ??
      command.input ??
      null
  );

  const resultPayload = parseJsonMaybe(
    command.result_json ?? command.result ?? command.output_json ?? command.output ?? null
  );

  return firstNonEmptyString(
    command.flow_id,
    command.root_event_id,
    inputPayload.flow_id,
    inputPayload.flowid,
    inputPayload.root_event_id,
    inputPayload.rootEventId,
    inputPayload.rooteventid,
    resultPayload.flow_id,
    resultPayload.flowid,
    resultPayload.root_event_id,
    resultPayload.rootEventId,
    resultPayload.rooteventid
  );
}

function getFlowId(event: EventItem, command?: CommandItem | null) {
  return (
    firstNonEmptyString(
      event.flow_id,
      event.root_event_id,
      getCommandFlowTarget(command)
    ) || "—"
  );
}

function getRootEventId(event: EventItem) {
  return firstNonEmptyString(event.root_event_id) || "—";
}

function getWorkspaceId(event: EventItem) {
  return firstNonEmptyString(event.workspace_id) || "—";
}

function getSourceValue(event: EventItem) {
  return firstNonEmptyString(event.source) || "—";
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  let data: any = null;
  let commandsData: any = null;

  try {
    data = await fetchEvents();
  } catch {
    data = null;
  }

  try {
    commandsData = await fetchCommands();
  } catch {
    commandsData = null;
  }

  const events: EventItem[] = Array.isArray(data?.events) ? data.events : [];
  const commands: CommandItem[] = Array.isArray(commandsData?.commands)
    ? commandsData.commands
    : [];

  const event = events.find((item) => item.id === id);

  if (!event) {
    notFound();
  }

  const linkedCommand = getLinkedCommandValue(event);
  const linkedCommandRecord =
    linkedCommand !== "—"
      ? commands.find((item) => item.id === linkedCommand)
      : undefined;

  const flowId = getFlowId(event, linkedCommandRecord);
  const rootEventId = getRootEventId(event);
  const workspaceId = getWorkspaceId(event);
  const sourceValue = getSourceValue(event);

  const hasCommand = linkedCommand !== "—";
  const hasFlow = flowId !== "—";

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
          / {getEventType(event)}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {getEventType(event)}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              event.status
            )}`}
          >
            {(event.status || "unknown").toUpperCase()}
          </span>

          {event.command_created ? (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
              COMMAND CREATED
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            {workspaceId}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(event.created_at || null)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Updated</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(event.updated_at || null)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Processed</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(event.processed_at || null)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Event identity</div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            ID: <span className="break-all text-zinc-300">{event.id}</span>
          </div>
          <div>
            Event type:{" "}
            <span className="text-zinc-300">
              {event.event_type || event.type || "—"}
            </span>
          </div>
          <div>
            Capability:{" "}
            <span className="text-zinc-300">{event.mapped_capability || "—"}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-300">{workspaceId}</span>
          </div>
          <div>
            Source: <span className="text-zinc-300">{sourceValue}</span>
          </div>
          <div>
            Run: <span className="break-all text-zinc-300">{event.run_id || "—"}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Pipeline linking</div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
          <div>
            Command created:{" "}
            <span className="text-zinc-300">
              {event.command_created === true ? "Yes" : "No"}
            </span>
          </div>
          <div>
            Linked command:{" "}
            <span className="break-all text-zinc-300">{linkedCommand}</span>
          </div>
          <div>
            Flow: <span className="break-all text-zinc-300">{flowId}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-300">{rootEventId}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Payload snapshot</div>

        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-xs text-zinc-300">
{JSON.stringify(event.payload ?? {}, null, 2)}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation summary</div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Event ID
            </div>
            <div className="mt-3 break-all text-xl font-semibold text-white">
              {event.id}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Flow target
            </div>
            <div className="mt-3 break-all text-xl font-semibold text-white">
              {flowId}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Command target
            </div>
            <div className="mt-3 break-all text-xl font-semibold text-white">
              {linkedCommand}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Status
            </div>
            <div className="mt-3 text-xl font-semibold text-white">
              {(event.status || "unknown").toUpperCase()}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/events" className={buttonClassName()}>
            Retour à la liste events
          </Link>

          <Link href="/events" className={buttonClassName("primary")}>
            Voir tous les events
          </Link>

          {hasCommand ? (
            <Link
              href={`/commands/${encodeURIComponent(linkedCommand)}`}
              className={buttonClassName()}
            >
              Ouvrir la command liée
            </Link>
          ) : (
            <div className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-base font-medium text-zinc-500">
              Ouvrir la command liée
            </div>
          )}

          {hasFlow ? (
            <Link
              href={`/flows/${encodeURIComponent(flowId)}`}
              className={buttonClassName()}
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
