"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

const FlowGraphClient = dynamic(() => import("./FlowGraphClient"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-lg text-zinc-400">
      Chargement du graphe...
    </div>
  ),
});

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
  firstIncidentId?: string;
  commands: FlowGraphCommand[];
  readingMode?: "enriched" | "registry-only";
  sourceRecordId?: string;
  isPartial?: boolean;
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

  if (s === "partial") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function incidentTone(value: boolean) {
  return value
    ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
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
  const detailId =
    flow.readingMode === "registry-only"
      ? flow.sourceRecordId || flow.rootEventId || flow.flowId || flow.key
      : flow.flowId || flow.rootEventId || flow.sourceRecordId || flow.key;

  return encodeURIComponent(detailId);
}

function statCard(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

function normalize(text: string): string {
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
      flow.readingMode || "",
      flow.sourceRecordId || "",
      ...(Array.isArray(flow.commands)
        ? flow.commands.map((cmd) => cmd.capability || "")
        : []),
    ].join(" ")
  );

  return haystack.includes(q);
}

function hasDetailedCommands(flow: FlowSummary): boolean {
  return Array.isArray(flow.commands) && flow.commands.length > 0;
}

function formatFlowActivity(flow: FlowSummary): string {
  if (flow.lastActivityTs > 0) {
    return formatDate(flow.lastActivityTs);
  }

  if (flow.readingMode === "registry-only") {
    return "Registre uniquement";
  }

  return "—";
}

function incidentLabel(flow: FlowSummary): string {
  if (!flow.hasIncident || flow.incidentCount <= 0) {
    return "Aucun incident";
  }

  if (flow.incidentCount === 1) {
    return "1 incident";
  }

  return `${flow.incidentCount} incidents`;
}

