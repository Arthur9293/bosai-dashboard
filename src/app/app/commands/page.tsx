import { PageHeader } from "../../../components/ui/page-header";
import { fetchCommands } from "../../../lib/api";
import type { CommandItem } from "../../../lib/types";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeStatus(status?: string) {
  return (status || "").trim().toLowerCase();
}

function statusTone(status?: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "done") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "running") {
    return "border border-sky-500/20 bg-sky-500/10 text-sky-300";
  }

  if (
    normalized === "queued" ||
    normalized === "queue" ||
    normalized === "pending" ||
    normalized === "retry"
  ) {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    normalized === "error" ||
    normalized === "failed" ||
    normalized === "dead" ||
    normalized === "blocked" ||
    normalized === "unsupported"
  ) {
    return "border border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function formatStatus(status?: string) {
  if (!status) return "Unknown";

  const normalized = normalizeStatus(status);

  if (normalized === "queued") return "Queued";
  if (normalized === "queue") return "Queue";
  if (normalized === "running") return "Running";
  if (normalized === "done") return "Done";
  if (normalized === "retry") return "Retry";
  if (normalized === "dead") return "Dead";
  if (normalized === "blocked") return "Blocked";
  if (normalized === "unsupported") return "Unsupported";
  if (normalized === "error") return "Error";
  if (normalized === "failed") return "Failed";
  if (normalized === "pending") return "Pending";

  return status;
}

function getCommandId(command: CommandItem) {
  return command.id || "—";
}

export default async function CommandsPage() {
  let commandsData = null;
  let loadError: string | null = null;

  try {
    commandsData = await fetchCommands();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Impossible de charger les commandes.";
  }

  const commands = commandsData?.commands ?? [];
  const totalCommands = commandsData?.count ?? commands.length ?? 0;

  const queuedCommands =
    commandsData?.stats?.queued ??
    commandsData?.stats?.queue ??
    commands.filter((command) => {
      const status = normalizeStatus(command.status);
      return status === "queue" || status === "queued" || status === "pending";
    }).length;

  const runningCommands =
    commandsData?.stats?.running ??
    commands.filter(
      (command) => normalizeStatus(command.status) === "running"
    ).length;

  const doneCommands =
    commandsData?.stats?.done ??
    commands.filter((command) => normalizeStatus(command.status) === "done")
      .length;

  const errorCommands =
    commandsData?.stats?.error ??
    commands.filter((command) => {
      const status = normalizeStatus(command.status);
      return (
        status === "error" ||
        status === "failed" ||
        status === "dead" ||
        status === "blocked" ||
        status === "unsupported"
      );
    }).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Commands"
        description="Historique et statut des commandes remontées par BOSAI."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Queue</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {queuedCommands}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Commandes en attente</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Running</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {runningCommands}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Commandes en cours</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {doneCommands}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Commandes terminées</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Errors</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {errorCommands}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Commandes en erreur</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">
            Commands ({totalCommands})
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            File de commandes lue depuis l’API BOSAI Worker.
          </p>
        </div>

        {loadError ? (
          <div className="px-6 py-6">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              Impossible de charger les commandes : {loadError}
            </div>
          </div>
        ) : commands.length === 0 ? (
          <div className="px-6 py-8 text-sm text-zinc-400">
            Aucune commande trouvée.
          </div>
        ) : (
          <>
            <div className="hidden min-[980px]:block">
              <div className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr_1.2fr_1.2fr] gap-4 border-b border-zinc-800 px-6 py-4 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                <div>Command ID</div>
                <div>Capability</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Locked By</div>
                <div>Scheduled</div>
              </div>

              <div className="divide-y divide-zinc-800">
                {commands.map((command) => (
                  <div
                    key={getCommandId(command)}
                    className="grid grid-cols-[2fr_1.2fr_1fr_0.8fr_1.2fr_1.2fr] gap-4 px-6 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="break-words font-medium text-zinc-200">
                        {getCommandId(command)}
                      </div>
                      <div className="mt-1 break-words text-xs text-zinc-500">
                        {command.idempotency_key || "—"}
                      </div>
                    </div>

                    <div className="break-words text-zinc-300">
                      {command.capability || "—"}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                          command.status
                        )}`}
                      >
                        {formatStatus(command.status)}
                      </span>
                    </div>

                    <div className="text-zinc-300">
                      {command.priority ?? "—"}
                    </div>

                    <div className="break-words text-zinc-300">
                      {command.locked_by || "—"}
                    </div>

                    <div className="text-zinc-400">
                      {formatDate(command.scheduled_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4 min-[980px]:hidden">
              {commands.map((command) => (
                <div
                  key={getCommandId(command)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-white">
                        {command.capability || "Unknown capability"}
                      </div>
                      <div className="mt-1 break-words text-xs text-zinc-500">
                        {getCommandId(command)}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                        command.status
                      )}`}
                    >
                      {formatStatus(command.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Priority
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {command.priority ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Locked By
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {command.locked_by || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Scheduled
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {formatDate(command.scheduled_at)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Next Retry
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {formatDate(command.next_retry_at)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Retry Count
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {command.retry_count ?? "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Idempotency Key
                      </div>
                      <div className="mt-1 break-words text-sm text-zinc-300">
                        {command.idempotency_key || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
