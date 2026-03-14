// src/app/app/events/page.tsx

import { fetchEvents } from "@/lib/api";

function formatDate(value?: string | null) {
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

  if (normalized === "new") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "queued") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "processed") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "ignored") {
    return "border border-zinc-700 bg-zinc-900 text-zinc-300";
  }

  if (normalized === "error") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border border-zinc-700 bg-zinc-900 text-zinc-300";
}

export default async function EventsPage() {
  let data = null;

  try {
    data = await fetchEvents();
  } catch {}

  const events = data?.events ?? [];
  const stats = data?.stats ?? {};

  const totalVisible = data?.count ?? events.length ?? 0;
  const newCount = stats.new ?? 0;
  const queuedCount = stats.queued ?? 0;
  const processedCount = stats.processed ?? 0;
  const ignoredCount = stats.ignored ?? 0;
  const errorCount = stats.error ?? 0;
  const otherCount = stats.other ?? 0;

  const sourceConnected = Boolean(data?.ok);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-cyan-500/30 bg-[radial-gradient(circle_at_top,_rgba(8,47,73,0.45),_rgba(2,6,23,0.96)_55%)] p-6 md:p-8">
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-emerald-300">
          EVENTS V2
        </div>

        <div className="mt-6">
          <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Events
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-9 text-zinc-400">
            Vue évènementielle BOSAI. Cette page remonte les events observés,
            leur statut, leur mapping et leur traitement par le worker.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Total visible
            </div>
            <div className="mt-5 text-6xl font-semibold text-white">
              {totalVisible}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Source
            </div>
            <div className="mt-5 text-2xl font-medium text-white">
              {sourceConnected ? "Worker connecté" : "Source indisponible"}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Signal
            </div>
            <div className="mt-5 text-2xl font-medium text-white">
              {sourceConnected ? "Lecture active" : "Fallback UI"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
        <h2 className="text-4xl font-semibold tracking-tight text-white">
          Operational Snapshot
        </h2>
        <p className="mt-3 text-lg text-zinc-400">
          Lecture instantanée des events observés par BOSAI.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">New</div>
            <div className="mt-4 text-6xl font-semibold text-white">{newCount}</div>
            <div className="mt-3 text-sm text-zinc-500">Events nouvellement reçus</div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Queued</div>
            <div className="mt-4 text-6xl font-semibold text-white">{queuedCount}</div>
            <div className="mt-3 text-sm text-zinc-500">Events en attente</div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Processed</div>
            <div className="mt-4 text-6xl font-semibold text-white">{processedCount}</div>
            <div className="mt-3 text-sm text-zinc-500">Events traités</div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Ignored</div>
            <div className="mt-4 text-6xl font-semibold text-white">{ignoredCount}</div>
            <div className="mt-3 text-sm text-zinc-500">Events ignorés</div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Error</div>
            <div className="mt-4 text-6xl font-semibold text-white">{errorCount}</div>
            <div className="mt-3 text-sm text-zinc-500">Events en erreur</div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Other</div>
            <div className="mt-4 text-6xl font-semibold text-white">{otherCount}</div>
            <div className="mt-3 text-sm text-zinc-500">Autres états</div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
        <h2 className="text-4xl font-semibold tracking-tight text-white">
          Recent Events
        </h2>
        <p className="mt-3 text-lg text-zinc-400">
          Derniers events remontés par le worker BOSAI.
        </p>

        <div className="mt-8 space-y-5">
          {events.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-800 bg-black/20 p-8 text-lg text-zinc-500">
              Aucun event récent pour le moment.
            </div>
          ) : (
            events.map((event: any) => (
              <article
                key={event.id}
                className="rounded-[30px] border border-zinc-800 bg-black/30 p-6 md:p-8"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-3xl font-semibold tracking-tight text-white">
                      {event.event_type || "Untitled event"}
                    </h3>
                    <p className="mt-3 break-all font-mono text-lg text-zinc-500">
                      {event.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span
                      className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${statusTone(
                        event.status
                      )}`}
                    >
                      {event.status || "Unknown"}
                    </span>

                    {event.command_created ? (
                      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
                        Command created
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Status
                    </div>
                    <div className="mt-5 text-3xl font-medium text-white">
                      {event.status || "—"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Mapped capability
                    </div>
                    <div className="mt-5 break-all text-3xl font-medium text-white">
                      {event.mapped_capability || "—"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Processed at
                    </div>
                    <div className="mt-5 text-3xl font-medium text-white">
                      {formatDate(event.processed_at)}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Source
                    </div>
                    <div className="mt-5 break-all text-3xl font-medium text-white">
                      {event.source || "—"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Run id
                    </div>
                    <div className="mt-5 break-all font-mono text-2xl text-white">
                      {event.run_id || "—"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Command id
                    </div>
                    <div className="mt-5 break-all font-mono text-2xl text-white">
                      {event.command_id || "—"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6 md:col-span-2 xl:col-span-3">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Linked command
                    </div>
                    <div className="mt-5 break-all font-mono text-2xl text-white">
                      {Array.isArray(event.linked_command) &&
                      event.linked_command.length > 0
                        ? event.linked_command.join(", ")
                        : "—"}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
