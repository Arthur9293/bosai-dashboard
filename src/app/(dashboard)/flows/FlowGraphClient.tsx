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

type ViewTransform = {
  x: number;
  y: number;
  scale: number;
};

function normalizeText(value?: string) {
  return (value || "").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function statusTone(status: string) {
  const s = status.toLowerCase();

  if (["done", "success", "resolved", "ok", "completed", "processed"].includes(s)) {
    return "border-emerald-400/25 bg-emerald-500/18 text-emerald-200";
  }

  if (["retry"].includes(s)) {
    return "border-violet-400/25 bg-violet-500/20 text-violet-100";
  }

  if (["running", "queued", "pending"].includes(s)) {
    return "border-sky-400/25 bg-sky-500/18 text-sky-100";
  }

  if (["failed", "error", "dead", "blocked"].includes(s)) {
    return "border-rose-400/25 bg-rose-500/18 text-rose-100";
  }

  return "border-white/10 bg-white/[0.05] text-zinc-100";
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

  const safeWidth = Math.max(360, availableWidth || 720);
  const compactViewport = safeWidth < 640;
  const longFlow = ordered.length >= 7;

  const graphPaddingX = compactViewport ? 34 : 56;
  const graphPaddingY = compactViewport ? 28 : 34;

  const nodeWidth = compactViewport ? 210 : longFlow ? 220 : 236;
  const nodeHeight = compactViewport ? 74 : longFlow ? 78 : 84;
  const gapY = compactViewport ? (longFlow ? 16 : 18) : longFlow ? 18 : 22;

  const graphWidth = Math.max(
    safeWidth,
    nodeWidth + graphPaddingX * 2 + 80
  );

  const nodeX = Math.round((graphWidth - nodeWidth) / 2);

  const nodes: PositionedNode[] = ordered.map((cmd, index) => ({
    id: String(cmd.id),
    capability: normalizeText(cmd.capability) || "unknown_capability",
    status: normalizeText(cmd.status) || "unknown",
    parent_command_id: normalizeText(cmd.parent_command_id) || undefined,
    x: nodeX,
    y: graphPaddingY + index * (nodeHeight + gapY),
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
      ? nodes[nodes.length - 1].y + nodeHeight + graphPaddingY
      : 420;

  return {
    width: graphWidth,
    height: Math.max(compactViewport ? 420 : 520, graphHeight),
    nodes,
    edges,
  };
}

function edgePath(edge: GraphEdge) {
  const deltaY = edge.y2 - edge.y1;
  const curve = Math.max(18, Math.floor(deltaY / 2));

  return [
    `M ${edge.x1} ${edge.y1}`,
    `C ${edge.x1} ${edge.y1 + curve},`,
    `${edge.x2} ${edge.y2 - curve},`,
    `${edge.x2} ${edge.y2}`,
  ].join(" ");
}

function computeFitTransform(
  graphWidth: number,
  graphHeight: number,
  viewportWidth: number,
  viewportHeight: number
): ViewTransform {
  const padding = viewportWidth < 640 ? 22 : 28;
  const scale = clamp(
    Math.min(
      (viewportWidth - padding * 2) / graphWidth,
      (viewportHeight - padding * 2) / graphHeight
    ),
    0.22,
    1
  );

  return {
    scale,
    x: Math.round((viewportWidth - graphWidth * scale) / 2),
    y: Math.round((viewportHeight - graphHeight * scale) / 2),
  };
}

export default function FlowGraphClient({
  commands,
  anchorPrefix = "cmd-",
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const draggingRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const update = () => {
      setViewportSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const graph = useMemo(
    () => buildGraph(commands, viewportSize.width),
    [commands, viewportSize.width]
  );

  const fitToViewport = useCallback(() => {
    if (!viewportSize.width || !viewportSize.height) return;

    setTransform(
      computeFitTransform(
        graph.width,
        graph.height,
        viewportSize.width,
        viewportSize.height
      )
    );
  }, [graph.height, graph.width, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    fitToViewport();
  }, [fitToViewport]);

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
            { boxShadow: "0 0 0 0 rgba(56,189,248,0)" },
            { boxShadow: "0 0 0 4px rgba(56,189,248,0.26)" },
            { boxShadow: "0 0 0 0 rgba(56,189,248,0)" },
          ],
          {
            duration: 1300,
            easing: "ease-out",
          }
        );
      } catch {
        // no-op
      }
    },
    [anchorPrefix]
  );

  const zoomAt = useCallback(
    (nextScale: number, centerX?: number, centerY?: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const cx = centerX ?? rect.left + rect.width / 2;
      const cy = centerY ?? rect.top + rect.height / 2;

      setTransform((prev) => {
        const clampedScale = clamp(nextScale, 0.22, 2.2);

        const localX = cx - rect.left;
        const localY = cy - rect.top;

        const worldX = (localX - prev.x) / prev.scale;
        const worldY = (localY - prev.y) / prev.scale;

        return {
          scale: clampedScale,
          x: localX - worldX * clampedScale,
          y: localY - worldY * clampedScale,
        };
      });
    },
    []
  );

  const zoomIn = useCallback(() => {
    zoomAt(transform.scale + 0.12);
  }, [transform.scale, zoomAt]);

  const zoomOut = useCallback(() => {
    zoomAt(transform.scale - 0.12);
  }, [transform.scale, zoomAt]);

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      zoomAt(transform.scale + delta, event.clientX, event.clientY);
    },
    [transform.scale, zoomAt]
  );

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button[data-node='true']")) {
      return;
    }

    draggingRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };

    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }, [transform.x, transform.y]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    setTransform((prev) => ({
      ...prev,
      x: drag.originX + dx,
      y: drag.originY + dy,
    }));
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    draggingRef.current = null;

    try {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }, []);

  if (!graph.nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
        Graphe indisponible pour ce flow pour le moment.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-cyan-500/12 bg-[linear-gradient(180deg,rgba(15,54,145,0.30)_0%,rgba(10,34,98,0.20)_48%,rgba(5,16,44,0.28)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div
        ref={viewportRef}
        className="relative h-[360px] w-full overflow-hidden md:h-[420px] xl:h-[500px]"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/75 backdrop-blur">
          Glisser • Zoomer
        </div>

        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            aria-label="Zoom arrière"
          >
            −
          </button>

          <button
            type="button"
            onClick={fitToViewport}
            className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-black/30 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08]"
          >
            Fit
          </button>

          <button
            type="button"
            onClick={zoomIn}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            aria-label="Zoom avant"
          >
            +
          </button>
        </div>

        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            className="relative"
            style={{
              width: `${graph.width}px`,
              height: `${graph.height}px`,
            }}
          >
            <svg
              width={graph.width}
              height={graph.height}
              className="absolute inset-0 h-full w-full"
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
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(203,213,225,0.88)" />
                </marker>
              </defs>

              {graph.edges.map((edge) => (
                <path
                  key={edge.id}
                  d={edgePath(edge)}
                  fill="none"
                  stroke="rgba(203,213,225,0.86)"
                  strokeWidth="2.25"
                  strokeDasharray="7 7"
                  markerEnd="url(#flow-arrow)"
                />
              ))}
            </svg>

            {graph.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                data-node="true"
                onClick={() => jumpToTimelineCard(node.id)}
                className="absolute overflow-hidden rounded-[24px] border border-cyan-400/75 bg-[linear-gradient(180deg,rgba(8,20,48,0.94)_0%,rgba(4,12,30,0.90)_100%)] px-4 py-3 text-left text-white shadow-[0_16px_36px_rgba(0,0,0,0.30)] transition hover:scale-[1.01] hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`,
                }}
              >
                <div className="flex items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#07142c]" />
                </div>

                <div className="mt-2 break-words text-[10px] uppercase tracking-[0.18em] text-white/50 [overflow-wrap:anywhere]">
                  {node.capability}
                </div>

                <div className="mt-1 break-words text-[15px] font-semibold leading-tight tracking-tight text-white [overflow-wrap:anywhere]">
                  {node.capability}
                </div>

                <div
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusTone(
                    node.status
                  )}`}
                >
                  {node.status.toUpperCase()}
                </div>

                <div className="mt-3 flex items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#07142c]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
