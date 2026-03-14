// src/app/app/incidents/page.tsx

import { fetchSla } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMinutes(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const n = Number(value);

  if (n === 0) return "0 min";
  if (Math.abs(n) < 60) return `${n} min`;

  const hours = Math.floor(Math.abs(n) / 60);
  const minutes = Math.abs(n) % 60;
  const sign = n < 0 ? "-" : "";

  if (minutes === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h${minutes}`;
}

function statusTone(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "ok") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "warning") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "breached") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (normalized === "escalated") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  return "border border-zinc-700 bg-zinc-900 text-zinc-300";
}

function remainingTone(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "text-zinc-400";
  }

  const n = Number(value);

  if (n < 0) return "text-red-300";
  if (n <= 60) return "text-amber-300";
  return "text-zinc-100";
}

export default async function IncidentsPage() {
  let data = null;

  try {
    data = await fetchSla(12);
  } catch {}

  const incidents = data?.incidents ?? [];
  const stats = data?.stats ?? {};

  const totalVisible = data?.count ?? incidents.length ?? 0;
  const okCount = stats.ok ?? 0;
  const warningCount = stats.warning ?? 0;
  const breachedCount = stats.breached ?? 0;
  const escalatedCount = stats.escalated ?? 0;
  const unknownCount = stats.unknown ?? 0;
  const escalationQueuedCount = stats.escalation_queued ?? 0;

  const sourceConnected = Boolean(data?.ok);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-cyan-500/30 bg-[radial-gradient(circle_at_top,_rgba(8,47,73,0.45),_rgba(2,6,23,0.96)_55%)] p-6 md:p-8">
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-emerald-300">
          INCIDENTS V2
        </div>

        <div className="mt-6">
          <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">
            Incidents
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-9 text-zinc-400">
            Vue incidents et SLA BOSAI. Cette page remonte les signaux actifs,
            leur état SLA, l’escalade éventuelle et le temps restant avant
            rupture.
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
          Lecture instantanée de l’état incidents et SLA.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">OK</div>
            <div className="mt-4 text-6xl font-semibold text-white">
              {okCount}
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              Incidents dans la zone sûre
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Warning</div>
            <div className="mt-4 text-6xl font-semibold text-white">
              {warningCount}
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              Incidents proches du seuil
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Breached</div>
            <div className="mt-4 text-6xl font-semibold text-white">
              {breachedCount}
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              Ruptures SLA visibles
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Escalated</div>
            <div className="mt-4 text-6xl font-semibold text-white">
              {escalatedCount}
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              Escalades déjà poussées
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Escalation queued</div>
            <div className="mt-4 text-6xl font-semibold text-white">
              {escalationQueuedCount}
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              En attente de dispatch
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Unknown</div>
            <div className="mt-4 text-6xl font-semibold text-white">
              {unknownCount}
            </div>
            <div className="mt-3 text-sm text-zinc-500">
              États SLA non classés
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-800 bg-zinc-950/80 p-6 md:p-8">
        <h2 className="text-4xl font-semibold tracking-tight text-white">
          Recent Incidents
        </h2>
        <p className="mt-3 text-lg text-zinc-400">
          Derniers incidents remontés par le worker BOSAI.
        </p>

        <div className="mt-8 space-y-5">
          {incidents.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-800 bg-black/20 p-8 text-lg text-zinc-500">
              Aucun incident récent pour le moment.
            </div>
          ) : (
            incidents.map((incident: any) => (
              <article
                key={incident.id}
                className="rounded-[30px] border border-zinc-800 bg-black/30 p-6 md:p-8"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-3xl font-semibold tracking-tight text-white">
                      {incident.name || "Untitled incident"}
                    </h3>
                    <p className="mt-3 break-all font-mono text-lg text-zinc-500">
                      {incident.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <span
                      className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${statusTone(
                        incident.sla_status
                      )}`}
                    >
                      {incident.sla_status || "Unknown"}
                    </span>

                    {incident.escalation_queued ? (
                      <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300">
                        Escalation queued
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      SLA status
                    </div>
                    <div className="mt-5 text-3xl font-medium text-white">
                      {incident.sla_status || "—"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Remaining
                    </div>
                    <div
                      className={`mt-5 text-3xl font-medium ${remainingTone(
                        incident.sla_remaining_minutes
                      )}`}
                    >
                      {formatMinutes(incident.sla_remaining_minutes)}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Escalation queued
                    </div>
                    <div className="mt-5 text-3xl font-medium text-white">
                      {incident.escalation_queued ? "Oui" : "Non"}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Last SLA check
                    </div>
                    <div className="mt-5 text-3xl font-medium text-white">
                      {formatDate(incident.last_sla_check)}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-6 md:col-span-2">
                    <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                      Linked run
                    </div>
                    <div className="mt-5 break-all font-mono text-2xl text-white">
                      {Array.isArray(incident.linked_run) &&
                      incident.linked_run.length > 0
                        ? incident.linked_run.join(", ")
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
