// src/app/app/events/page.tsx

import { fetchEvents } from "@/lib/api";

type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  status?: string;
  workspace_id?: string;
  flow_id?: string;
  root_event_id?: string;
  command_id?: string;
  mapped_capability?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
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

function badgeTone(status?: string) {
  const s = (status || "").toLowerCase();

  if (["processed", "done", "success"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued", "pending", "new"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
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

  const list = [...events]
    .sort(
      (a, b) =>
        new Date(getEventDate(b) || 0).getTime() -
        new Date(getEventDate(a) || 0).getTime()
    )
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Events
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
          Flux des événements BOSAI.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-6">
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
            <div className="mt-2 text-3xl font-semibold text-white">
              {value}
            </div>
          </div>
        ))}
      </section>

      <div className={cardClassName()}>
        <div className="text-sm text-zinc-400">Source status</div>
        <div className="mt-2 text-lg font-semibold text-white">
          {sourceConnected ? "Connected" : "Unavailable"}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
            Aucun événement affiché.
          </div>
        ) : (
          list.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-400">Event</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {getEventType(event)}
                  </div>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                    getEventStatus(event)
                  )}`}
                >
                  {getEventStatus(event).toUpperCase()}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  ID: <span className="text-zinc-200">{event.id}</span>
                </div>
                <div>
                  Workspace:{" "}
                  <span className="text-zinc-200">
                    {event.workspace_id || "—"}
                  </span>
                </div>
                <div>
                  Flow:{" "}
                  <span className="text-zinc-200">{event.flow_id || "—"}</span>
                </div>
                <div>
                  Root event:{" "}
                  <span className="text-zinc-200">
                    {event.root_event_id || "—"}
                  </span>
                </div>
                <div>
                  Command:{" "}
                  <span className="text-zinc-200">
                    {event.command_id || "—"}
                  </span>
                </div>
                <div>
                  Capability:{" "}
                  <span className="text-zinc-200">
                    {event.mapped_capability || "—"}
                  </span>
                </div>
                <div>
                  Updated:{" "}
                  <span className="text-zinc-200">
                    {formatDate(getEventDate(event))}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
