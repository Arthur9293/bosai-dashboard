"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type FlowCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
};

type Props = {
  commands: FlowCommand[];
};

function statusColor(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "done") return "#10b981";
  if (s === "running") return "#38bdf8";
  if (s === "queued") return "#f59e0b";
  if (s === "retry") return "#a855f7";
  if (["error", "failed", "dead"].includes(s)) return "#ef4444";

  return "#64748b";
}

function statusLabel(status?: string) {
  return (status || "unknown").toUpperCase();
}

export default function FlowGraphClient({ commands }: Props) {
  const nodes: Node[] = commands.map((cmd, index) => ({
    id: String(cmd.id),
    position: { x: index * 260, y: 100 },
    data: {
      label: (
        <div
          style={{
            minWidth: 180,
            color: "white",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            {cmd.capability || "unknown"}
          </div>

          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 10,
              wordBreak: "break-word",
            }}
          >
            {cmd.capability || "Unknown capability"}
          </div>

          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 999,
              background: statusColor(cmd.status),
              color: "white",
            }}
          >
            {statusLabel(cmd.status)}
          </div>
        </div>
      ),
    },
    style: {
      background: "#0f172a",
      border: `1px solid ${statusColor(cmd.status)}`,
      borderRadius: 16,
      padding: 12,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    },
  }));

  const edges: Edge[] = commands
    .filter((cmd) => cmd.parent_command_id)
    .map((cmd) => ({
      id: `e-${cmd.parent_command_id}-${cmd.id}`,
      source: String(cmd.parent_command_id),
      target: String(cmd.id),
      animated: true,
      style: {
        stroke: "#94a3b8",
        strokeWidth: 2,
      },
    }));

  return (
    <div
      style={{
        width: "100%",
        height: 560,
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top left, rgba(29,78,216,0.18), transparent 28%), #020617",
      }}
    >
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <MiniMap
          pannable
          zoomable
          style={{
            background: "#020617",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <Controls />
        <Background gap={20} size={1} color="#1e293b" />
      </ReactFlow>
    </div>
  );
}