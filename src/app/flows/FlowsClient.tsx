"use client";

import { useMemo, useState } from "react";
import FlowGraphClient from "./FlowGraphClient";

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

type Props = {
  groups: FlowGroup[];
};

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "other" {
  const s = (status || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (["running", "queued", "pending", "retry"].includes(s)) return "running";
  if (["error", "failed", "dead"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatus(
  commands: FlowCommand[]
): "success" | "running" | "failed" | "unknown" {
  const kinds = commands.map((cmd) => getStatusKind(cmd.status));

  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("running")) return "running";
  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function formatDate(value?: number): string {
  if (!value || Number.isNaN(value)) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeTone(status: string) {
  const s = status.toLowerCase();

  if (s === "success") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function statCard(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white break-all">
        {value}
      </div>
    </div>
  );
}

export default function FlowsClient({ groups }: Props) {
  const initialKey =
    groups.find((group) => group.commands.length >= 2)?.key ?? groups[0]?.key;

  const [selectedKey, setSelectedKey] = useState(initialKey);

  const primaryFlow = useMemo(
    () => groups.find((group) => group.key === selectedKey) ?? groups[0],
    [groups, selectedKey]
  );

  const commands = primaryFlow?.commands ?? [];
  const flowStatus = computeFlowStatus(commands);

  const doneCount = commands.filter(
    (cmd) => getStatusKind(cmd.status) === "done"
  ).length;
  const runningCount = commands.filter(
    (cmd) => getStatusKind(cmd.status) === "running"
  ).length;
  const failedCount = commands.filter(
    (cmd) => getStatusKind(cmd.status) === "failed"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          BOSAI Flow
        </h1>
        <p className="text-sm text-zinc-400">
          Visualisation d’un flow BOSAI réel et récent.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
            flowStatus
          )}`}
        >
          {flowStatus.toUpperCase()}
        </span>

        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
          {commands.length} steps
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-zinc-300">Flows récents</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((flow) => {
            const status = computeFlowStatus(flow.commands);
            const isActive = flow.key === primaryFlow.key;

            return (
              <button
                key={flow.key}
                type="button"
                onClick={() => setSelectedKey(flow.key)}
                className={`rounded-2xl p-4 border text-left transition ${
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white truncate">
                    {flow.flowId || flow.rootEventId || "Flow sans ID"}
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${badgeTone(
                      status
                    )}`}
                  >
                    {status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-400">
                  <div>
                    Steps:{" "}
                    <span className="text-zinc-200">{flow.commands.length}</span>
                  </div>
                  <div>
                    Root:{" "}
                    <span className="text-zinc-200 break-all">
                      {flow.rootEventId || "—"}
                    </span>
                  </div>
                  <div>
                    Activité:{" "}
                    <span className="text-zinc-200">
                      {formatDate(flow.lastActivityAt)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCard("Flow ID", primaryFlow?.flowId || "—")}
        {statCard("Root Event", primaryFlow?.rootEventId || "—")}
        {statCard("Done", doneCount)}
        {statCard("Running/Queued", runningCount)}
        {statCard("Failed", failedCount)}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
        Dernière activité :{" "}
        <span className="text-zinc-200">
          {formatDate(primaryFlow?.lastActivityAt)}
        </span>
      </div>

      <FlowGraphClient commands={commands} />
    </div>
  );
}
