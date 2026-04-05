// src/app/app/events/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchEvents } from "../../../../lib/api";

type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[] | string;
  mapped_capability?: string;
  processed_at?: string;
  created_at?: string;
  updated_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  flow_id?: string | null;
  root_event_id?: string | null;
  workspace_id?: string | null;
  payload?: unknown;
  [key: string]: unknown;
};

function toText(value: unknown, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function firstText(values: unknown[], fallback = "—") {
  for (const value of values) {
    const text = toText(value, "");
    if (text) return text;
  }
  return fallback;
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
  const parsed = parseJsonMaybe(value);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  return {};
}

function prettyJson(value: unknown) {
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
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
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
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function metricCardClassName() {
  return "rounded-2xl border border-white/10 bg-black/20 p-5";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
}

function getPayload(evt: EventItem) {
  return asRecord(evt.payload);
}

function getEventType(evt: EventItem) {
  const payload = getPayload(evt);

  return firstText(
    [
      evt.event_type,
      evt.type,
      payload.event_type,
      payload.eventType,
      payload.type,
    ],
    "unknown"
  );
}

function getMappedCapability(evt: EventItem) {
  const payload = getPayload(evt);

  return firstText(
    [
      evt.mapped_capability,
      payload.mapped_capability,
      payload.mappedCapability,
      payload.capability,
    ],
    "—"
  );
}

function getLinkedCommandValue(evt: EventItem) {
  const payload = getPayload(evt);

  if (evt.command_id && String(evt.command_id).trim()) {
    return String(evt.command_id).trim();
  }

  if (Array.isArray(evt.linked_command) && evt.linked_command.length > 0) {
    const first = String(evt.linked_command[0] ?? "").trim();
    if (first) return first;
  }

  if (typeof evt.linked_command === "string" && evt.linked_command.trim()) {
    return evt.linked_command.trim();
  }

  return firstText(
    [
      payload.command_id,
      payload.commandId,
      payload.commandid,
      payload.linked_command,
      payload.linkedCommand,
    ],
    "—"
  );
}

function getFlowId(evt: EventItem) {
  const payload = getPayload(evt);

  return firstText(
    [
      evt.flow_id,
      payload.flow_id,
      payload.flowId,
      payload.flowid,
    ],
    "—"
  );
}

function getRootEventId(evt: EventItem) {
  const payload = getPayload(evt);

  return firstText(
    [
      evt.root_event_id,
      payload.root_event_id,
      payload.rootEventId,
      payload.rooteventid,
      payload.event_id,
      payload.eventId,
    ],
    "—"
  );
}

function getWorkspace(evt: EventItem) {
  const payload = getPayload(evt);

  return firstText(
    [
      evt.workspace_id,
      payload.workspace_id,
      payload.workspaceId,
      payload.workspaceid,
    ],
    "—"
  );
}

function getSource(evt: EventItem) {
  const payload = getPayload(evt);
  return firstText([evt.source, payload.source], "—");
}

function getRunId(evt: EventItem) {
  const payload = getPayload(evt);

  return firstText([evt.run_id, payload.run_id, payload.runId], "—");
}

function wasCommandCreated(evt: EventItem) {
  const payload = getPayload(evt);

  if (typeof evt.command_created === "boolean") {
    return evt.command_created;
  }

  if (typeof payload.command_created === "boolean") {
    return payload.command_created as boolean;
  }

  return false;
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  let data: any = null;

  try {
    data = await fetchEvents();
  } catch {
    data = null;
  }

  const events: EventItem[] = Array.isArray(data?.events) ? data.events : [];
  const event = events.find((item) => String(item.id) === id);

  if (!event) {
    notFound();
  }

  const linkedCommand = getLinkedCommandValue(event);
  const flowId = getFlowId(event);
  const rootEventId = getRootEventId(event);
  const workspace = getWorkspace(event);
  const source = getSource(event);
  const runId = getRunId(event);
  const eventType = getEventType(event);
  const capability = getMappedCapability(event);

  const hasCommand = linkedCommand !== "—";
  const flowTarget = flowId !== "—" ? flowId : rootEventId !== "—" ? rootEventId : "";
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
          / {capability !== "—" ? capability : eventType}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {capability !== "—" ? capability : eventType}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              event.status
            )}`}
          >
            {toText(event.status, "unknown").toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-200">
            {wasCommandCreated(event) ? "COMMAND CREATED" : "NO COMMAND"}
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
            {formatDate(toText(event.created_at, ""))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Updated</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(toText(event.updated_at, ""))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Processed</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(toText(event.processed_at, ""))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Source</div>
          <div className="mt-3 break-all text-xl font-semibold text-white">
            {source}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Event identity
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              ID: <span className="break-all text-zinc-200">{event.id}</span>
            </div>

            <div>
              Event type: <span className="text-zinc-200">{eventType}</span>
            </div>

            <div>
              Capability: <span className="text-zinc-200">{capability}</span>
            </div>

            <div>
              Workspace: <span className="text-zinc-200">{workspace}</span>
            </div>

            <div>
              Source: <span className="text-zinc-200">{source}</span>
            </div>

            <div>
              Run: <span className="break-all text-zinc-200">{runId}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Pipeline linking
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              Command created:{" "}
              <span className="text-zinc-200">
                {wasCommandCreated(event) ? "Yes" : "No"}
              </span>
            </div>

            <div>
              Linked command:{" "}
              <span className="break-all text-zinc-200">{linkedCommand}</span>
            </div>

            <div>
              Flow: <span className="break-all text-zinc-200">{flowId}</span>
            </div>

            <div>
              Root event:{" "}
              <span className="break-all text-zinc-200">{rootEventId}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Event payload
        </div>

        <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-200">
{prettyJson(event.payload ?? {})}
        </pre>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium text-white">
            Navigation summary
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={metricCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Event ID
              </div>
              <div className="mt-2 break-all text-sm text-zinc-200">
                {event.id}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Flow target
              </div>
              <div className="mt-2 break-all text-sm text-zinc-200">
                {flowTarget || "—"}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Command target
              </div>
              <div className="mt-2 break-all text-sm text-zinc-200">
                {linkedCommand}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Status
              </div>
              <div className="mt-2 text-sm text-zinc-200">
                {toText(event.status, "unknown").toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
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
              <div className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-500">
                Ouvrir la command liée
              </div>
            )}

            {hasFlow ? (
              <Link
                href={`/flows/${encodeURIComponent(flowTarget)}`}
                className={actionLinkClassName("soft")}
              >
                Ouvrir le flow lié
              </Link>
            ) : (
              <div className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-500">
                Ouvrir le flow lié
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
