import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCommands } from "../../../../lib/api";

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  step_index?: number;
  flow_id?: string;
  flowid?: string;
  root_event_id?: string;
  rooteventid?: string;
  event_id?: string;
  parent_command_id?: string;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
  input?: Record<string, unknown>;
  input_json?: Record<string, unknown> | string;
  result_json?: Record<string, unknown> | string;
};

type FlowGroup = {
  flowId: string;
  rootEventId?: string;
  commands: CommandItem[];
  isSynthetic: boolean;
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

function isRootCommand(cmd: CommandItem) {
  return !String(cmd.parent_command_id || "").trim();
}

function lineageBadge(cmd: CommandItem) {
  return isRootCommand(cmd) ? "ROOT" : "CHILD";
}

function lineageTone(cmd: CommandItem) {
  return isRootCommand(cmd)
    ? "bg-white/10 text-zinc-200 border border-white/10"
    : "bg-white/5 text-zinc-300 border border-white/10";
}

function getFlowStatus(commands: CommandItem[]) {
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

function getFlowSummary(commands: CommandItem[]) {
  const done = commands.filter((c) => (c.status || "").toLowerCase() === "done").length;
  const running = commands.filter((c) => (c.status || "").toLowerCase() === "running").length;
  const retry = commands.filter((c) => (c.status || "").toLowerCase() === "retry").length;
  const failed = commands.filter((c) =>
    ["error", "failed", "dead"].includes((c.status || "").toLowerCase())
  ).length;

  return { done, running, retry, failed };
}

function getDisplayFlowTitle(flow: FlowGroup) {
  return flow.isSynthetic ? "Legacy standalone command" : flow.flowId;
}

function safeObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseInputJson(
  value: Record<string, unknown> | string | undefined
): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return safeObject(parsed);
    } catch {
      return null;
    }
  }

  return safeObject(value);
}

function getCommandFlowId(cmd: CommandItem): string | null {
  const direct = cmd.flow_id || cmd.flowid;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const inputObj = safeObject(cmd.input) || parseInputJson(cmd.input_json);

  const candidate =
    inputObj?.flow_id ||
    inputObj?.flowid ||
    inputObj?.flowId;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  const resultObj = parseInputJson(cmd.result_json);

  const resultCandidate =
    resultObj?.flow_id ||
    resultObj?.flowid ||
    resultObj?.flowId;

  if (typeof resultCandidate === "string" && resultCandidate.trim()) {
    return resultCandidate.trim();
  }

  return null;
}

function getCommandRootEventId(cmd: CommandItem): string | undefined {
  const direct =
    cmd.root_event_id ||
    cmd.rooteventid ||
    cmd.event_id;

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const inputObj = safeObject(cmd.input) || parseInputJson(cmd.input_json);

  const candidate =
    inputObj?.root_event_id ||
    inputObj?.rooteventid ||
    inputObj?.event_id;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  const resultObj = parseInputJson(cmd.result_json);

  const resultCandidate =
    resultObj?.root_event_id ||
    resultObj?.rooteventid;

  if (typeof resultCandidate === "string" && resultCandidate.trim()) {
    return resultCandidate.trim();
  }

  return undefined;
}

function getLastCommand(commands: CommandItem[]) {
  if (commands.length === 0) return null;
  return commands[commands.length - 1];
}

function getLastActivity(commands: CommandItem[]) {
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

  let data: any = null;

  try {
    data = await fetchCommands();
  } catch {
    data = null;
  }

  const commands: CommandItem[] = data?.commands ?? [];

  const grouped = new Map<string, FlowGroup>();

  for (const cmd of commands) {
    const resolvedFlowId = getCommandFlowId(cmd);
    const resolvedRootEventId = getCommandRootEventId(cmd);

    const flowId =
      resolvedFlowId ||
      (resolvedRootEventId ? `root:${resolvedRootEventId}` : `no-flow:${cmd.id}`);

    if (!grouped.has(flowId)) {
      grouped.set(flowId, {
        flowId,
        rootEventId: resolvedRootEventId,
        commands: [],
        isSynthetic: !resolvedFlowId,
      });
    }

    const current = grouped.get(flowId)!;

    if (!current.rootEventId && resolvedRootEventId) {
      current.rootEventId = resolvedRootEventId;
    }

    current.commands.push(cmd);
  }

  const flow = grouped.get(decodeURIComponent(id));

  if (!flow) {
    notFound();
  }

  const sortedCommands = [...flow.commands].sort((a, b) => {
    const aStep =
      typeof a.step_index === "number" ? a.step_index : Number.MAX_SAFE_INTEGER;
    const bStep =
      typeof b.step_index === "number" ? b.step_index : Number.MAX_SAFE_INTEGER;

    if (aStep !== bStep) {
      return aStep - bStep;
    }

    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  const flowStatus = getFlowStatus(sortedCommands);
  const summary = getFlowSummary(sortedCommands);
  const lastCommand = getLastCommand(sortedCommands);
  const lastActivity = getLastActivity(sortedCommands);

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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {getDisplayFlowTitle(flow)}
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
            {sortedCommands.length}
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

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Flow key: <span className="break-all text-zinc-300">{flow.flowId}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-300">{flow.rootEventId || "—"}</span>
          </div>
          <div>
            Type:{" "}
            <span className="text-zinc-300">
              {flow.isSynthetic ? "Legacy synthetic record" : "Linked flow"}
            </span>
          </div>
          <div>
            Last step:{" "}
            <span className="text-zinc-300">{lastCommand?.capability || "—"}</span>
          </div>
          <div>
            Last activity:{" "}
            <span className="text-zinc-300">{lastActivity}</span>
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

        <div className="space-y-3">
          {sortedCommands.map((cmd, index) => {
            const isLast = index === sortedCommands.length - 1;
            const displayStep =
              typeof cmd.step_index === "number" ? cmd.step_index : index + 1;

            return (
              <div key={cmd.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isRootCommand(cmd) ? "bg-white" : "bg-zinc-500"
                    }`}
                  />
                  {!isLast && <div className="w-px flex-1 bg-white/10" />}
                </div>

                <div className="flex-1 rounded-xl border border-white/10 bg-black/20 p-4">
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
                        <span>
                          Priority:{" "}
                          {typeof cmd.priority === "number" ? cmd.priority : "—"}
                        </span>
                        <span>Flow: {cmd.flow_id || cmd.flowid || "—"}</span>
                        <span>
                          Root event: {cmd.root_event_id || cmd.rooteventid || "—"}
                        </span>
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
                          Command role: {isRootCommand(cmd) ? "Root node" : "Child node"}
                        </span>
                        <span>Worker: {cmd.worker || "—"}</span>
                        <span>Workspace: {cmd.workspace_id || "—"}</span>
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
