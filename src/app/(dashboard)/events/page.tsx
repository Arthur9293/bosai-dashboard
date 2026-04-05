import Link from "next/link";
import { fetchEvents } from "@/lib/api";

type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[];
  workspace_id?: string | null;
  flow_id?: string | null;
  root_event_id?: string | null;
  command_id?: string | null;
  mapped_capability?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  processed_at?: string | null;
  source?: string | null;
  run_id?: string | null;
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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function getEventType(event: EventItem) {
  return event.event_type || event.type || "unknown";
}

function getEventStatus(event: EventItem) {
  return event.status || "unknown";
}

function getEventDate(event: EventItem) {
  return event.updated_at || event.processed_at || event.created_at || null;
}

function getLinkedCommandId(event: EventItem) {
  if (event.command_id && String(event.command_id).trim()) {
    return String(event.command_id).trim();
  }

  if (Array.isArray(event.linked_command) && event.linked_command.length > 0) {
    const first = String(event.linked_command[0] || "").trim();
    if (first) return first;
  }

  return "";
}

function getFlowTarget(event: EventItem) {
  const flow = String(event.flow_id || "").trim();
  if (flow) return flow;

  const root = String(event.root_event_id || "").trim();
  if (root) return root;

  return "";
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

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function actionButtonClassName(variant: "default" | "primary" = "default") {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10";
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

    sourceConnected = Boolean(data?.events || data?.stats);
  } catch {
    events = [];
    stats = {};
    sourceConnected = false;
  }

  const newCount = stats.new ?? 0;
  const queuedCount = stats.queued ?? 0;
  const processedCount = stats.processed ?? 0;
  const ignoredCount = stats.ignored ?? 0;
  const errorCount = stats.error ?? 0;
  const otherCount = stats.other ?? 0;

  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(getEventDate(b) || 0).getTime() -
      new Date(getEventDate(a) || 0).getTime()
  );

  const list = sortedEvents.slice(0, 50);

  const latestProcessed = sortedEvents.find(
    (event) => getEventStatus(event).toLowerCase() === "processed"
  );
  const latestQueued = sortedEvents.find(
    (event) => getEventStatus(event).toLowerCase() === "queued"
  );
  const latestError = sortedEvents.find((event) =>
    ["error", "failed", "dead"].includes(getEventStatus(event).toLowerCase())
  );

  const commandsCreatedCount = sortedEvents.filter(
    (event) => event.command_created === true
  ).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Operations
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Events
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Flux des événements BOSAI. Cette vue affiche les events, leur statut,
          leur rattachement pipeline et les liens vers les commands et flows.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["New", newCount],
          ["Queued", queuedCount],
          ["Processed", processedCount],
          ["Ignored", ignoredCount],
          ["Errors", errorCount],
          ["Other", otherCount],
        ].map(([label, value]) => (
          <div key={label} className={cardClassName()}>
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-3 text-4xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Source status</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {sourceConnected ? "Connected" : "Unavailable"}
          </div>
          <div className="mt-3">
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
              {sourceConnected ? "LIVE SOURCE" : "NO SOURCE"}
            </span>
          </div>
        </div>

        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Event stream
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Historique récent
              </h2>
            </div>

            <div className="text-sm text-zinc-500">{list.length} visible(s)</div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Latest processed
              </div>
              <div className="mt-3 text-xl font-semibold text-white">
                {formatDate(getEventDate(latestProcessed || {} as EventItem))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Latest queued
              </div>
              <div className="mt-3 text-xl font-semibold text-white">
                {formatDate(getEventDate(latestQueued || {} as EventItem))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Latest error
              </div>
              <div className="mt-3 text-xl font-semibold text-white">
                {formatDate(getEventDate(latestError || {} as EventItem))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Commands created
              </div>
              <div className="mt-3 text-xl font-semibold text-white">
                {commandsCreatedCount}
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
            const linkedCommand = getLinkedCommandId(event);
            const flowTarget = getFlowTarget(event);

            return (
              <article
                key={event.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      BOSAI EVENT
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-2xl font-semibold text-white">
                        {getEventType(event)}
                      </h2>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                          getEventStatus(event)
                        )}`}
                      >
                        {getEventStatus(event).toUpperCase()}
                      </span>

                      {event.command_created ? (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                          COMMAND CREATED
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 break-all text-sm text-zinc-400">
                      ID: <span className="text-zinc-200">{event.id}</span>
                    </div>
                  </div>

                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    EVENT SIGNAL
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Workspace
                    </div>
                    <div className="mt-3 break-all text-xl font-semibold text-white">
                      {event.workspace_id || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Capability
                    </div>
                    <div className="mt-3 break-all text-xl font-semibold text-white">
                      {event.mapped_capability || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Flow
                    </div>
                    <div className="mt-3 break-all text-xl font-semibold text-white">
                      {event.flow_id || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Root event
                    </div>
                    <div className="mt-3 break-all text-xl font-semibold text-white">
                      {event.root_event_id || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Linked command
                    </div>
                    <div className="mt-3 break-all text-xl font-semibold text-white">
                      {linkedCommand || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Source
                    </div>
                    <div className="mt-3 break-all text-xl font-semibold text-white">
                      {event.source || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Updated
                    </div>
                    <div className="mt-3 text-xl font-semibold text-white">
                      {formatDate(getEventDate(event))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      Processed
                    </div>
                    <div className="mt-3 text-xl font-semibold text-white">
                      {formatDate(event.processed_at || null)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/events/${encodeURIComponent(event.id)}`}
                    className={actionButtonClassName("primary")}
                  >
                    Ouvrir l’event
                  </Link>

                  {linkedCommand ? (
                    <Link
                      href={`/commands/${encodeURIComponent(linkedCommand)}`}
                      className={actionButtonClassName()}
                    >
                      Ouvrir la command liée
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-500">
                      Ouvrir la command liée
                    </div>
                  )}

                  {flowTarget ? (
                    <Link
                      href={`/flows/${encodeURIComponent(flowTarget)}`}
                      className={actionButtonClassName()}
                    >
                      Ouvrir le flow lié
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-500">
                      Ouvrir le flow lié
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
