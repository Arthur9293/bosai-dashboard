type CommandItem = {
  id: string;
  capability: string;
  worker: string;
  status: "pending" | "running" | "done" | "error" | "unsupported";
  started_at: string;
};

const MOCK_COMMANDS: CommandItem[] = [
  {
    id: "cmd_001",
    capability: "command_orchestrator",
    worker: "bosai-worker",
    status: "done",
    started_at: "2026-03-08 10:12",
  },
  {
    id: "cmd_002",
    capability: "sla_machine",
    worker: "bosai-worker",
    status: "running",
    started_at: "2026-03-08 10:15",
  },
  {
    id: "cmd_003",
    capability: "http_exec",
    worker: "bosai-worker",
    status: "error",
    started_at: "2026-03-08 10:18",
  },
];

function StatusBadge({ status }: { status: CommandItem["status"] }) {
  const map: Record<CommandItem["status"], string> = {
    pending: "bg-zinc-700 text-zinc-200",
    running: "bg-blue-500/20 text-blue-400",
    done: "bg-emerald-500/20 text-emerald-400",
    error: "bg-red-500/20 text-red-400",
    unsupported: "bg-orange-500/20 text-orange-400",
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-md font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
}

export default function CommandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Commands</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pilotage des commandes du workspace.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 text-zinc-400">
            <tr>
              <th className="text-left px-4 py-3">Capability</th>
              <th className="text-left px-4 py-3">Worker</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Started</th>
            </tr>
          </thead>

          <tbody>
            {MOCK_COMMANDS.map((cmd) => (
              <tr
                key={cmd.id}
                className="border-b border-white/5 hover:bg-white/5"
              >
                <td className="px-4 py-3 text-white">{cmd.capability}</td>
                <td className="px-4 py-3 text-zinc-300">{cmd.worker}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={cmd.status} />
                </td>
                <td className="px-4 py-3 text-zinc-400">{cmd.started_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
