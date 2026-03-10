import { fetchEvents } from "@/lib/api";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ value }: { value?: string }) {
  const normalized = (value || "unknown").toLowerCase();

  const styles: Record<string, string> = {
    queued: "bg-zinc-500/15 text-zinc-300 border border-white/10",
    queue: "bg-zinc-500/15 text-zinc-300 border border-white/10",
    processed:
      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    ignored: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
    error: "bg-red-500/15 text-red-300 border border-red-500/20",
    done: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    running: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
    unsupported: "bg-zinc-500/15 text-zinc-300 border border-white/10",
  };

  const className =
    styles[normalized] ||
    "bg-white/5 text-zinc-300 border border-white/10";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {value || "Unknown"}
    </span>
  );
}

function renderLinkedCommand(value?: string[] | string | null) {
  if (!value) return "—";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "—";
  }
  return value;
}

export default async function EventsPage() {
  let eventsData = null;
  let errorMessage = "";

  try {
    eventsData = await fetchEvents();
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Impossible de charger les events.";
  }

  const rows = Array.isArray(eventsData?.events) ? eventsData.events : [];
  const count = eventsData?.count ?? rows.length;

  const stats = {
    queued: eventsData?.stats?.queued ?? 0,
    processed: eventsData?.stats?.processed ?? 0,
    ignored: eventsData?.stats?.ignored ?? 0,
    error: eventsData?.stats?.error ?? 0,
    other: eventsData?.stats?.other ?? 0,
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
              Event Engine
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Events
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Surveillance des événements BOSAI, de leur mapping capability et de
              leur transformation en commandes exécutables.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Workspace
            </p>
            <p className="mt-2 text-sm font-medium text-white">Production</p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Total Events</p>
          <p className="mt-3 text-3xl font-semibold text-white">{count}</p>
          <p className="mt-2 text-xs text-zinc-500">Événements remontés</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Queued</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {stats.queued}
          </p>
          <p className="mt-2 text-xs text-zinc-500">En attente</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Processed</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {stats.processed}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Traités</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Ignored</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {stats.ignored}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Ignorés</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Errors</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {stats.error}
          </p>
          <p className="mt-2 text-xs text-zinc-500">En erreur</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Events ({count})</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Événements visibles depuis l’API BOSAI Worker.
          </p>
        </div>

        {errorMessage ? (
          <div className="p-5">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              Impossible de charger les events : {errorMessage}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-zinc-400">Aucun event trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-zinc-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Event ID</th>
                  <th className="px-5 py-4 font-medium">Type</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Capability</th>
                  <th className="px-5 py-4 font-medium">Command</th>
                  <th className="px-5 py-4 font-medium">Source</th>
                  <th className="px-5 py-4 font-medium">Processed</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((event, index) => (
                  <tr
                    key={event.id ?? `event-${index}`}
                    className="border-b border-white/5 text-zinc-300 last:border-b-0"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                      {event.id || "—"}
                    </td>

                    <td className="px-5 py-4 text-white">
                      {event.event_type || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge value={event.status} />
                    </td>

                    <td className="px-5 py-4">
                      {event.mapped_capability || "—"}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                      {renderLinkedCommand(event.linked_command)}
                    </td>

                    <td className="px-5 py-4">{event.source || "—"}</td>

                    <td className="px-5 py-4 text-zinc-400">
                      {formatDate(event.processed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
