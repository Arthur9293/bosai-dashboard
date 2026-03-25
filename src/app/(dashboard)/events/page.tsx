import { fetchEvents } from "../../../lib/api";

type EventItem = {
  id: string;
  event_type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[];
  mapped_capability?: string;
  processed_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
};

type EventStats = {
  new?: number;
  queued?: number;
  processed?: number;
  ignored?: number;
  error?: number;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(d);
}

function tone(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "processed") return "bg-emerald-500/15 text-emerald-300";
  if (s === "queued") return "bg-amber-500/15 text-amber-300";
  if (s === "new") return "bg-sky-500/15 text-sky-300";
  if (s === "ignored") return "bg-zinc-500/15 text-zinc-300";
  if (s === "error") return "bg-red-500/15 text-red-300";

  return "bg-zinc-800 text-zinc-300";
}

export default async function EventsPage() {
  let data: any = null;

  try {
    data = await fetchEvents();
  } catch {}

  const events: EventItem[] = data?.events ?? [];
  const stats = (data?.stats ?? {}) as EventStats;

  const newEvents = stats.new ?? 0;
  const queued = stats.queued ?? 0;
  const processed = stats.processed ?? 0;
  const ignored = stats.ignored ?? 0;
  const error = stats.error ?? 0;

  const list = [...events]
    .sort(
      (a, b) =>
        new Date(b.processed_at || 0).getTime() -
        new Date(a.processed_at || 0).getTime()
    )
    .slice(0, 50);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold text-white">Events</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Pipeline Event → Command BOSAI
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["New", newEvents],
          ["Queued", queued],
          ["Processed", processed],
          ["Ignored", ignored],
          ["Errors", error],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-500">
            Aucun event affiché.
          </div>
        ) : (
          list.map((evt) => (
            <div
              key={evt.id}
              className="rounded-xl border border-white/10 bg-black/30 p-4 hover:bg-white/5 transition"
            >
              {/* TOP */}
              <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">
                  {evt.event_type || "event"}
                </div>

                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${tone(
                    evt.status
                  )}`}
                >
                  {(evt.status || "unknown").toUpperCase()}
                </span>
              </div>

              {/* ID */}
              <div className="text-sm text-zinc-300 mt-2 break-all">
                {evt.id}
              </div>

              {/* GRID */}
              <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs text-zinc-400">
                <div>Capability: {evt.mapped_capability || "—"}</div>
                <div>Command: {evt.command_id || "—"}</div>
                <div>Run: {evt.run_id || "—"}</div>

                <div>Processed: {formatDate(evt.processed_at)}</div>
                <div>Source: {evt.source || "—"}</div>
                <div>
                  Linked: {evt.linked_command?.length ? "Yes" : "No"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
