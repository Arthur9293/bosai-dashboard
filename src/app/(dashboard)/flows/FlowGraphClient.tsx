"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type PositionedNode = {
  id: string;
  capability: string;
  status: string;
  parent_command_id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type GraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
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

function buildGraph(commands: GraphCommand[], availableWidth: number) {
  const ordered = buildDisplayOrder(commands);

  const safeWidth = Math.max(280, availableWidth || 320);
  const compact = safeWidth < 640;

  const horizontalPadding = compact ? 18 : 32;
  const topPadding = compact ? 28 : 56;
  const bottomPadding = compact ? 28 : 56;
  const gapY = compact ? 72 : 110;

  const nodeWidth = Math.min(360, Math.max(232, safeWidth - horizontalPadding * 2));
  const nodeHeight = compact ? 144 : 156;
  const graphWidth = Math.max(safeWidth, nodeWidth + horizontalPadding * 2);
  const centerX = Math.round((graphWidth - nodeWidth) / 2);

  const nodes: PositionedNode[] = ordered.map((cmd, index) => ({
    id: String(cmd.id),
    capability: normalizeText(cmd.capability) || "unknown_capability",
    status: normalizeText(cmd.status) || "unknown",
    parent_command_id: normalizeText(cmd.parent_command_id) || undefined,
    x: centerX,
    y: topPadding + index * (nodeHeight + gapY),
    width: nodeWidth,
    height: nodeHeight,
  }));

  const byId = new Map(nodes.map((node) => [node.id, node]));

  const edges: GraphEdge[] = nodes
    .filter((node) => node.parent_command_id)
    .map((node) => {
      const parent = byId.get(String(node.parent_command_id));
      if (!parent) return null;

      return {
        id: `edge-${parent.id}-${node.id}`,
        sourceId: parent.id,
        targetId: node.id,
        x1: parent.x + parent.width / 2,
        y1: parent.y + parent.height,
        x2: node.x + node.width / 2,
        y2: node.y,
      };
    })
    .filter((edge): edge is GraphEdge => edge !== null);

  const graphHeight =
    nodes.length > 0
      ? nodes[nodes.length - 1].y + nodeHeight + bottomPadding
      : 440;

  return {
    width: graphWidth,
    height: Math.max(compact ? 440 : 520, graphHeight),
    nodes,
    edges,
  };
}

function edgePath(edge: GraphEdge) {
  const midOffset = Math.max(28, Math.floor((edge.y2 - edge.y1) / 2));

  return [
    `M ${edge.x1} ${edge.y1}`,
    `C ${edge.x1} ${edge.y1 + midOffset},`,
    `${edge.x2} ${edge.y2 - midOffset},`,
    `${edge.x2} ${edge.y2}`,
  ].join(" ");
}

export default function FlowGraphClient({
  commands,
  anchorPrefix = "cmd-",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      setContainerWidth(node.clientWidth);
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const graph = useMemo(
    () => buildGraph(commands, containerWidth),
    [commands, containerWidth]
  );

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
            { boxShadow: "0 0 0 4px rgba(16,185,129,0.30)" },
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

  if (!graph.nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
        Graphe indisponible pour ce flow pour le moment.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#03102a]"
    >
      <div
        className="relative mx-auto w-full max-w-full overflow-hidden"
        style={{
          height: `${graph.height}px`,
        }}
      >
        <svg
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="flow-arrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(203,213,225,0.9)" />
            </marker>
          </defs>

          {graph.edges.map((edge) => (
            <path
              key={edge.id}
              d={edgePath(edge)}
              fill="none"
              stroke="rgba(203,213,225,0.88)"
              strokeWidth="2.5"
              strokeDasharray="8 8"
              markerEnd="url(#flow-arrow)"
            />
          ))}
        </svg>

        {graph.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => jumpToTimelineCard(node.id)}
            className="absolute overflow-hidden rounded-[28px] border border-cyan-400/80 bg-[#07142c] px-5 py-5 text-left text-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition hover:scale-[1.01] hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${node.width}px`,
              minHeight: `${node.height}px`,
            }}
          >
            <div className="flex items-center justify-center">
              <div className="h-3 w-3 rounded-full border-2 border-white bg-[#07142c]" />
            </div>

            <div className="mt-3 break-words text-[11px] uppercase tracking-[0.2em] text-white/55 [overflow-wrap:anywhere]">
              {node.capability}
            </div>

            <div className="mt-2 break-words text-[18px] font-semibold tracking-tight text-white [overflow-wrap:anywhere] sm:text-[20px]">
              {node.capability}
            </div>

            <div
              className={`mt-4 inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${statusTone(
                node.status
              )}`}
            >
              {node.status.toUpperCase()}
            </div>

            <div className="mt-4 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full border-2 border-white bg-[#07142c]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
