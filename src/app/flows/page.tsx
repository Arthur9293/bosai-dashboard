import FlowsClient from "./FlowsClient";
import { fetchCommands, type CommandItem } from "@/lib/api";

type FlowCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
};

type FlowGroup = {
  key: string;
  flowId: string;
  rootEventId: string;
  commands: FlowCommand[];
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

function toFlowCommand(cmd: CommandItem): FlowCommand {
  return {
    id: String(cmd.id),
    capability: typeof cmd.capability === "string" ? cmd.capability : undefined,
    status: typeof cmd.status === "string" ? cmd.status : undefined,
    parent_command_id:
      typeof cmd.parent_command_id === "string"
        ? cmd.parent_command_id
        : undefined,
    flow_id: typeof cmd.flow_id === "string" ? cmd.flow_id : undefined,
  };
}

function buildFlowGroups(commands: CommandItem[]): FlowGroup[] {
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
        commands: [toFlowCommand(cmd)],
        lastActivityAt: ts,
      });
      continue;
    }

    existing.commands.push(toFlowCommand(cmd));
    existing.lastActivityAt = Math.max(existing.lastActivityAt, ts);

    if (!existing.flowId) existing.flowId = getFlowId(cmd);
    if (!existing.rootEventId) existing.rootEventId = getRootEventId(cmd);
  }

  const allGroups = Array.from(groups.values());

  for (const group of allGroups) {
    group.commands = [...group.commands].sort((a, b) => {
      const originalA = commands.find((c) => String(c.id) === String(a.id));
      const originalB = commands.find((c) => String(c.id) === String(b.id));

      const stepDiff =
        getStepIndex(originalA as CommandItem) -
        getStepIndex(originalB as CommandItem);

      if (stepDiff !== 0) return stepDiff;

      return (
        getSortTime(originalA as CommandItem) -
        getSortTime(originalB as CommandItem)
      );
    });
  }

  allGroups.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  return allGroups;
}

export default async function FlowsPage() {
  let groups: FlowGroup[] = [];

  try {
    const data = await fetchCommands();
    const allCommands = Array.isArray(data?.commands) ? data.commands : [];
    groups = buildFlowGroups(allCommands);
  } catch {
    groups = [];
  }

  if (groups.length === 0) {
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

  return <FlowsClient groups={groups.slice(0, 10)} />;
}
