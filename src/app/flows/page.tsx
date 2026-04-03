"use client";

import FlowGraphClient from "./FlowGraphClient";

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
};

export default function FlowsPage() {
  const commands: CommandItem[] = [
    {
      id: "1",
      capability: "event_engine",
      status: "done",
    },
    {
      id: "2",
      capability: "command_orchestrator",
      status: "done",
      parent_command_id: "1",
    },
    {
      id: "3",
      capability: "http_exec",
      status: "done",
      parent_command_id: "2",
    },
    {
      id: "4",
      capability: "decision_router",
      status: "done",
      parent_command_id: "3",
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">BOSAI Flow</h1>
      <FlowGraphClient commands={commands} />
    </div>
  );
}
