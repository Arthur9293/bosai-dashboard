"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import FlowGraphClient from "./FlowGraphClient";

type FlowStatus = "running" | "failed" | "retry" | "success" | "unknown";
type FlowFilter = "all" | FlowStatus;

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
  status: FlowStatus;
  steps: number;
  rootCapability: string;
  terminalCapability: string;
  durationMs: number;
  lastActivityTs: number;
  hasIncident: boolean;
  incidentCount: number;
  commands: FlowGraphCommand[];
};

type Props = {
  flows: FlowSummary[];
  initialSelectedKey?: string;
  initialFilter?: FlowFilter;
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

  if (s === "retry") {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function partialTone() {
  return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
}

function incidentTone(count: number) {
  if (count > 0) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-white/10";
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

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function flowMatchesSearch(flow: FlowSummary, rawSearch: string) {
  const q = normalize(rawSearch);
  if (!q) return true;

  const haystack = normalize(
    [
      flow.flowId,
      flow.rootEventId,
      flow.workspaceId,
      flow.status,
      flow.rootCapability,
      flow.terminalCapability,
      ...flow.commands.map((cmd) => cmd.capability || ""),
    ].join(" ")
  );

  return haystack.includes(q);
}

function flowHasExecutionData(flow: FlowSummary) {
  return Array.isArray(flow.commands) && flow.commands.length > 0;
}

function incidentLabel(flow: FlowSummary) {
  if (flow.incidentCount > 0) {
    return `${flow.incidentCount} incident${flow.incidentCount > 1 ? "s" : ""}`;
  }

  return "Aucun incident";
}

function safeCapabilityLabel(value: string) {
  const v = value?.trim();
  return v && v !== "—" ? v : "Non disponible";
}

function partialActivityLabel(flow: FlowSummary) {
  if (flow.lastActivityTs > 0) {
    return formatDate(flow.lastActivityTs);
  }

  return "Registre uniquement";
}

function compactRecordId(value: string, head = 8, tail = 6) {
  if (!value) return "—";
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export default function FlowsClient({
  flows,
  initialSelectedKey = "",
  initialFilter = "all",
}: Props) {
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);
  const [filter, setFilter] = useState<FlowFilter>(initialFilter);
  const [search, setSearch] = useState("");

  const activePreviewRef = useRef<HTMLDivElement | null>(null);

  const hasSearch = search.trim().length > 0;

  const searchedFlows = useMemo(() => {
    if (!hasSearch) return flows;
    return flows.filter((flow) => flowMatchesSearch(flow, search));
  }, [flows, search, hasSearch]);

  const countsBase = hasSearch ? searchedFlows : flows;

  const counts = useMemo(() => {
    return {
      all: countsBase.length,
      running: countsBase.filter((flow) => flow.status === "running").length,
      failed: countsBase.filter((flow) => flow.status === "failed").length,
      retry: countsBase.filter((flow) => flow.status === "retry").length,
      success: countsBase.filter((flow) => flow.status === "success").length,
      unknown: countsBase.filter((flow) => flow.status === "unknown").length,
    };
  }, [countsBase]);

  const priorityFlow = useMemo(() => {
    return (
      flows.find((flow) => flow.status === "running") ||
      flows.find((flow) => flow.status === "failed") ||
      flows.find((flow) => flow.status === "retry") ||
      flows[0] ||
      null
    );
  }, [flows]);

  const firstRunning = useMemo(
    () => flows.find((flow) => flow.status === "running") || null,
    [flows]
  );
  const firstFailed = useMemo(
    () => flows.find((flow) => flow.status === "failed") || null,
    [flows]
  );
  const firstRetry = useMemo(
    () => flows.find((flow) => flow.status === "retry") || null,
    [flows]
  );

  const filteredFlows = useMemo(() => {
    let result = searchedFlows;

    if (filter !== "all") {
      result = result.filter((flow) => flow.status === filter);
    }

    return result;
  }, [searchedFlows, filter]);

  const selectedFlow = useMemo(() => {
    return (
      filteredFlows.find((flow) => flow.key === selectedKey) ||
      filteredFlows[0] ||
      null
    );
  }, [filteredFlows, selectedKey]);

  const selectedHasExecutionData = selectedFlow
    ? flowHasExecutionData(selectedFlow)
    : false;

  const enrichedFlows = useMemo(
    () => filteredFlows.filter((flow) => flowHasExecutionData(flow)),
    [filteredFlows]
  );

  const registryOnlyFlows = useMemo(
    () => filteredFlows.filter((flow) => !flowHasExecutionData(flow)),
    [filteredFlows]
  );

  const filterTabs: Array<{ key: FlowFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: counts.all },
    { key: "running", label: "Running", count: counts.running },
    { key: "failed", label: "Failed", count: counts.failed },
    { key: "retry", label: "Retry", count: counts.retry },
    { key: "success", label: "Success", count: counts.success },
  ];

  function scrollToPreview() {
    setTimeout(() => {
      activePreviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function selectFlow(flow: FlowSummary) {
    setSelectedKey(flow.key);
    scrollToPreview();
  }

  function focusFirst(status: FlowStatus) {
    const first =
      status === "running"
        ? firstRunning
        : status === "failed"
        ? firstFailed
        : status === "retry"
        ? firstRetry
        : flows.find((flow) => flow.status === status) || null;

    setFilter(status);
    setSearch("");

    if (first) {
      setSelectedKey(first.key);
      scrollToPreview();
    }
  }

  function clearSearch() {
    setSearch("");
  }

  function resetView() {
    setSearch("");
    setFilter("all");

    if (priorityFlow) {
      setSelectedKey(priorityFlow.key);
      scrollToPreview();
    }
  }

  function goToPriorityFlow() {
    if (!priorityFlow) return;

    setSearch("");

    if (
      priorityFlow.status === "running" ||
      priorityFlow.status === "failed" ||
      priorityFlow.status === "retry"
    ) {
      setFilter(priorityFlow.status);
    } else {
      setFilter("all");
    }

    setSelectedKey(priorityFlow.key);
    scrollToPreview();
  }

  function renderFlowCard(flow: FlowSummary) {
    const selected = selectedFlow?.key === flow.key;
    const hasExecution = flowHasExecutionData(flow);

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

            {hasExecution ? (
              <div className="mt-3 space-y-1 text-sm text-white/70">
                <div>Steps: {flow.steps}</div>
                <div className="break-all">Root: {flow.rootEventId}</div>
                <div>Activité: {formatDate(flow.lastActivityTs)}</div>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 text-sm text-white/70">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400">Lecture</span>
                  <span className="text-zinc-200">Registry-only</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400">Source</span>
                  <span
                    className="font-mono text-zinc-200 break-all"
                    title={flow.rootEventId}
                  >
                    {compactRecordId(flow.rootEventId)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400">Workspace</span>
                  <span className="text-zinc-200">{flow.workspaceId}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400">Activité</span>
                  <span className="text-zinc-200">
                    {partialActivityLabel(flow)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                flow.status
              )}`}
            >
              {flow.status.toUpperCase()}
            </span>

            {!hasExecution ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${partialTone()}`}
              >
                PARTIAL
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectFlow(flow)}
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
  }

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

      {!hasSearch && (firstRunning || firstFailed || firstRetry) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
            Needs attention
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {firstRunning ? (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                      "running"
                    )}`}
                  >
                    RUNNING
                  </span>
                  <span className="text-sm text-sky-200">
                    {flows.filter((f) => f.status === "running").length}
                  </span>
                </div>

                <div className="mt-4 break-all text-lg font-semibold text-white">
                  {firstRunning.flowId}
                </div>

                <div className="mt-2 text-sm text-white/70">
                  Activité:{" "}
                  {flowHasExecutionData(firstRunning)
                    ? formatDate(firstRunning.lastActivityTs)
                    : partialActivityLabel(firstRunning)}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => focusFirst("running")}
                    className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20"
                  >
                    Ouvrir le premier running
                  </button>
                </div>
              </div>
            ) : null}

            {firstFailed ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                      "failed"
                    )}`}
                  >
                    FAILED
                  </span>
                  <span className="text-sm text-rose-200">
                    {flows.filter((f) => f.status === "failed").length}
                  </span>
                </div>

                <div className="mt-4 break-all text-lg font-semibold text-white">
                  {firstFailed.flowId}
                </div>

                <div className="mt-2 text-sm text-white/70">
                  Activité:{" "}
                  {flowHasExecutionData(firstFailed)
                    ? formatDate(firstFailed.lastActivityTs)
                    : partialActivityLabel(firstFailed)}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => focusFirst("failed")}
                    className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
                  >
                    Ouvrir le premier failed
                  </button>
                </div>
              </div>
            ) : null}

            {firstRetry ? (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                      "retry"
                    )}`}
                  >
                    RETRY
                  </span>
                  <span className="text-sm text-violet-200">
                    {flows.filter((f) => f.status === "retry").length}
                  </span>
                </div>

                <div className="mt-4 break-all text-lg font-semibold text-white">
                  {firstRetry.flowId}
                </div>

                <div className="mt-2 text-sm text-white/70">
                  Activité:{" "}
                  {flowHasExecutionData(firstRetry)
                    ? formatDate(firstRetry.lastActivityTs)
                    : partialActivityLabel(firstRetry)}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => focusFirst("retry")}
                    className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
                  >
                    Ouvrir le premier retry
                  </button>
                  <Link
                    href={`/flows/${safeDetailId(firstRetry)}`}
                    className="inline-flex rounded-full border border-violet-500/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Voir le détail
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
          Search
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par flowId, rootEventId, capability..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500/30 focus:bg-white/10"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Effacer
          </button>

          <button
            type="button"
            onClick={resetView}
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Réinitialiser la vue
          </button>

          <button
            type="button"
            onClick={goToPriorityFlow}
            className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Revenir au flow prioritaire
          </button>
        </div>

        {hasSearch ? (
          <div className="mt-3 text-sm text-zinc-400">
            Résultats de recherche :{" "}
            <span className="text-zinc-200">{filteredFlows.length}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const active = filter === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                  active
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {!hasSearch && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {statCard("All", counts.all)}
          {statCard("Running", counts.running)}
          {statCard("Failed", counts.failed)}
          {statCard("Retry", counts.retry)}
          {statCard("Success", counts.success)}
        </div>
      )}

      {selectedFlow ? (
        <div ref={activePreviewRef} className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                selectedFlow.status
              )}`}
            >
              {selectedFlow.status.toUpperCase()}
            </span>

            {selectedHasExecutionData ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                {selectedFlow.steps} steps
              </span>
            ) : (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${partialTone()}`}
              >
                PARTIAL
              </span>
            )}

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${incidentTone(
                selectedFlow.incidentCount
              )}`}
            >
              {incidentLabel(selectedFlow)}
            </span>
          </div>

          {!selectedHasExecutionData ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-sm font-medium text-amber-200">
                Observabilité partielle
              </div>
              <p className="mt-2 text-sm text-amber-100/80">
                Ce flow est bien présent dans le registre BOSAI, mais aucune
                commande détaillée n’a encore été chargée pour construire la
                lecture causale complète.
              </p>
            </div>
          ) : null}

          {selectedHasExecutionData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCard(
                "Root capability",
                safeCapabilityLabel(selectedFlow.rootCapability)
              )}
              {statCard(
                "Terminal capability",
                safeCapabilityLabel(selectedFlow.terminalCapability)
              )}
              {statCard("Durée totale", formatDuration(selectedFlow.durationMs))}
              {statCard("Incident lié", incidentLabel(selectedFlow))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCard("Type de lecture", "Registry-only")}
              {statCard("Source / Root record", selectedFlow.rootEventId)}
              {statCard("Workspace", selectedFlow.workspaceId)}
              {statCard("Incident lié", incidentLabel(selectedFlow))}
            </div>
          )}

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
                  {selectedHasExecutionData
                    ? formatDate(selectedFlow.lastActivityTs)
                    : partialActivityLabel(selectedFlow)}
                </span>
              </div>
            </div>
          </div>

          {selectedHasExecutionData ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
                Aperçu graphique
              </div>

              <FlowGraphClient commands={selectedFlow.commands} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
                Aperçu graphique
              </div>

              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-zinc-400">
                Graphe indisponible pour ce flow pour le moment.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
          Aucun flow exploitable trouvé.
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Flows récents
        </div>

        <div className="space-y-6">
          {filteredFlows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
              Aucun flow pour ce filtre.
            </div>
          ) : (
            <>
              {enrichedFlows.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Flows enrichis
                  </div>
                  {enrichedFlows.map((flow) => renderFlowCard(flow))}
                </div>
              ) : null}

              {registryOnlyFlows.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Registry-only flows
                    </div>
                    <div className="text-sm text-zinc-400">
                      Flows présents dans le registre BOSAI mais sans lecture
                      causale détaillée disponible pour le moment.
                    </div>
                  </div>

                  {registryOnlyFlows.map((flow) => renderFlowCard(flow))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
