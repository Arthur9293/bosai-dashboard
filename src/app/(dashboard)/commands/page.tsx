import { PageHeader } from "../../../components/ui/page-header";
import { fetchCommands } from "../../../lib/api";

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  flow_id?: string;
  root_event_id?: string;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
};

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toString() : "0";
}

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
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (normalized === "queued" || normalized === "queue") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (normalized === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (normalized === "error" || normalized === "failed" || normalized === "dead") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

export default async function CommandsPage() {
  let commandsData: any = null;

  try {
    commandsData = await fetchCommands();
  } catch {
    commandsData = null;
  }

  const commands: CommandItem[] = commandsData?.commands ?? [];
  const stats = commandsData?.stats ?? {};

  const queuedCount = stats?.queued ?? stats?.queue ?? 0;
  const runningCount = stats?.running ?? 0;
  const doneCount = stats?.done ?? 0;
  const retryCount = stats?.retry ?? 0;
  const deadCount = stats?.dead ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Commands"
        description="Pilotage de la queue des commandes BOSAI. Cette vue affiche la file, les statuts, les capacités et l’état d’exécution."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-400">Queued</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(queuedCount)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-400">Running</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(runningCount)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(doneCount)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-400">Retry</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(retryCount)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm text-zinc-400">Dead</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(deadCount)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Commands queue</h2>
          <div className="text-sm text-zinc-500">
            {formatNumber(commands.length)} visible(s)
          </div>
        </div>

        {commands.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 px-4 py-8 text-sm text-zinc-500">
            Aucune commande visible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {commands.slice(0, 20).map((command) => (
              <div
                key={command.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-white">
                        {command.capability || "Unknown capability"}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                          command.status
                        )}`}
                      >
                        {command.status || "unknown"}
                      </span>
                    </div>

                    <div className="text-sm text-zinc-400">
                      ID: <span className="text-zinc-300">{command.id}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        Flow ID:{" "}
                        <span className="text-zinc-300">
                          {command.flow_id || "—"}
                        </span>
                      </div>
                      <div>
                        Root Event ID:{" "}
                        <span className="text-zinc-300">
                          {command.root_event_id || "—"}
                        </span>
                      </div>
                      <div>
                        Worker:{" "}
                        <span className="text-zinc-300">
                          {command.worker || "—"}
                        </span>
                      </div>
                      <div>
                        Workspace:{" "}
                        <span className="text-zinc-300">
                          {command.workspace_id || "—"}
                        </span>
                      </div>
                      <div>
                        Priority:{" "}
                        <span className="text-zinc-300">
                          {typeof command.priority === "number"
                            ? command.priority
                            : "—"}
                        </span>
                      </div>
                      <div>
                        Started:{" "}
                        <span className="text-zinc-300">
                          {formatDate(command.started_at)}
                        </span>
                      </div>
                      <div>
                        Finished:{" "}
                        <span className="text-zinc-300">
                          {formatDate(command.finished_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
