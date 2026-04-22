"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardCard } from "../../../components/ui/dashboard-card";

type WorkspaceFilters = {
  status: string;
  plan: string;
  period_key: string;
  limit: number;
};

const QUICK_STATUS_OPTIONS = [
  "active",
  "blocked",
  "warnings",
  "fallback",
] as const;

const QUICK_PLAN_OPTIONS = ["plan_free"] as const;

type ChipTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet";

function badgeClassName(
  variant: ChipTone = "default"
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

function quickChipClass(active: boolean, tone: ChipTone = "info"): string {
  if (!active) {
    return "inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-300";
  }

  if (tone === "success") {
    return "inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-emerald-300";
  }

  if (tone === "warning") {
    return "inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-amber-300";
  }

  if (tone === "danger") {
    return "inline-flex rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-red-300";
  }

  if (tone === "violet") {
    return "inline-flex rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-violet-300";
  }

  if (tone === "default") {
    return "inline-flex rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white";
  }

  return "inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-sky-300";
}

function getCurrentPeriodKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function normalizeLimit(value: string): string {
  const allowed = new Set(["10", "20", "50", "100"]);
  return allowed.has(value) ? value : "20";
}

function applyPreset(
  preset: {
    status?: string;
    plan?: string;
    periodKey?: string;
    limit?: string;
  },
  setters: {
    setStatus: (value: string) => void;
    setPlan: (value: string) => void;
    setPeriodKey: (value: string) => void;
    setLimit: (value: string) => void;
  }
) {
  setters.setStatus(preset.status ?? "");
  setters.setPlan(preset.plan ?? "");
  setters.setPeriodKey(preset.periodKey ?? "");
  setters.setLimit(normalizeLimit(preset.limit ?? "20"));
}

function statusTone(status: string): ChipTone {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return "success";
  if (normalized === "blocked") return "danger";
  if (normalized === "warnings") return "warning";
  if (normalized === "fallback") return "violet";

  return "info";
}

export function WorkspacesFilters({
  initialFilters,
}: {
  initialFilters: WorkspaceFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState(initialFilters.status);
  const [plan, setPlan] = useState(initialFilters.plan);
  const [periodKey, setPeriodKey] = useState(initialFilters.period_key);
  const [limit, setLimit] = useState(
    normalizeLimit(String(initialFilters.limit || 20))
  );

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
      status: status.trim() ? status.trim() : "Tous",
      plan: plan.trim() ? plan.trim() : "Tous",
      period: periodKey.trim() ? periodKey.trim() : "Toutes",
      limit: normalizeLimit(limit.trim() || "20"),
    }),
    [status, plan, periodKey, limit]
  );

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (status.trim()) params.set("status", status.trim());
    if (plan.trim()) params.set("plan", plan.trim());
    if (periodKey.trim()) params.set("period_key", periodKey.trim());
    params.set("limit", normalizeLimit(limit.trim() || "20"));

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetFilters = () => {
    setStatus("");
    setPlan("");
    setPeriodKey("");
    setLimit("20");
    router.push(pathname);
  };

  return (
    <DashboardCard
      title="Workspaces filters"
      subtitle="Filtres simples et presets rapides pour la liste des workspaces."
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
                  status: "active",
                  plan: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setStatus, setPlan, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              status === "active" &&
                plan === "" &&
                periodKey === currentPeriodKey &&
                normalizeLimit(limit) === "20",
              "success"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            active + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  status: "blocked",
                  plan: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setStatus, setPlan, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              status === "blocked" &&
                plan === "" &&
                periodKey === currentPeriodKey &&
                normalizeLimit(limit) === "20",
              "danger"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            blocked + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  status: "warnings",
                  plan: "",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setStatus, setPlan, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              status === "warnings" &&
                plan === "" &&
                periodKey === currentPeriodKey &&
                normalizeLimit(limit) === "20",
              "warning"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            warnings + période courante
          </button>

          <button
            type="button"
            onClick={() =>
              applyPreset(
                {
                  status: "",
                  plan: "plan_free",
                  periodKey: currentPeriodKey,
                  limit: "20",
                },
                { setStatus, setPlan, setPeriodKey, setLimit }
              )
            }
            className={`${quickChipClass(
              status === "" &&
                plan === "plan_free" &&
                periodKey === currentPeriodKey &&
                normalizeLimit(limit) === "20",
              "violet"
            )} max-w-full whitespace-normal text-left leading-snug`}
          >
            plan_free + période courante
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Status
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="">Tous</option>
            <option value="active">active</option>
            <option value="blocked">blocked</option>
            <option value="warnings">warnings</option>
            <option value="fallback">fallback</option>
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus("")}
              className={quickChipClass(status === "", "default")}
            >
              Tous
            </button>

            {QUICK_STATUS_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={quickChipClass(status === item, statusTone(item))}
              >
                {item}
              </button>
            ))}
          </div>
        </label>

        <label className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Plan
          </div>
          <input
            type="text"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="plan_free"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPlan("")}
              className={quickChipClass(plan === "", "default")}
            >
              Tous
            </button>

            {QUICK_PLAN_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPlan(item)}
                className={quickChipClass(plan === item, "violet")}
              >
                {item}
              </button>
            ))}
          </div>
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
              className={quickChipClass(periodKey === "", "default")}
            >
              Toutes
            </button>

            {quickPeriodOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriodKey(item)}
                className={quickChipClass(periodKey === item, "info")}
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
            onChange={(e) => setLimit(normalizeLimit(e.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-3">
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
        <span className={badgeClassName("default")}>Status: {summary.status}</span>
        <span className={badgeClassName("default")}>Plan: {summary.plan}</span>
        <span className={badgeClassName("default")}>Period: {summary.period}</span>
      </div>
    </DashboardCard>
  );
}
