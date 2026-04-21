"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.22em] text-zinc-500";
}

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
    ? "inline-flex rounded-full border border-sky-500/25 bg-sky-500/12 px-3 py-1.5 text-[11px] font-medium text-sky-300 transition"
    : "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white";
}

function fieldClassName(): string {
  return "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500";
}

function fieldLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function sectionBoxClassName(): string {
  return "rounded-[22px] border border-white/10 bg-black/20 p-4";
}

function actionButtonClassName(
  variant: "primary" | "secondary" = "secondary"
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-5 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white";
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
    <section className={cardClassName()}>
      <div className="space-y-2">
        <div className={sectionLabelClassName()}>Commands filters</div>
        <p className="text-sm text-zinc-400">
          Filtres simples et presets rapides pour la file Commands.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        <div className={sectionBoxClassName()}>
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Presets
          </div>

          <div className="flex flex-wrap gap-2">
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
              className={quickChipClass(
                bucket === "failed" &&
                  capability === "" &&
                  workspaceId === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20"
              )}
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
              className={quickChipClass(
                bucket === "running" &&
                  capability === "" &&
                  workspaceId === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20"
              )}
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
              className={quickChipClass(
                bucket === "retry" &&
                  capability === "" &&
                  workspaceId === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20"
              )}
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
              className={quickChipClass(
                bucket === "" &&
                  capability === "http_exec" &&
                  workspaceId === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20"
              )}
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
              className={quickChipClass(
                bucket === "" &&
                  capability === "command_orchestrator" &&
                  workspaceId === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20"
              )}
            >
              command_orchestrator + période courante
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2.5">
            <div className={fieldLabelClassName()}>Bucket</div>
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className={fieldClassName()}
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
          </div>

          <div className="space-y-2.5">
            <div className={fieldLabelClassName()}>Capability</div>
            <input
              type="text"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="http_exec"
              className={fieldClassName()}
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
          </div>

          <div className="space-y-2.5">
            <div className={fieldLabelClassName()}>Workspace</div>
            <input
              type="text"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              placeholder="ws_arthur_personal"
              className={fieldClassName()}
            />
          </div>

          <div className="space-y-2.5">
            <div className={fieldLabelClassName()}>Period key</div>
            <input
              type="text"
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              placeholder="2026-04"
              className={fieldClassName()}
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
          </div>

          <div className="space-y-2.5">
            <div className={fieldLabelClassName()}>Limit</div>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={fieldClassName()}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={applyFilters}
            className={actionButtonClassName("primary")}
          >
            Appliquer les filtres
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className={actionButtonClassName("secondary")}
          >
            Réinitialiser
          </button>
        </div>

        <div className={sectionBoxClassName()}>
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Filtres actifs
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName("default")}>Limit: {summary.limit}</span>
            <span className={badgeClassName("default")}>
              Bucket: {summary.bucket}
            </span>
            <span className={badgeClassName("default")}>
              Capability: {summary.capability}
            </span>
            <span className={badgeClassName("default")}>
              Workspace: {summary.workspace}
            </span>
            <span className={badgeClassName("default")}>
              Period: {summary.period}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
