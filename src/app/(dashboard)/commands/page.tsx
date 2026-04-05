import Link from "next/link";
import { fetchCommands } from "../../../lib/api";

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  flow_id?: string;
  root_event_id?: string;
  parent_command_id?: string;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
};

type CommandStats = {
  queue?: number;
  queued?: number;
  running?: number;
  done?: number;
  retry?: number;
  dead?: number;
  error?: number;
  failed?: number;
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

  if (s === "done") {
    return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  }

  if (s === "queued" || s === "queue") {
    return "border border-amber-500/20 bg-amber-500/15 text-amber-300";
  }

  if (s === "running") {
    return "border border-sky-500/20 bg-sky-500/15 text-sky-300";
  }

  if (s === "retry") {
    return "border border-violet-500/20 bg-violet-500/15 text-violet-300";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "border border-rose-500/20 bg-rose-500/15 text-rose-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function shellClassName() {
  return "space-y-8";
}

function surfaceClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return `${surfaceClassName()} px-5 py-4 md:px-6 md:py-5`;
}

function commandCardClassName() {
  return `${surfaceClassName()} block p-5 md:p-6 transition hover:border-white/15 hover:bg-white/[0.05]`;
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

export default async function CommandsPage() {
  let data: any = null;

  try {
    data = await fetchCommands();
  } catch {}

  const commands: CommandItem[] = data?.commands ?? [];
  const stats = (data?.stats ?? {}) as CommandStats;

  const queued = stats.queue ?? stats.queued ?? 0;
  const running = stats.running ?? 0;
  const done = stats.done ?? 0;
  const retry = stats.retry ?? 0;
  const dead = stats.dead ?? stats.error ?? stats.failed ?? 0;

  const list = [...commands]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 50);

  return (
    <div className={shellClassName()}>
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
          BOSAI Dashboard
        </div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Commands
          </h1>

          <p className="mt-2 text-base text-zinc-400 sm:text-lg">
            Monitoring et orchestration des commandes BOSAI
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {[
          ["Queued", queued],
          ["Running", running],
          ["Done", done],
          ["Retry", retry],
          ["Dead", dead],
        ].map(([label, value]) => (
          <div key={label} className={statCardClassName()}>
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {value}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        {list.map((cmd) => (
          <Link
            key={cmd.id}
            href={`/commands/${cmd.id}`}
            className={commandCardClassName()}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className={metaLabelClassName()}>{cmd.capability || "command"}</div>

                  <div className="break-all text-lg font-semibold tracking-tight text-white md:text-xl">
                    {cmd.id}
                  </div>
                </div>

                <div className="sm:pl-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone(
                      cmd.status
                    )}`}
                  >
                    {(cmd.status || "unknown").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid gap-x-5 gap-y-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                <div className="break-all">
                  <span className={metaLabelClassName()}>Flow</span>
                  <div className="mt-1 text-zinc-200">{cmd.flow_id || "—"}</div>
                </div>

                <div className="break-all">
                  <span className={metaLabelClassName()}>Event</span>
                  <div className="mt-1 text-zinc-200">
                    {cmd.root_event_id || "—"}
                  </div>
                </div>

                <div className="break-all">
                  <span className={metaLabelClassName()}>Parent</span>
                  <div className="mt-1 text-zinc-200">
                    {cmd.parent_command_id || "—"}
                  </div>
                </div>

                <div>
                  <span className={metaLabelClassName()}>Worker</span>
                  <div className="mt-1 text-zinc-200">{cmd.worker || "—"}</div>
                </div>

                <div>
                  <span className={metaLabelClassName()}>Priority</span>
                  <div className="mt-1 text-zinc-200">{cmd.priority ?? "—"}</div>
                </div>

                <div>
                  <span className={metaLabelClassName()}>Workspace</span>
                  <div className="mt-1 text-zinc-200">
                    {cmd.workspace_id || "—"}
                  </div>
                </div>

                <div>
                  <span className={metaLabelClassName()}>Created</span>
                  <div className="mt-1 text-zinc-200">
                    {formatDate(cmd.created_at)}
                  </div>
                </div>

                <div>
                  <span className={metaLabelClassName()}>Started</span>
                  <div className="mt-1 text-zinc-200">
                    {formatDate(cmd.started_at)}
                  </div>
                </div>

                <div>
                  <span className={metaLabelClassName()}>Finished</span>
                  <div className="mt-1 text-zinc-200">
                    {formatDate(cmd.finished_at)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
