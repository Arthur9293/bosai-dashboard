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

function statusTone(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "processed") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (normalized === "queued" || normalized === "queue" || normalized === "new") {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (normalized === "ignored") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (normalized === "error") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
}

export default async function EventsPage() {
  let data = null;
  let error = "";

  try {
    data = await fetchEvents();
  } catch (err) {
    error = err instanceof Error ? err.message : "Impossible de charger les events.";
  }

  const totalEvents = data?.count ?? 0;
  const queuedEvents = data?.stats?.queued ?? 0;
  const processedEvents = data?.stats?.processed ?? 0;
  const ignoredEvents = data?.stats?.ignored ?? 0;
  const errorEvents = data?.stats?.error ?? 0;
  const events = data?.events ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Operations
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
          Events
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          Historique et statut des événements remontés par le BOSAI Worker.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Total Events</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight text-white">
            {totalEvents}
          </p>
          <p className="mt-2 text-sm text-zinc-500">Événements observés</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Queued</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight text-white">
            {queuedEvents}
          </p>
          <p className="mt-2 text-sm text-zinc-500">En attente de traitement</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Processed</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight text-white">
            {processedEvents}
          </p>
          <p className="mt-2 text-sm text-zinc-500">Événements traités</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Errors</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight text-white">
            {errorEvents}
          </p>
          <p className="mt-2 text-sm text-zinc-500">Événements en erreur</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-2xl font-semibold text-white">Events ({totalEvents})</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Flux d’événements lu depuis l’API BOSAI Worker.
          </p>
        </div>

        {error ? (
          <div className="p-6">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              Impossible de charger les events : {error}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-sm text-zinc-400">Aucun event trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Event ID</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Capability</th>
                  <th className="px-6 py-4 font-medium">Command</th>
                  <th className="px-6 py-4 font-medium">Processed At</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event: any) => (
                  <tr key={event.id} className="border-b border-white/5 last:border-b-0">
                    <td className="px-6 py-4 align-top text-zinc-300">{event.id ?? "—"}</td>
                    <td className="px-6 py-4 align-top text-white">{event.event_type ?? "—"}</td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusTone(
                          event.status
                        )}`}
                      >
                        {event.status ?? "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-zinc-300">
                      {event.mapped_capability ?? "—"}
                    </td>
                    <td className="px-6 py-4 align-top text-zinc-300">
                      {Array.isArray(event.linked_command)
                        ? event.linked_command.join(", ")
                        : event.linked_command ?? "—"}
                    </td>
                    <td className="px-6 py-4 align-top text-zinc-400">
                      {formatDate(event.processed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Queued Events</p>
          <p className="mt-3 text-4xl font-semibold text-white">{queuedEvents}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Processed Events</p>
          <p className="mt-3 text-4xl font-semibold text-white">{processedEvents}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Ignored Events</p>
          <p className="mt-3 text-4xl font-semibold text-white">{ignoredEvents}</p>
        </div>
      </section>
    </div>
  );
}
