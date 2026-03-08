import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";
import { fetchCommands } from "../../lib/api";

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

  if (normalized === "done") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  }

  if (normalized === "running") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
  }

  if (normalized === "error") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/30";
  }

  if (normalized === "queue") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/30";
  }

  return "bg-white/5 text-white/70 border border-white/10";
}

export default async function CommandsPage() {
  let data: Awaited<ReturnType<typeof fetchCommands>> | null = null;
  let error: string | null = null;

  try {
    data = await fetchCommands();
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Erreur inconnue pendant le chargement des commandes.";
  }

  const commands = data?.commands ?? [];
  const stats = data?.stats;

  return (
    <AppShell title="Commands">
      <PageHeader
        title="Commands"
        description="Queue des commandes BOSAI."
      />

      {error ? (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <h3 className="text-lg font-semibold text-rose-200">
            Erreur de chargement
          </h3>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
          <p className="mt-3 text-xs text-rose-100/60">
            Vérifie NEXT_PUBLIC_WORKER_URL et l’endpoint /commands du worker.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Total</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {data?.count ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">commandes</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Queue</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {stats?.queue ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">en attente</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Running</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {stats?.running ?? 0}
              </div>
              <div className="mt-1 text-sm text-white/40">en cours</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-white/50">Done / Error</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {(stats?.done ?? 0) + (stats?.error ?? 0)}
              </div>
              <div className="mt-1 text-sm text-white/40">terminées</div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Commands ({commands.length})
                </h3>
                <p className="mt-1 text-sm text-white/50">
                  Dernières commandes remontées par le worker.
                </p>
              </div>
            </div>

            {commands.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/60">
                Aucune commande trouvée.
              </div>
            ) : (
              <div className="space-y-3">
                {commands.map((command) => (
                  <article
                    key={command.id}
                    className="rounded-2xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold text-white">
                          {command.capability || "Commande sans capability"}
                        </div>

                        <div className="mt-2 space-y-1 text-sm text-white/65">
                          <div>
                            <span className="text-white/40">ID :</span>{" "}
                            <span className="break-all">{command.id}</span>
                          </div>

                          <div>
                            <span className="text-white/40">Worker :</span>{" "}
                            {command.worker || "—"}
                          </div>

                          <div>
                            <span className="text-white/40">Priorité :</span>{" "}
                            {command.priority ?? "—"}
                          </div>

                          <div>
                            <span className="text-white/40">Créée :</span>{" "}
                            {formatDate(command.created_at)}
                          </div>

                          <div>
                            <span className="text-white/40">Mise à jour :</span>{" "}
                            {formatDate(command.updated_at)}
                          </div>

                          <div>
                            <span className="text-white/40">Dry run :</span>{" "}
                            {command.dry_run === true ? "Oui" : "Non"}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(
                            command.status
                          )}`}
                        >
                          {command.status || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
