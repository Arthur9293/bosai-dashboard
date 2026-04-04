"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

type GraphCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
};

type Props = {
  commands: GraphCommand[];
  anchorPrefix?: string;
};

type FlowNodeData = {
  label: string;
  status: string;
};

function normalizeText(value?: string) {
  return (value || "").trim();
}

function statusTone(status: string) {
  const s = status.toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) {
    return "bg-emerald-500 text-white";
  }

  if (["retry"].includes(s)) {
    return "bg-violet-500 text-white";
  }

  if (["running", "queued", "pending"].includes(s)) {
    return "bg-sky-500 text-white";
  }

  if (["failed", "error", "dead"].includes(s)) {
    return "bg-rose-500 text-white";
  }

  return "bg-zinc-700 text-zinc-100";
}

function FlowCommandNode({ data }: NodeProps<FlowNodeData>) {
  const label = normalizeText(data.label) || "unknown_capability";
  const status = normalizeText(data.status) || "unknown";

  return (
    <div className="min-w-[280px] cursor-pointer rounded-[28px] border border-cyan-400/80 bg-[#07142c] px-6 py-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#07142c]"
      />

      <div className="text-[12px] uppercase tracking-[0.22em] text-white/55">
        {label.toUpperCase()}
      </div>

      <div className="mt-2 text-[20px] font-semibold tracking-tight text-white">
        {label}
      </div>

      <div
        className={`mt-4 inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${statusTone(
          status
        )}`}
      >
        {status.toUpperCase()}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#07142c]"
      />
    </div>
  );
}

const nodeTypes = {
  flowCommand: FlowCommandNode,
};

function buildDisplayOrder(commands: GraphCommand[]): GraphCommand[] {
  if (commands.length <= 1) return commands;

  const byId = new Map<string, GraphCommand>();
  const childrenMap = new Map<string, GraphCommand[]>();

  for (const cmd of commands) {
    const id = String(cmd.id);
    byId.set(id, cmd);
    childrenMap.set(id, []);
  }

  const roots: GraphCommand[] = [];

  for (const cmd of commands) {
    const parentId = normalizeText(cmd.parent_command_id);

    if (parentId && byId.has(parentId)) {
      childrenMap.get(parentId)?.push(cmd);
    } else {
      roots.push(cmd);
    }
  }

  const ordered: GraphCommand[] = [];
  const visited = new Set<string>();

  function walk(cmd: GraphCommand) {
    const id = String(cmd.id);
    if (visited.has(id)) return;

    visited.add(id);
    ordered.push(cmd);

    const children = childrenMap.get(id) ?? [];
    for (const child of children) {
      walk(child);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  for (const cmd of commands) {
    walk(cmd);
  }

  return ordered;
}

export default function FlowGraphClient({
  commands,
  anchorPrefix = "cmd-",
}: Props) {
  const orderedCommands = useMemo(() => buildDisplayOrder(commands), [commands]);

  const { nodes, edges } = useMemo(() => {
    const builtNodes: Node<FlowNodeData>[] = orderedCommands.map((cmd, index) => {
      const label = normalizeText(cmd.capability) || "unknown_capability";
      const status = normalizeText(cmd.status) || "unknown";

      return {
        id: String(cmd.id),
        type: "flowCommand",
        position: { x: 0, y: index * 250 },
        data: {
          label,
          status,
        },
        draggable: false,
        selectable: true,
      };
    });

    const builtEdges: Edge[] = orderedCommands
      .filter((cmd) => normalizeText(cmd.parent_command_id))
      .map((cmd) => ({
        id: `edge-${cmd.parent_command_id}-${cmd.id}`,
        source: String(cmd.parent_command_id),
        target: String(cmd.id),
        type: "smoothstep",
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          strokeWidth: 2,
          strokeDasharray: "8 8",
          stroke: "rgba(203, 213, 225, 0.85)",
        },
      }));

    return { nodes: builtNodes, edges: builtEdges };
  }, [orderedCommands]);

  const jumpToTimelineCard = useCallback(
    (commandId: string) => {
      const target = document.getElementById(`${anchorPrefix}${commandId}`);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      try {
        target.animate(
          [
            { boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
            { boxShadow: "0 0 0 4px rgba(16,185,129,0.35)" },
            { boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
          ],
          {
            duration: 1400,
            easing: "ease-out",
          }
        );
      } catch {
        // no-op
      }
    },
    [anchorPrefix]
  );

  if (!nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
        Graphe indisponible pour ce flow pour le moment.
      </div>
    );
  }

  return (
    <div className="h-[640px] w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#03102a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        minZoom={0.25}
        maxZoom={1.6}
        onNodeClick={(_, node) => jumpToTimelineCard(node.id)}
      >
        <Background gap={28} size={1} color="rgba(148,163,184,0.18)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
