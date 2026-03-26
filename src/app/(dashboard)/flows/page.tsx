import Link from "next/link";
import { fetchCommands } from "../../../lib/api";

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
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
  input?: Record<string, unknown>;
  input_json?: Record<string, unknown> | string;
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
  const direct = cmd.flow_id || cmd.flowid || undefined;

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const inputObj = safeObject(cmd.input) || parseInputJson(cmd.input_json);

  const candidate = inputObj?.flow_id ?? inputObj?.flowid;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  return null;
}

function getCommandRootEventId(cmd: CommandItem): string | undefined {
  const direct =
    cmd.root_event_id ||
    cmd.rooteventid ||
    cmd.event_id ||
    undefined;

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const inputObj = safeObject(cmd.input) || parseInputJson(cmd.input_json);

  const candidate =
    inputObj?.root_event_id ??
    inputObj?.rooteventid ??
    inputObj?.event_id;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  return undefined;
}

function getDisplayFlowTitle(flow: FlowGroup) {
  return flow.isSynthetic ? "Legacy standalone command" : flow.flowId;
}

function getFallbackFlowKey(flow: FlowGroup) {
  return flow.isSynthetic ? flow.flowId : null;
}

function flowKindBadge(flow: FlowGroup) {
  return flow.isSynthetic ? "LEGACY" : "LINKED";
}

function flowKindTone(flow: FlowGroup) {
  return flow.isSynthetic
    ? "bg-white/5 text-zinc-300 border border-white/10"
    : "bg-sky-500/15 text-sky-300 border border-sky-500/20";
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

  const flows = [...grouped.values()]
    .map((group) => {
      const sortedCommands = [...group.commands].sort((a, b) => {
        const aStep =
          typeof a.step_index === "number" ? a.step_index : Number.MAX_SAFE_INTEGER;
        const bStep =
          typeof b.step_index === "number" ? b.step_index : Number.MAX_SAFE_INTEGER;

        if (aStep !== bStep) {
          return aStep - bStep;
        }

        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      return {
        ...group,
        commands: sortedCommands,
      };
    })
    .sort((a, b) => {
      if (a.isSynthetic !== b.isSynthetic) {
        return a.isSynthetic ? 1 : -1;
      }

      const aLast = a.commands[a.commands.length - 1];
      const bLast = b.commands[b.commands.length - 1];

      const aTs = new Date(aLast?.created_at || 0).getTime();
      const bTs = new Date(bLast?.created_at || 0).getTime();

      return bTs - aTs;
    })
    .slice(0, 30);

  const linkedFlows = flows.filter((flow) => !flow.isSynthetic);
  const legacyFlows = flows.filter((flow) => flow.isSynthetic);

  function renderFlowCard(flow: FlowGroup) {
    const fallbackKey = getFallbackFlowKey(flow);
    const flowStatus = getFlowStatus(flow.commands);
    const summary = getFlowSummary(flow.commands);

    return (
      <Link
        key={flow.flowId}
        href={`/flows/${encodeURIComponent(flow.flowId)}`}
        className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
      >
        <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            BOSAI FLOW
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="break-all text-lg font-semibold text-white">
              {getDisplayFlowTitle(flow)}
            </div>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${flowStatusTone(
                flowStatus
              )}`}
            >
              {flowStatus}
            </span>

            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${flowKindTone(
                flow
              )}`}
            >
              {flowKindBadge(flow)}
            </span>
          </div>

          {fallbackKey ? (
            <div className="break-all text-sm text-zinc-400">
              Fallback key: <span className="text-zinc-300">{fallbackKey}</span>
            </div>
          ) : null}

          <div className="break-all text-sm text-zinc-400">
            Root event: <span className="text-zinc-300">{flow.rootEventId || "—"}</span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
            <span>{flow.commands.length} commande(s)</span>
            <span>Done: {summary.done}</span>
            <span>Running: {summary.running}</span>
            <span>Retry: {summary.retry}</span>
            <span>Failed: {summary.failed}</span>
          </div>
        </div>

        <div className="space-y-3">
          {flow.commands.map((cmd, index) => {
            const isLast = index === flow.commands.length - 1;
            const displayStep =
              typeof cmd.step_index === "number" ? cmd.step_index : index + 1;

            return (
              <div key={cmd.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-white" />
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
                      </div>

                      <div className="break-all text-sm text-zinc-400">
                        ID: <span className="text-zinc-300">{cmd.id}</span>
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
      </Link>
    );
  }

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
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Linked flows</h2>
              <span className="text-sm text-zinc-400">{linkedFlows.length}</span>
            </div>

            {linkedFlows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
                Aucun linked flow visible.
              </div>
            ) : (
              <div className="space-y-4">
                {linkedFlows.map((flow) => renderFlowCard(flow))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Legacy flows</h2>
              <span className="text-sm text-zinc-400">{legacyFlows.length}</span>
            </div>

            {legacyFlows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
                Aucun legacy flow visible.
              </div>
            ) : (
              <div className="space-y-4">
                {legacyFlows.map((flow) => renderFlowCard(flow))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
