import Link from "next/link";
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

  if (s === "done") return "bg-emerald-500/15 text-emerald-300";
  if (s === "queued" || s === "queue") return "bg-amber-500/15 text-amber-300";
  if (s === "running") return "bg-sky-500/15 text-sky-300";
  if (s === "retry") return "bg-fuchsia-500/15 text-fuchsia-300";

  if (["error", "failed", "dead"].includes(s))
    return "bg-red-500/15 text-red-300";

  return "bg-zinc-800 text-zinc-300";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Commands</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Monitoring et orchestration des commandes BOSAI
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["Queued", queued],
          ["Running", running],
          ["Done", done],
          ["Retry", retry],
          ["Dead", dead],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((cmd) => (
          <Link
            key={cmd.id}
            href={`/commands/${cmd.id}`}
            className="block rounded-xl border border-white/10 bg-black/30 p-4 transition hover:bg-white/5 hover:border-white/20"
          >
            <div className="flex justify-between items-center">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {cmd.capability}
              </div>

              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${tone(
                  cmd.status
                )}`}
              >
                {(cmd.status || "unknown").toUpperCase()}
              </span>
            </div>

            <div className="text-sm text-zinc-300 mt-2 break-all">
              {cmd.id}
            </div>

            <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs text-zinc-400">
              <div>Flow: {cmd.flow_id || "—"}</div>
              <div>Event: {cmd.root_event_id || "—"}</div>
              <div>Worker: {cmd.worker || "—"}</div>

              <div>Priority: {cmd.priority ?? "—"}</div>
              <div>Created: {formatDate(cmd.created_at)}</div>
              <div>Started: {formatDate(cmd.started_at)}</div>

              <div>Finished: {formatDate(cmd.finished_at)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
