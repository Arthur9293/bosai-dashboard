import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchFlowById } from "../../../../lib/api";

type FlowCommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  step_index?: number;
  flow_id?: string;
  root_event_id?: string;
  parent_command_id?: string;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
};

type FlowDetail = {
  id: string;
  count?: number;
  root_event_id?: string;
  workspace_id?: string;
  stats?: {
    queued?: number;
    running?: number;
    retry?: number;
    done?: number;
    dead?: number;
    blocked?: number;
    unsupported?: number;
    error?: number;
    other?: number;
  };
  commands?: FlowCommandItem[];
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

function toText(value?: string | number | null, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

function flowStatusTone(status: string) {
  if (status === "SUCCESS") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "RUNNING") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (status === "PARTIAL") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "FAILED") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function isFlowStart(cmd: FlowCommandItem) {
  return typeof cmd.step_index === "number" && cmd.step_index === 1;
}

function isGraphRoot(cmd: FlowCommandItem) {
  return !String(cmd.parent_command_id || "").trim();
}

function lineageBadge(cmd: FlowCommandItem) {
  if (isFlowStart(cmd)) return "START";
  if (isGraphRoot(cmd)) return "ROOT";
  return "CHILD";
}

function lineageTone(cmd: FlowCommandItem) {
  if (isFlowStart(cmd)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (isGraphRoot(cmd)) {
    return "bg-white/10 text-zinc-200 border border-white/10";
  }

  return "bg-white/5 text-zinc-300 border border-white/10";
}

function getFlowStatus(commands: FlowCommandItem[]) {
  const statuses = commands.map((cmd) => (cmd.status || "").toLowerCase());

  const hasError = statuses.some((s) => ["error", "failed", "dead"].includes(s));
  const hasRunning = statuses.some((s) => s === "running");
  const hasRetry = statuses.some((s) => s === "retry");
  const hasQueued = statuses.some((s) => s === "queued" || s === "queue");
  const allDone = statuses.length > 0 && statuses.every((s) => s === "done");
  const hasDone = statuses.some((s) => s === "done");

  if (allDone) return "SUCCESS";
  if (hasError) return "FAILED";
  if (hasRunning || hasRetry || hasQueued) return "RUNNING";
  if (hasDone) return "PARTIAL";
  return "UNKNOWN";
}

function getFlowSummary(commands: FlowCommandItem[]) {
  const done = commands.filter((c) => (c.status || "").toLowerCase() === "done").length;
  const running = commands.filter((c) => (c.status || "").toLowerCase() === "running").length;
  const retry = commands.filter((c) => (c.status || "").toLowerCase() === "retry").length;
  const failed = commands.filter((c) =>
    ["error", "failed", "dead"].includes((c.status || "").toLowerCase())
  ).length;

  return { done, running, retry, failed };
}

function getLastCommand(commands: FlowCommandItem[]) {
  if (commands.length === 0) return null;
  return commands[commands.length - 1];
}

function getLastActivity(commands: FlowCommandItem[]) {
  const last = getLastCommand(commands);
  if (!last) return "—";

  return formatDate(last.finished_at || last.started_at || last.created_at);
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;

  let flow: FlowDetail | null = null;

  try {
    flow = await fetchFlowById(decodeURIComponent(id));
  } catch {
    flow = null;
  }

  if (!flow) {
    notFound();
  }

  const commands = Array.isArray(flow.commands) ? [...flow.commands] : [];

  commands.sort((a, b) => {
    const aStep =
      typeof a.step_index === "number" ? a.step_index : Number.MAX_SAFE_INTEGER;
    const bStep =
      typeof b.step_index === "number" ? b.step_index : Number.MAX_SAFE_INTEGER;

    if (aStep !== bStep) {
      return aStep - bStep;
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  const flowStatus = getFlowStatus(commands);
  const summary = getFlowSummary(commands);
  const lastCommand = getLastCommand(commands);
  const lastActivity = getLastActivity(commands);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="mb-3">
          <Link
            href="/flows"
            className="text-sm text-zinc-400 underline decoration-white/10 underline-offset-4 transition hover:text-white"
          >
            ← Retour aux flows
          </Link>
        </div>

        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          FLOW
        </div>

        <h1 className="mt-2 break-all text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {toText(flow.id)}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue détaillée d’un flow BOSAI.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Flow status</div>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${flowStatusTone(
                flowStatus
              )}`}
            >
              {flowStatus}
            </span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Commands</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {flow.count ?? commands.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">
            {summary.done}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Failed</div>
          <div className="mt-3 text-4xl font-semibold text-red-300">
            {summary.failed}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Flow identity</h2>
        </div>

        <div className="mb-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
          START → END
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Flow key: <span className="break-all text-zinc-300">{toText(flow.id)}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-300">{toText(flow.root_event_id)}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-300">{toText(flow.workspace_id)}</span>
          </div>
          <div>
            Last step:{" "}
            <span className="text-zinc-300">{toText(lastCommand?.capability)}</span>
          </div>
          <div>
            Last activity: <span className="text-zinc-300">{lastActivity}</span>
          </div>
          <div>
            Last status:{" "}
            <span className="text-zinc-300">{statusLabel(lastCommand?.status)}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Execution timeline</h2>
        </div>

        <div className="mb-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
          START → END
        </div>

        <div className="space-y-3">
          {commands.map((cmd, index) => {
            const isLast = index === commands.length - 1;
            const displayStep =
              typeof cmd.step_index === "number" ? cmd.step_index : index + 1;

            return (
              <div key={cmd.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full shadow-lg ${
                      isFlowStart(cmd)
                        ? "bg-white shadow-white/30"
                        : "bg-zinc-500 shadow-zinc-500/20"
                    }`}
                  />
                  {!isLast && <div className="w-px flex-1 bg-white/10" />}
                </div>

                <div className="flex-1 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {toText(cmd.capability, "Unknown capability")}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-white">
                          {toText(cmd.capability, "Unknown capability")}
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                            cmd.status
                          )}`}
                        >
                          {statusLabel(cmd.status)}
                        </span>

                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                          STEP {displayStep}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${lineageTone(
                            cmd
                          )}`}
                        >
                          {lineageBadge(cmd)}
                        </span>
                      </div>

                      <div className="break-all text-sm text-zinc-400">
                        ID: <span className="text-zinc-300">{cmd.id}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-400">
                        <span>Priority: {toText(cmd.priority)}</span>
                        <span>Flow: {toText(cmd.flow_id)}</span>
                        <span>Root event: {toText(cmd.root_event_id)}</span>
                        <span>
                          Parent command:{" "}
                          {cmd.parent_command_id ? (
                            <Link
                              href={`/commands/${encodeURIComponent(String(cmd.parent_command_id))}`}
                              className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                            >
                              {cmd.parent_command_id}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </span>
                        <span>
                          Command role:{" "}
                          {isFlowStart(cmd)
                            ? "Flow start"
                            : isGraphRoot(cmd)
                              ? "Graph root"
                              : "Child node"}
                        </span>
                        <span>Worker: {toText(cmd.worker)}</span>
                        <span>Workspace: {toText(cmd.workspace_id)}</span>
                        <span>Created: {formatDate(cmd.created_at)}</span>
                        <span>Started: {formatDate(cmd.started_at)}</span>
                        <span>Finished: {formatDate(cmd.finished_at)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500 xl:min-w-[120px] xl:text-right">
                      FLOW STEP
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
