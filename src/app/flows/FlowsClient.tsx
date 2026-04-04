"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FlowGraphClient from "./FlowGraphClient";

type FlowGraphCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
};

type FlowSummary = {
  key: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
  status: "success" | "running" | "failed" | "unknown";
  steps: number;
  rootCapability: string;
  terminalCapability: string;
  durationMs: number;
  lastActivityTs: number;
  hasIncident: boolean;
  commands: FlowGraphCommand[];
};

type Props = {
  flows: FlowSummary[];
  initialSelectedKey?: string;
};

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

function booleanTone(value: boolean) {
  return value
    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
    : "bg-zinc-800 text-zinc-300 border border-white/10";
}

function formatDate(ts?: number): string {
  if (!ts || Number.isNaN(ts)) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function safeDetailId(flow: FlowSummary): string {
  return encodeURIComponent(flow.flowId || flow.rootEventId || flow.key);
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

export default function FlowsClient({
  flows,
  initialSelectedKey = "",
}: Props) {
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);

  const selectedFlow = useMemo(() => {
    return (
      flows.find((flow) => flow.key === selectedKey) ||
      flows[0] ||
      null
    );
  }, [flows, selectedKey]);

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          Flows
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          BOSAI Flows
        </h1>
        <p className="text-white/55">
          Supervision des flows récents avec lecture causale et aperçu direct.
        </p>
      </div>

      {selectedFlow ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                selectedFlow.status
              )}`}
            >
              {selectedFlow.status.toUpperCase()}
            </span>

            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
              {selectedFlow.steps} steps
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCard("Root capability", selectedFlow.rootCapability)}
            {statCard("Terminal capability", selectedFlow.terminalCapability)}
            {statCard("Durée totale", formatDuration(selectedFlow.durationMs))}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Incident lié</div>
              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${booleanTone(
                    selectedFlow.hasIncident
                  )}`}
                >
                  {selectedFlow.hasIncident ? "OUI" : "NON"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Flow actif
            </div>

            <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                Flow:{" "}
                <span className="text-zinc-200 break-all">
                  {selectedFlow.flowId}
                </span>
              </div>
              <div>
                Root:{" "}
                <span className="text-zinc-200 break-all">
                  {selectedFlow.rootEventId}
                </span>
              </div>
              <div>
                Workspace:{" "}
                <span className="text-zinc-200">{selectedFlow.workspaceId}</span>
              </div>
              <div>
                Activité:{" "}
                <span className="text-zinc-200">
                  {formatDate(selectedFlow.lastActivityTs)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Aperçu graphique
            </div>

            <FlowGraphClient commands={selectedFlow.commands} />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
          Aucun flow exploitable trouvé.
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Flows récents
        </div>

        <div className="space-y-4">
          {flows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
              Aucun flow récent.
            </div>
          ) : (
            flows.map((flow) => {
              const selected = selectedFlow?.key === flow.key;

              return (
                <div
                  key={flow.key}
                  className={`rounded-2xl border p-4 transition ${
                    selected
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-all text-xl font-semibold text-white">
                        {flow.flowId}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-white/70">
                        <div>Steps: {flow.steps}</div>
                        <div className="break-all">Root: {flow.rootEventId}</div>
                        <div>Activité: {formatDate(flow.lastActivityTs)}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                        flow.status
                      )}`}
                    >
                      {flow.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(flow.key)}
                      className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                          : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {selected ? "Flow actif" : "Sélectionner"}
                    </button>

                    <Link
                      href={`/flows/${safeDetailId(flow)}`}
                      className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      Voir le détail
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