export default function FlowsClient({
  flows,
  initialSelectedKey = "",
  initialFilter = "all",
}: Props) {
  const safeFlows = useMemo<FlowSummary[]>(() => {
    if (!Array.isArray(flows)) return [];

    return flows.map((flow) => ({
      ...flow,
      key: flow?.key || "",
      flowId: flow?.flowId || "",
      rootEventId: flow?.rootEventId || "",
      workspaceId: flow?.workspaceId || "production",
      status: flow?.status || "unknown",
      steps: typeof flow?.steps === "number" ? flow.steps : 0,
      rootCapability: flow?.rootCapability || "Non disponible",
      terminalCapability: flow?.terminalCapability || "Non disponible",
      durationMs: typeof flow?.durationMs === "number" ? flow.durationMs : 0,
      lastActivityTs:
        typeof flow?.lastActivityTs === "number" ? flow.lastActivityTs : 0,
      hasIncident: Boolean(flow?.hasIncident),
      incidentCount:
        typeof flow?.incidentCount === "number" ? flow.incidentCount : 0,
      commands: Array.isArray(flow?.commands) ? flow.commands : [],
      readingMode: flow?.readingMode,
      sourceRecordId: flow?.sourceRecordId,
      isPartial: Boolean(flow?.isPartial),
      firstIncidentId: flow?.firstIncidentId,
    }));
  }, [flows]);

  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);
  const [filter, setFilter] = useState<FlowFilter>(initialFilter);
  const [search, setSearch] = useState("");

  const activePreviewRef = useRef<HTMLDivElement | null>(null);
  const hasSearch = search.trim().length > 0;

  const searchedFlows = useMemo(() => {
    if (!hasSearch) return safeFlows;
    return safeFlows.filter((flow) => flowMatchesSearch(flow, search));
  }, [safeFlows, search, hasSearch]);

  const countsBase = hasSearch ? searchedFlows : safeFlows;

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
      safeFlows.find((flow) => flow.status === "running") ||
      safeFlows.find((flow) => flow.status === "failed") ||
      safeFlows.find((flow) => flow.status === "retry") ||
      safeFlows[0] ||
      null
    );
  }, [safeFlows]);

  const firstRunning = useMemo(
    () => safeFlows.find((flow) => flow.status === "running") || null,
    [safeFlows]
  );

  const firstFailed = useMemo(
    () => safeFlows.find((flow) => flow.status === "failed") || null,
    [safeFlows]
  );

  const firstRetry = useMemo(
    () => safeFlows.find((flow) => flow.status === "retry") || null,
    [safeFlows]
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

  const filterTabs: Array<{ key: FlowFilter; label: string; count: number }> = [
    { key: "all", label: "Tous", count: counts.all },
    { key: "running", label: "En cours", count: counts.running },
    { key: "failed", label: "Échec", count: counts.failed },
    { key: "retry", label: "Retry", count: counts.retry },
    { key: "success", label: "Succès", count: counts.success },
  ];

  const enrichedFlows = useMemo(
    () => filteredFlows.filter((flow) => flow.readingMode !== "registry-only"),
    [filteredFlows]
  );

  const registryOnlyFlows = useMemo(
    () => filteredFlows.filter((flow) => flow.readingMode === "registry-only"),
    [filteredFlows]
  );

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
        : safeFlows.find((flow) => flow.status === status) || null;

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
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

      {!hasSearch && (firstRunning || firstFailed || firstRetry) ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
            Attention prioritaire
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
                    {safeFlows.filter((f) => f.status === "running").length}
                  </span>
                </div>

                <div className="mt-4 min-w-0 text-lg font-semibold text-white [overflow-wrap:anywhere]">
                  {firstRunning.flowId}
                </div>

                <div className="mt-2 text-sm text-white/70">
                  Activité: {formatFlowActivity(firstRunning)}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => focusFirst("running")}
                    className="inline-flex w-full justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20 sm:w-auto"
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
                    {safeFlows.filter((f) => f.status === "failed").length}
                  </span>
                </div>

                <div className="mt-4 min-w-0 text-lg font-semibold text-white [overflow-wrap:anywhere]">
                  {firstFailed.flowId}
                </div>

                <div className="mt-2 text-sm text-white/70">
                  Activité: {formatFlowActivity(firstFailed)}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => focusFirst("failed")}
                    className="inline-flex w-full justify-center rounded-full border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 sm:w-auto"
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
                    {safeFlows.filter((f) => f.status === "retry").length}
                  </span>
                </div>

                <div className="mt-4 min-w-0 text-lg font-semibold text-white [overflow-wrap:anywhere]">
                  {firstRetry.flowId}
                </div>

                <div className="mt-2 text-sm text-white/70">
                  Activité: {formatFlowActivity(firstRetry)}
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => focusFirst("retry")}
                    className="inline-flex w-full justify-center rounded-full border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20 sm:w-auto"
                  >
                    Ouvrir le premier retry
                  </button>

                  <Link
                    href={`/flows/${safeDetailId(firstRetry)}`}
                    className="inline-flex w-full justify-center rounded-full border border-violet-500/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
                  >
                    Voir le détail
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
          Recherche
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par flowId, rootEventId, capability..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-500/30 focus:bg-white/10"
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
          >
            Effacer
          </button>

          <button
            type="button"
            onClick={resetView}
            className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
          >
            Réinitialiser la vue
          </button>

          <button
            type="button"
            onClick={goToPriorityFlow}
            className="inline-flex w-full justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 sm:w-auto"
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

      {!hasSearch ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {statCard("Tous", counts.all)}
          {statCard("En cours", counts.running)}
          {statCard("Échec", counts.failed)}
          {statCard("Retry", counts.retry)}
          {statCard("Succès", counts.success)}
        </div>
      ) : null}

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

            {selectedFlow.isPartial ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                  "partial"
                )}`}
              >
                PARTIAL
              </span>
            ) : null}

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${incidentTone(
                selectedFlow.hasIncident
              )}`}
            >
              {incidentLabel(selectedFlow)}
            </span>
          </div>

          {selectedFlow.readingMode === "registry-only" ? (
            <>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="text-lg font-semibold text-amber-200">
                  Observabilité partielle
                </div>
                <p className="mt-2 text-sm text-amber-100/80">
                  Ce flow est bien présent dans le registre BOSAI, mais aucune
                  commande détaillée n’a encore été chargée pour construire la
                  lecture causale complète.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCard("Type de lecture", "Registry-only")}
                {statCard(
                  "Source / Root record",
                  selectedFlow.sourceRecordId || "Non disponible"
                )}
                {statCard("Workspace", selectedFlow.workspaceId || "production")}
                {statCard("Incident lié", incidentLabel(selectedFlow))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
                  Identité du flow
                </div>

                <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    Flow:{" "}
                    <span className="text-zinc-200 [overflow-wrap:anywhere]">
                      {selectedFlow.flowId}
                    </span>
                  </div>
                  <div>
                    Root:{" "}
                    <span className="text-zinc-200 [overflow-wrap:anywhere]">
                      {selectedFlow.rootEventId}
                    </span>
                  </div>
                  <div>
                    Workspace:{" "}
                    <span className="text-zinc-200">
                      {selectedFlow.workspaceId}
                    </span>
                  </div>
                  <div>
                    Activité:{" "}
                    <span className="text-zinc-200">
                      {formatFlowActivity(selectedFlow)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
                  Aperçu graphique
                </div>

                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-lg text-zinc-400">
                  Graphe indisponible pour ce flow pour le moment.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {statCard("Root capability", selectedFlow.rootCapability)}
                {statCard(
                  "Terminal capability",
                  selectedFlow.terminalCapability
                )}
                {statCard("Durée totale", formatDuration(selectedFlow.durationMs))}
                {statCard("Incident lié", incidentLabel(selectedFlow))}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
                  Flow actif
                </div>

                <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    Flow:{" "}
                    <span className="text-zinc-200 [overflow-wrap:anywhere]">
                      {selectedFlow.flowId}
                    </span>
                  </div>
                  <div>
                    Root:{" "}
                    <span className="text-zinc-200 [overflow-wrap:anywhere]">
                      {selectedFlow.rootEventId}
                    </span>
                  </div>
                  <div>
                    Workspace:{" "}
                    <span className="text-zinc-200">
                      {selectedFlow.workspaceId}
                    </span>
                  </div>
                  <div>
                    Activité:{" "}
                    <span className="text-zinc-200">
                      {formatFlowActivity(selectedFlow)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
                  Aperçu graphique
                </div>

                {hasDetailedCommands(selectedFlow) ? (
                  <FlowGraphClient commands={selectedFlow.commands} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-lg text-zinc-400">
                    Graphe indisponible pour ce flow pour le moment.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
          Aucun flow exploitable trouvé.
        </div>
      )}

      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">
          Flows récents
        </div>

        {enrichedFlows.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
              Flows enrichis
            </div>

            <div className="space-y-4">
              {enrichedFlows.map((flow) => {
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="min-w-0 text-xl font-semibold text-white [overflow-wrap:anywhere]">
                          {flow.flowId}
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-white/70">
                          <div>Steps: {flow.steps}</div>
                          <div className="[overflow-wrap:anywhere]">
                            Root: {flow.rootEventId}
                          </div>
                          <div>Activité: {formatFlowActivity(flow)}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                            flow.status
                          )}`}
                        >
                          {flow.status.toUpperCase()}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${incidentTone(
                            flow.hasIncident
                          )}`}
                        >
                          {incidentLabel(flow)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => selectFlow(flow)}
                        className={`inline-flex w-full justify-center rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                          selected
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {selected ? "Flow actif" : "Sélectionner"}
                      </button>

                      <Link
                        href={`/flows/${safeDetailId(flow)}`}
                        className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
                      >
                        Voir le détail
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {registryOnlyFlows.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">
              Flows registry-only
            </div>

            <p className="text-white/65">
              Flows présents dans le registre BOSAI mais sans lecture causale
              détaillée disponible pour le moment.
            </p>

            <div className="space-y-4">
              {registryOnlyFlows.map((flow) => {
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="min-w-0 text-xl font-semibold text-white [overflow-wrap:anywhere]">
                          {flow.flowId}
                        </div>

                        <div className="mt-3 space-y-2 text-sm text-white/70">
                          <div>
                            Lecture:{" "}
                            <span className="text-zinc-200">Registry-only</span>
                          </div>

                          <div className="[overflow-wrap:anywhere]">
                            Source / Root record:{" "}
                            <span className="font-mono text-zinc-200 [overflow-wrap:anywhere]">
                              {flow.sourceRecordId || flow.rootEventId}
                            </span>
                          </div>

                          <div>
                            Activité:{" "}
                            <span className="text-zinc-200">
                              {formatFlowActivity(flow)}
                            </span>
                          </div>

                          <div>
                            Incident:{" "}
                            <span className="text-zinc-200">
                              {incidentLabel(flow)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                            flow.status
                          )}`}
                        >
                          {flow.status.toUpperCase()}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                            "partial"
                          )}`}
                        >
                          PARTIAL
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${incidentTone(
                            flow.hasIncident
                          )}`}
                        >
                          {incidentLabel(flow)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => selectFlow(flow)}
                        className={`inline-flex w-full justify-center rounded-full px-4 py-2 text-sm font-medium transition sm:w-auto ${
                          selected
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {selected ? "Flow actif" : "Sélectionner"}
                      </button>

                      <Link
                        href={`/flows/${safeDetailId(flow)}`}
                        className="inline-flex w-full justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:w-auto"
                      >
                        Voir le détail
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {filteredFlows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
            Aucun flow pour ce filtre.
          </div>
        ) : null}
      </div>
    </div>
  );
}
