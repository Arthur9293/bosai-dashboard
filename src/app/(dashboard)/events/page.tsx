// src/app/app/events/page.tsx

import Link from "next/link";
import { fetchEvents } from "@/lib/api";
import { PageHeader } from "../../../components/ui/page-header";

type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  status?: string;
  workspace_id?: string;
  flow_id?: string;
  root_event_id?: string;
  command_id?: string;
  linked_command?: string[] | string;
  mapped_capability?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_created?: boolean;
  payload?: unknown;
  [key: string]: unknown;
};

type EventStats = {
  new?: number;
  queued?: number;
  processed?: number;
  ignored?: number;
  error?: number;
  other?: number;
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function getPayload(event: EventItem) {
  return asRecord(event.payload);
}

function getEventType(event: EventItem) {
  const payload = getPayload(event);

  return firstText(
    [
      event.event_type,
      event.type,
      payload.event_type,
      payload.eventType,
      payload.type,
      event.mapped_capability,
      payload.mapped_capability,
      payload.capability,
    ],
    "unknown"
  );
}

function getEventStatus(event: EventItem) {
  const payload = getPayload(event);

  return firstText([event.status, payload.status], "unknown");
}

function getEventWorkspace(event: EventItem) {
  const payload = getPayload(event);

  return firstText(
    [
      event.workspace_id,
      payload.workspace_id,
      payload.workspaceId,
      payload.workspaceid,
    ],
    "—"
  );
}

function getFlowId(event: EventItem) {
  const payload = getPayload(event);

  return firstText(
    [
      event.flow_id,
      payload.flow_id,
      payload.flowId,
      payload.flowid,
    ],
    "—"
  );
}

function getRootEventId(event: EventItem) {
  const payload = getPayload(event);

  return firstText(
    [
      event.root_event_id,
      payload.root_event_id,
      payload.rootEventId,
      payload.rooteventid,
      payload.event_id,
      payload.eventId,
    ],
    "—"
  );
}

function getLinkedCommand(event: EventItem) {
  const payload = getPayload(event);

  if (event.command_id && String(event.command_id).trim()) {
    return String(event.command_id).trim();
  }

  if (Array.isArray(event.linked_command) && event.linked_command.length > 0) {
    const first = String(event.linked_command[0] ?? "").trim();
    if (first) return first;
  }

  if (typeof event.linked_command === "string" && event.linked_command.trim()) {
    return event.linked_command.trim();
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

function getMappedCapability(event: EventItem) {
  const payload = getPayload(event);

  return firstText(
    [
      event.mapped_capability,
      payload.mapped_capability,
      payload.mappedCapability,
      payload.capability,
    ],
    "—"
  );
}

function getEventSource(event: EventItem) {
  const payload = getPayload(event);

  return firstText([event.source, payload.source], "—");
}

function getRunId(event: EventItem) {
  const payload = getPayload(event);

  return firstText([event.run_id, payload.run_id, payload.runId], "—");
}

function getEventDate(event: EventItem) {
  return (
    firstText([event.updated_at, event.processed_at, event.created_at], "") ||
    null
  );
}

function wasCommandCreated(event: EventItem) {
  const payload = getPayload(event);

  if (typeof event.command_created === "boolean") {
    return event.command_created;
  }

  if (typeof payload.command_created === "boolean") {
    return payload.command_created as boolean;
  }

  return false;
}

function badgeTone(status?: string) {
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
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function statCardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function eventCardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6";
}

function miniCardClassName() {
  return "rounded-2xl border border-white/10 bg-black/20 p-4";
}

function actionLinkClassName(variant: "default" | "primary" | "soft" = "default") {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10";
}

function countByStatus(events: EventItem[], statuses: string[]) {
  const normalized = statuses.map((item) => item.toLowerCase());

  return events.filter((event) =>
    normalized.includes(getEventStatus(event).toLowerCase())
  ).length;
}

export default async function EventsPage() {
  let events: EventItem[] = [];
  let stats: EventStats = {};
  let sourceConnected = false;

  try {
    const data = await fetchEvents();

    if (Array.isArray(data?.events)) {
      events = data.events as EventItem[];
    }

    if (data?.stats && typeof data.stats === "object") {
      stats = data.stats as EventStats;
    }

    sourceConnected = true;
  } catch {
    events = [];
    stats = {};
    sourceConnected = false;
  }

  const newCount = stats.new ?? countByStatus(events, ["new"]);
  const queuedCount = stats.queued ?? countByStatus(events, ["queued", "pending"]);
  const processedCount =
    stats.processed ?? countByStatus(events, ["processed", "done", "success"]);
  const ignoredCount = stats.ignored ?? countByStatus(events, ["ignored"]);
  const errorCount = stats.error ?? countByStatus(events, ["error", "failed", "dead"]);
  const otherCount = stats.other ?? Math.max(0, events.length - (newCount + queuedCount + processedCount + ignoredCount + errorCount));

  const list = [...events]
    .sort(
      (a, b) =>
        new Date(getEventDate(b) || 0).getTime() -
        new Date(getEventDate(a) || 0).getTime()
    )
    .slice(0, 50);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Events"
        description="Flux des événements BOSAI. Cette vue affiche les events, leur statut, leur rattachement pipeline et les liens vers les commands et flows."
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["New", newCount],
          ["Queued", queuedCount],
          ["Processed", processedCount],
          ["Ignored", ignoredCount],
          ["Errors", errorCount],
          ["Other", otherCount],
        ].map(([label, value]) => (
          <div key={label} className={statCardClassName()}>
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-3 text-4xl font-semibold text-white">
              {formatNumber(value as number)}
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className={`${statCardClassName()} xl:col-span-1`}>
          <div className="text-sm text-zinc-400">Source status</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {sourceConnected ? "Connected" : "Unavailable"}
          </div>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                sourceConnected
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
              }`}
            >
              {sourceConnected ? "LIVE SOURCE" : "NO SOURCE"}
            </span>
          </div>
        </div>

        <div className={`${statCardClassName()} xl:col-span-3`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Event stream
              </div>
              <h2 className="mt-2 text-lg font-semibold text-white">
                Historique récent
              </h2>
            </div>

            <div className="text-sm text-zinc-500">{list.length} visible(s)</div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2 xl:grid-cols-4">
            <div className={miniCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Latest processed
              </div>
              <div className="mt-2 text-base text-zinc-200">
                {formatDate(
                  list.find((event) =>
                    ["processed", "done", "success"].includes(
                      getEventStatus(event).toLowerCase()
                    )
                  )
                    ? getEventDate(
                        list.find((event) =>
                          ["processed", "done", "success"].includes(
                            getEventStatus(event).toLowerCase()
                          )
                        ) as EventItem
                      )
                    : null
                )}
              </div>
            </div>

            <div className={miniCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Latest queued
              </div>
              <div className="mt-2 text-base text-zinc-200">
                {formatDate(
                  list.find((event) =>
                    ["queued", "pending", "new"].includes(
                      getEventStatus(event).toLowerCase()
                    )
                  )
                    ? getEventDate(
                        list.find((event) =>
                          ["queued", "pending", "new"].includes(
                            getEventStatus(event).toLowerCase()
                          )
                        ) as EventItem
                      )
                    : null
                )}
              </div>
            </div>

            <div className={miniCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Latest error
              </div>
              <div className="mt-2 text-base text-zinc-200">
                {formatDate(
                  list.find((event) =>
                    ["error", "failed", "dead"].includes(
                      getEventStatus(event).toLowerCase()
                    )
                  )
                    ? getEventDate(
                        list.find((event) =>
                          ["error", "failed", "dead"].includes(
                            getEventStatus(event).toLowerCase()
                          )
                        ) as EventItem
                      )
                    : null
                )}
              </div>
            </div>

            <div className={miniCardClassName()}>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Commands created
              </div>
              <div className="mt-2 text-base text-zinc-200">
                {events.filter((event) => wasCommandCreated(event)).length}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
            Aucun événement affiché.
          </div>
        ) : (
          list.map((event) => {
            const eventType = getEventType(event);
            const eventStatus = getEventStatus(event);
            const linkedCommand = getLinkedCommand(event);
            const flowId = getFlowId(event);
            const rootEventId = getRootEventId(event);
            const capability = getMappedCapability(event);
            const workspace = getEventWorkspace(event);
            const source = getEventSource(event);
            const runId = getRunId(event);

            const hasCommand = linkedCommand !== "—";
            const hasFlow = flowId !== "—";

            return (
              <article key={event.id} className={eventCardClassName()}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      BOSAI EVENT
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-2xl font-semibold tracking-tight text-white">
                        {eventType}
                      </h2>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeTone(
                          eventStatus
                        )}`}
                      >
                        {eventStatus.toUpperCase()}
                      </span>

                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                        {wasCommandCreated(event) ? "COMMAND CREATED" : "NO COMMAND"}
                      </span>
                    </div>

                    <div className="break-all text-sm text-zinc-400">
                      ID: <span className="text-zinc-300">{event.id}</span>
                    </div>
                  </div>

                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 xl:min-w-[140px] xl:text-right">
                    EVENT SIGNAL
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Workspace
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {workspace}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Capability
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {capability}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Flow
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {flowId}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Root event
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {rootEventId}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Linked command
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {linkedCommand}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Source
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {source}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Run
                    </div>
                    <div className="mt-2 break-all text-sm text-zinc-200">
                      {runId}
                    </div>
                  </div>

                  <div className={miniCardClassName()}>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Updated
                    </div>
                    <div className="mt-2 text-sm text-zinc-200">
                      {formatDate(getEventDate(event))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/events/${encodeURIComponent(event.id)}`}
                    className={actionLinkClassName("primary")}
                  >
                    Ouvrir l’event
                  </Link>

                  {hasCommand ? (
                    <Link
                      href={`/commands/${encodeURIComponent(linkedCommand)}`}
                      className={actionLinkClassName("soft")}
                    >
                      Voir command
                    </Link>
                  ) : null}

                  {hasFlow ? (
                    <Link
                      href={`/flows/${encodeURIComponent(flowId)}`}
                      className={actionLinkClassName("soft")}
                    >
                      Voir flow
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
