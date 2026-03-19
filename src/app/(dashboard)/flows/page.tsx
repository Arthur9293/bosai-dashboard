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

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "done") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "queued" || s === "queue") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "retry") {
    return "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20";
  }

  if (s === "unsupported") {
    return "bg-purple-500/15 text-purple-300 border border-purple-500/20";
  }

  if (s === "unknown") {
    return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function statusLabel(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "done") return "SUCCESS";
  if (s === "running") return "RUNNING";
  if (s === "queued" || s === "queue") return "QUEUED";
  if (s === "retry") return "RETRY";
  if (s === "unsupported") return "NOT SUPPORTED";
  if (s === "unknown") return "UNKNOWN STATE";
  if (["error", "failed", "dead"].includes(s)) return "FAILED";

  return "UNKNOWN";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

type FlowGroup = {
  flowId: string;
  rootEventId?: string;
  commands: CommandItem[];
};

export default async function FlowsPage() {
  let data: any = null;

  try {
    data = await fetchCommands();
  } catch {
    data = null;
  }

  const commands: CommandItem[] = data?.commands ?? [];

  const grouped = new Map<string, FlowGroup>();

  for (const cmd of commands) {
    const flowId = cmd.flow_id || `no-flow:${cmd.id}`;

    if (!grouped.has(flowId)) {
      grouped.set(flowId, {
        flowId,
        rootEventId: cmd.root_event_id,
        commands: [],
      });
    }

    grouped.get(flowId)!.commands.push(cmd);
  }

  const flows = [...grouped.values()]
    .map((group) => {
      const sortedCommands = [...group.commands].sort((a, b) => {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });

      return {
        ...group,
        commands: sortedCommands,
      };
    })
    .sort((a, b) => {
      const aTs = new Date(a.commands[0]?.created_at || 0).getTime();
      const bTs = new Date(b.commands[0]?.created_at || 0).getTime();
      return bTs - aTs;
    })
    .slice(0, 30);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Flows
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue orientée orchestration. Cette page regroupe les commandes BOSAI
          par flow afin de suivre un enchaînement complet au lieu d’une commande
          isolée.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Flows visibles</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {flows.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Commands totales</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {commands.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Mode</div>
          <div className="mt-3 text-2xl font-semibold text-white">
            FLOW VIEW
          </div>
        </div>
      </section>

      {flows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500">
          Aucun flow visible pour le moment.
        </section>
      ) : (
        <section className="space-y-4">
          {flows.map((flow) => (
            <div
              key={flow.flowId}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-4">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  BOSAI FLOW
                </div>

                <div className="text-lg font-semibold text-white break-all">
                  {flow.flowId}
                </div>

                <div className="text-sm text-zinc-400 break-all">
                  Root event:{" "}
                  <span className="text-zinc-300">{flow.rootEventId || "—"}</span>
                </div>

                <div className="text-sm text-zinc-400">
                  {flow.commands.length} commande(s)
                </div>
              </div>

              <div className="space-y-3">
                {flow.commands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          {cmd.capability || "Unknown capability"}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-white">
                            {cmd.capability || "Unknown capability"}
                          </div>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                              cmd.status
                            )}`}
                          >
                            {statusLabel(cmd.status)}
                          </span>
                        </div>

                        <div className="text-sm text-zinc-400">
                          ID: <span className="text-zinc-300">{cmd.id}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                          <div>
                            Priority:{" "}
                            <span className="text-zinc-300">
                              {typeof cmd.priority === "number" ? cmd.priority : "—"}
                            </span>
                          </div>

                          <div>
                            Worker:{" "}
                            <span className="text-zinc-300">
                              {cmd.worker || "—"}
                            </span>
                          </div>

                          <div>
                            Workspace:{" "}
                            <span className="text-zinc-300">
                              {cmd.workspace_id || "—"}
                            </span>
                          </div>

                          <div>
                            Created:{" "}
                            <span className="text-zinc-300">
                              {formatDate(cmd.created_at)}
                            </span>
                          </div>

                          <div>
                            Started:{" "}
                            <span className="text-zinc-300">
                              {formatDate(cmd.started_at)}
                            </span>
                          </div>

                          <div>
                            Finished:{" "}
                            <span className="text-zinc-300">
                              {formatDate(cmd.finished_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-500 xl:min-w-[120px] xl:text-right">
                        FLOW STEP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
