"use client";

import FlowGraphClient from "./FlowGraphClient";

export default function FlowsPage() {
  const mockCommands = [
    { id: "1", capability: "event_engine", status: "done" },
    { id: "2", capability: "command_orchestrator", status: "done", parent_command_id: "1" },
    { id: "3", capability: "http_exec", status: "done", parent_command_id: "2" },
    { id: "4", capability: "decision_router", status: "done", parent_command_id: "3" },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h1>BOSAI Flow</h1>
      <FlowGraphClient commands={mockCommands} />
    </div>
  );
}