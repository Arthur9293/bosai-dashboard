import FlowGraphClient from "./FlowGraphClient";
import { fetchCommands, type CommandItem } from "@/lib/api";

type FlowGroup = {
  key: string;
  flowId: string;
  rootEventId: string;
  commands: CommandItem[];
  lastActivityAt: number;
};

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }
  return "";
}

function getFlowKey(cmd: CommandItem): string {
  const flowId = text(cmd.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId = text(cmd.root_event_id);
  if (rootEventId) return `root:${rootEventId}`;

  return "";
}

function getFlowId(cmd: CommandItem): string {
  return text(cmd.flow_id);
}

function getRootEventId(cmd: CommandItem): string {
  return text(cmd.root_event_id);
}

function getSortTime(cmd: CommandItem): number {
  return new Date(
    cmd.started_at ||
      cmd.created_at ||
      cmd.updated_at ||
      cmd.finished_at ||
      0
  ).getTime();
}

function getStepIndex(cmd: CommandItem): number {
  return typeof cmd.step_index === "number"
    ? cmd.step_index
    : Number.MAX_SAFE_INTEGER;
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "other" {
  const s = (status || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (["running", "queued", "pending", "retry"].includes(s)) return "running";
  if (["error", "failed", "dead"].includes(s)) return "failed";

  return "other";
}

function formatDate(value?: number): string {
  if (!value || Number.isNaN(value)) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeTone(status: string) {
  const s = status.toLowerCase();

  if (s === "success") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function computeFlowStatus(
  commands: CommandItem[]
): "success" | "running" | "failed" | "unknown" {
  const kinds = commands.map((cmd) => getStatusKind(cmd.status));

  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("running")) return "running";
  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function buildLatestFlow(commands: CommandItem[]): FlowGroup | null {
  const groups = new Map<string, FlowGroup>();

  for (const cmd of commands) {
    const key = getFlowKey(cmd);
    if (!key) continue;

    const ts = getSortTime(cmd);

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        flowId: getFlowId(cmd),
        rootEventId: getRootEventId(cmd),
        commands: [cmd],
        lastActivityAt: ts,
      });
      continue;
    }

    existing.commands.push(cmd);
    existing.lastActivityAt = Math.max(existing.lastActivityAt, ts);

    if (!existing.flowId) existing.flowId = getFlowId(cmd);
    if (!existing.rootEventId) existing.rootEventId = getRootEventId(cmd);
  }

  const allGroups = Array.from(groups.values());
  if (allGroups.length === 0) return null;

  for (const group of allGroups) {
    group.commands = [...group.commands].sort((a, b) => {
      const stepDiff = getStepIndex(a) - getStepIndex(b);
      if (stepDiff !== 0) return stepDiff;
      return getSortTime(a) - getSortTime(b);
    });
  }

  const multiStepGroups = allGroups.filter(
    (group) => group.commands.length >= 2
  );

  multiStepGroups.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  allGroups.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  return multiStepGroups[0] ?? allGroups[0] ?? null;
}

function statCard(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default async function FlowsPage() {
  let latestFlow: FlowGroup | null = null;

  try {
    const data = await fetchCommands();
    const allCommands = Array.isArray(data?.commands) ? data.commands : [];
    latestFlow = buildLatestFlow(allCommands);
  } catch {
    latestFlow = null;
  }

  if (!latestFlow) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            BOSAI Flow
          </h1>
          <p className="text-sm text-zinc-400">
            Visualisation du pipeline Event → Command → Capability.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
          Aucun flow exploitable trouvé pour le moment.
        </div>
      </div>
    );
  }

  const commands = latestFlow.commands;
  const flowStatus = computeFlowStatus(commands);
  const doneCount = commands.filter(
    (cmd) => getStatusKind(cmd.status) === "done"
  ).length;
  const runningCount = commands.filter(
    (cmd) => getStatusKind(cmd.status) === "running"
  ).length;
  const failedCount = commands.filter(
    (cmd) => getStatusKind(cmd.status) === "failed"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          BOSAI Flow
        </h1>
        <p className="text-sm text-zinc-400">
          Visualisation d’un flow BOSAI réel et récent.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
            flowStatus
          )}`}
        >
          {flowStatus.toUpperCase()}
        </span>

        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
          {commands.length} steps
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCard("Flow ID", latestFlow.flowId || "—")}
        {statCard("Root Event", latestFlow.rootEventId || "—")}
        {statCard("Done", doneCount)}
        {statCard("Running/Queued", runningCount)}
        {statCard("Failed", failedCount)}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        Dernière activité :{" "}
        <span className="text-zinc-200">
          {formatDate(latestFlow.lastActivityAt)}
        </span>
      </div>

      <FlowGraphClient commands={commands} />
    </div>
  );
}
