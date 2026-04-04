"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type FlowCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isMobile;
}

export default function FlowGraphClient({ commands }: Props) {
  const safeCommands = Array.isArray(commands) ? commands : [];
  const isMobile = useIsMobile();

  const { nodes, edges } = useMemo(() => {
    const commandMap = new Map<string, FlowCommand>();
    const childrenMap = new Map<string, FlowCommand[]>();
    const orderMap = new Map<string, number>();

    safeCommands.forEach((cmd, index) => {
      const id = String(cmd.id);
      commandMap.set(id, cmd);
      childrenMap.set(id, []);
      orderMap.set(id, index);
    });

    const roots: FlowCommand[] = [];

    safeCommands.forEach((cmd) => {
      const id = String(cmd.id);
      const parentId = cmd.parent_command_id
        ? String(cmd.parent_command_id)
        : "";

      if (parentId && commandMap.has(parentId)) {
        childrenMap.get(parentId)?.push(cmd);
      } else {
        roots.push(cmd);
      }
    });

    childrenMap.forEach((children) => {
      children.sort((a, b) => {
        return (
          (orderMap.get(String(a.id)) ?? 0) - (orderMap.get(String(b.id)) ?? 0)
        );
      });
    });

    if (roots.length === 0 && safeCommands.length > 0) {
      roots.push(safeCommands[0]);
    }

    roots.sort((a, b) => {
      return (
        (orderMap.get(String(a.id)) ?? 0) - (orderMap.get(String(b.id)) ?? 0)
      );
    });

    const layoutMeta = new Map<string, { depth: number; lane: number }>();
    const placed = new Set<string>();
    const active = new Set<string>();
    let laneCursor = 0;

    const placeNode = (id: string, depth: number): number => {
      if (layoutMeta.has(id)) {
        return layoutMeta.get(id)!.lane;
      }

      if (active.has(id)) {
        const fallbackLane = laneCursor++;
        layoutMeta.set(id, { depth, lane: fallbackLane });
        return fallbackLane;
      }

      active.add(id);

      const children = (childrenMap.get(id) ?? []).filter(
        (child) => String(child.id) !== id
      );

      let lane: number;

      if (children.length === 0) {
        lane = laneCursor++;
      } else {
        const childLanes = children.map((child) =>
          placeNode(String(child.id), depth + 1)
        );
        lane =
          childLanes.reduce((sum, value) => sum + value, 0) / childLanes.length;
      }

      layoutMeta.set(id, { depth, lane });
      active.delete(id);
      placed.add(id);

      return lane;
    };

    roots.forEach((root) => {
      placeNode(String(root.id), 0);
    });

    safeCommands.forEach((cmd) => {
      const id = String(cmd.id);
      if (!placed.has(id)) {
        placeNode(id, 0);
      }
    });

    const depthGap = isMobile ? 190 : 270;
    const laneGap = isMobile ? 220 : 180;

    const builtNodes: Node[] = safeCommands.map((cmd) => {
      const id = String(cmd.id);
      const meta = layoutMeta.get(id) ?? { depth: 0, lane: 0 };

      const position = isMobile
        ? {
            x: 40 + meta.lane * laneGap,
            y: 40 + meta.depth * depthGap,
          }
        : {
            x: 50 + meta.depth * depthGap,
            y: 60 + meta.lane * laneGap,
          };

      return {
        id,
        position,
        draggable: false,
        selectable: true,
        data: {
          label: (
            <div
              style={{
                minWidth: 160,
                maxWidth: 180,
                color: "white",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                  marginBottom: 6,
                  wordBreak: "break-word",
                }}
              >
                {cmd.capability || "unknown"}
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 10,
                  wordBreak: "break-word",
                  lineHeight: 1.2,
                }}
              >
                {cmd.capability || "Unknown capability"}
              </div>

              <div
                style={{
                  display: "inline-block",
                  fontSize: 10,
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
      };
    });

    const builtEdges: Edge[] = safeCommands
      .filter((cmd) => cmd.parent_command_id && commandMap.has(String(cmd.parent_command_id)))
      .map((cmd) => ({
        id: `e-${cmd.parent_command_id}-${cmd.id}`,
        source: String(cmd.parent_command_id),
        target: String(cmd.id),
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          stroke: "#94a3b8",
          strokeWidth: 2,
          strokeDasharray: "6 6",
        },
      }));

    return { nodes: builtNodes, edges: builtEdges };
  }, [safeCommands, isMobile]);

  return (
    <div
      style={{
        width: "100%",
        height: isMobile ? "72vh" : "min(72vh, 620px)",
        minHeight: isMobile ? 560 : 420,
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top left, rgba(29,78,216,0.18), transparent 28%), #020617",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
          padding: isMobile ? 0.35 : 0.2,
          minZoom: isMobile ? 0.35 : 0.5,
          maxZoom: 1.15,
        }}
        minZoom={0.25}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          showInteractive={false}
          style={{
            background: "#020617",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
        <Background gap={20} size={1} color="#1e293b" />
      </ReactFlow>
    </div>
  );
}
