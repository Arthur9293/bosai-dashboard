import FlowGraphClient from "./FlowGraphClient";
import { fetchCommands, type CommandItem } from "@/lib/api";

function isFlowCommand(cmd: CommandItem) {
  return Boolean(cmd.flow_id || cmd.parent_command_id);
}

function getSortTime(cmd: CommandItem) {
  return new Date(
    cmd.started_at || cmd.created_at || cmd.updated_at || cmd.finished_at || 0
  ).getTime();
}

export default async function FlowsPage() {
  let commands: CommandItem[] = [];

  try {
    const data = await fetchCommands();
    const allCommands = Array.isArray(data?.commands) ? data.commands : [];

    commands = allCommands
      .filter(isFlowCommand)
      .sort((a, b) => getSortTime(a) - getSortTime(b))
      .slice(0, 20);
  } catch {
    commands = [];
  }

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

      <FlowGraphClient commands={commands} />
    </div>
  );
}
