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
  created_at?: string;
};

type CommandStatsCompat = {
  queue?: number;
  queued?: number;
  running?: number;
  done?: number;
  retry?: number;
  dead?: number;
  error?: number;
  failed?: number;
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

  if (normalized === "retry") {
    return "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20";
  }

  if (
    normalized === "error" ||
    normalized === "failed" ||
    normalized === "dead"
  ) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

export default async function CommandsPage() {
  let commandsData: any = null;

  try {
    commandsData = await fetchCommands();
  } catch {
    commandsData = null;
  }

  const commands: CommandItem[] = commandsData?.commands ?? [];
  const stats = (commandsData?.stats ?? {}) as CommandStatsCompat;

  const queuedCount = stats.queue ?? stats.queued ?? 0;
  const runningCount = stats.running ?? 0;
  const doneCount = stats.done ?? 0;
  const retryCount = stats.retry ?? 0;
  const deadCount = stats.dead ?? stats.error ?? stats.failed ?? 0;

  const visibleCommands = [...commands]
    .sort((a, b) => {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    })
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Commands
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Pilotage de la queue des commandes BOSAI. Cette vue affiche les
          statuts, les capacités, les flux et les timestamps d’exécution.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Queued</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(queuedCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Running</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(runningCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(doneCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Retry</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(retryCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Dead / Error</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(deadCount)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Commands queue</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {formatNumber(visibleCommands.length)} commande(s) visible(s)
            </p>
          </div>
        </div>

        {visibleCommands.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
            Aucune commande visible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleCommands.map((command) => (
              <div
                key={command.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {command.capability || "Unknown capability"}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-white">
                        {command.capability || "Unknown capability"}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                          command.status
                        )}`}
                      >
                        {(command.status || "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm text-zinc-400">
                      ID: <span className="text-zinc-300">{command.id}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        Flow ID:{" "}
                        <span className="break-all text-zinc-300">
                          {command.flow_id || "—"}
                        </span>
                      </div>

                      <div>
                        Root Event ID:{" "}
                        <span className="break-all text-zinc-300">
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
                        Created:{" "}
                        <span className="text-zinc-300">
                          {formatDate(command.created_at)}
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

                  <div className="text-xs text-zinc-500 xl:min-w-[120px] xl:text-right">
                    BOSAI command
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
