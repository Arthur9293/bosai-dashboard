"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardCard } from "../../../components/ui/dashboard-card";

type CommandFilters = {
  bucket: string;
  capability: string;
  workspace_id: string;
  period_key: string;
  limit: number;
};

type PreservedParams = {
  flow_id?: string;
  root_event_id?: string;
  source_event_id?: string;
  from?: string;
};

const QUICK_BUCKET_OPTIONS = ["running", "retry", "failed", "done"] as const;
const QUICK_CAPABILITY_OPTIONS = ["http_exec", "command_orchestrator"] as const;

function badgeClassName(
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300";
}

function quickChipClass(active: boolean): string {
  return active
    ? "inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-sky-300"
    : "inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-300";
}

function getCurrentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function applyPreset(
  preset: {
    bucket?: string;
    capability?: string;
    workspaceId?: string;
    periodKey?: string;
    limit?: string;
  },
  setters: {
    setBucket: (value: string) => void;
    setCapability: (value: string) => void;
    setWorkspaceId: (value: string) => void;
    setPeriodKey: (value: string) => void;
    setLimit: (value: string) => void;
  }
) {
  setters.setBucket(preset.bucket ?? "");
  setters.setCapability(preset.capability ?? "");
  setters.setWorkspaceId(preset.workspaceId ?? "");
  setters.setPeriodKey(preset.periodKey ?? "");
  setters.setLimit(preset.limit ?? "20");
}

export function CommandsFilters({
  initialFilters,
  preservedParams,
}: {
  initialFilters: CommandFilters;
  preservedParams?: PreservedParams;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [bucket, setBucket] = useState(initialFilters.bucket);
  const [capability, setCapability] = useState(initialFilters.capability);
  const [workspaceId, setWorkspaceId] = useState(initialFilters.workspace_id);
  const [periodKey, setPeriodKey] = useState(initialFilters.period_key);
  const [limit, setLimit] = useState(String(initialFilters.limit || 20));

  const currentPeriodKey = useMemo(() => getCurrentPeriodKey(), []);

  const quickPeriodOptions = useMemo(() => {
    const values = new Set<string>();

    const fromInitial = String(initialFilters.period_key || "").trim();
    if (fromInitial) values.add(fromInitial);
    if (currentPeriodKey) values.add(currentPeriodKey);

    return Array.from(values);
  }, [initialFilters.period_key, currentPeriodKey]);

  const summary = useMemo(
    () => ({
      bucket: bucket.trim() ? bucket.trim() : "Tous",
      capability: capability.trim() ? capability.trim() : "Toutes",
      workspace: workspaceId.trim() ? workspaceId.trim() : "Tous",
      period: periodKey.trim() ? periodKey.trim() : "Toutes",
      limit: limit.trim() || "20",
    }),
    [bucket, capability, workspaceId, periodKey, limit]
  );

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (preservedParams?.flow_id) params.set("flow_id", preservedParams.flow_id);
    if (preservedParams?.root_event_id) {
      params.set("root_event_id", preservedParams.root_event_id);
    }
    if (preservedParams?.source_event_id) {
      params.set("source_event_id", preservedParams.source_event_id);
    }
    if (preservedParams?.from) params.set("from", preservedParams.from);

    if (bucket.trim()) params.set("bucket", bucket.trim());
    if (capability.trim()) params.set("capability", capability.trim());
    if (workspaceId.trim()) params.set("workspace_id", workspaceId.trim());
    if (periodKey.trim()) params.set("period_key", periodKey.trim());
    if (limit.trim()) params.set("limit", limit.trim());

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetFilters = () => {
    setBucket("");
    setCapability("");
    setWorkspaceId("");
    setPeriodKey("");
    setLimit("20");

    const params = new URLSearchParams();

    if (preservedParams?.flow_id) params.set("flow_id", preservedParams.flow_id);
    if (preservedParams?.root_event_id) {
      params.set("root_event_id", preservedParams.root_event_id);
    }
    if (preservedParams?.source_event_id) {
      params.set("source_event_id", preservedParams.source_event_id);
    }
    if (preservedParams?.from) params.set("from", preservedParams.from);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <DashboardCard
      title="Commands filters"
      subtitle="Filtres simples et presets rapides pour la file Commands."
    >
      <div className="mb-5">
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Presets
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  bucket: "failed",
                  capability: "",
                  workspaceId: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setBucket, setCapability, setWorkspaceId, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              bucket === "failed" &&
                capability === "" &&
                workspaceId === "" &&
                periodKey === currentPeriodKey &&
                limit === "20"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            failed + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  bucket: "running",
                  capability: "",
                  workspaceId: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setBucket, setCapability, setWorkspaceId, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              bucket === "running" &&
                capability === "" &&
                workspaceId === "" &&
                periodKey === currentPeriodKey &&
                limit === "20"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            running + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  bucket: "retry",
                  capability: "",
                  workspaceId: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setBucket, setCapability, setWorkspaceId, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              bucket === "retry" &&
                capability === "" &&
                workspaceId === "" &&
                periodKey === currentPeriodKey &&
                limit === "20"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            retry + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  bucket: "",
                  capability: "http_exec",
                  workspaceId: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setBucket, setCapability, setWorkspaceId, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              bucket === "" &&
                capability === "http_exec" &&
                workspaceId === "" &&
                periodKey === currentPeriodKey &&
                limit === "20"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            http_exec + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  bucket: "",
                  capability: "command_orchestrator",
                  workspaceId: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setBucket, setCapability, setWorkspaceId, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              bucket === "" &&
                capability === "command_orchestrator" &&
                workspaceId === "" &&
                periodKey === currentPeriodKey &&
                limit === "20"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            command_orchestrator + période courante
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Bucket
          </div>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">Tous</option>
            <option value="queued">queued</option>
            <option value="running">running</option>
            <option value="retry">retry</option>
            <option value="failed">failed</option>
            <option value="done">done</option>
            <option value="other">other</option>
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBucket("")}
              className={quickChipClass(bucket === "")}
            >
              Tous
            </button>

            {QUICK_BUCKET_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBucket(item)}
                className={quickChipClass(bucket === item)}
              >
                {item}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Capability
          </div>
          <input
            type="text"
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
            placeholder="http_exec"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCapability("")}
              className={quickChipClass(capability === "")}
            >
              Toutes
            </button>

            {QUICK_CAPABILITY_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCapability(item)}
                className={quickChipClass(capability === item)}
              >
                {item}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Workspace
          </div>
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="ws_arthur_personal"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none"
          />
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Period key
          </div>
          <input
            type="text"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            placeholder="2026-04"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPeriodKey("")}
              className={quickChipClass(periodKey === "")}
            >
              Toutes
            </button>

            {quickPeriodOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriodKey(item)}
                className={quickChipClass(periodKey === item)}
              >
                {item}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Limit
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-5 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
          >
            Appliquer les filtres
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 md:gap-3">
        <span className={badgeClassName("default")}>Limit: {summary.limit}</span>
        <span className={badgeClassName("default")}>Bucket: {summary.bucket}</span>
        <span className={badgeClassName("default")}>
          Capability: {summary.capability}
        </span>
        <span className={badgeClassName("default")}>
          Workspace: {summary.workspace}
        </span>
        <span className={badgeClassName("default")}>Period: {summary.period}</span>
      </div>
    </DashboardCard>
  );
}
