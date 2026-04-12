"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardCard } from "../../../components/ui/dashboard-card";

type LedgerFilters = {
  status: string;
  capability: string;
  period_key: string;
  limit: number;
};

const QUICK_STATUS_OPTIONS = ["success", "error", "blocked", "unsupported"] as const;
const QUICK_CAPABILITY_OPTIONS = ["health_tick"] as const;

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
    ? "inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-300"
    : "inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300";
}

export function WorkspaceLedgerFilters({
  initialFilters,
}: {
  initialFilters: LedgerFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState(initialFilters.status);
  const [capability, setCapability] = useState(initialFilters.capability);
  const [periodKey, setPeriodKey] = useState(initialFilters.period_key);
  const [limit, setLimit] = useState(String(initialFilters.limit || 20));

  const summary = useMemo(
    () => ({
      status: status.trim() ? status.trim() : "Tous",
      capability: capability.trim() ? capability.trim() : "Toutes",
      period: periodKey.trim() ? periodKey.trim() : "Toutes",
      limit: limit.trim() || "20",
    }),
    [status, capability, periodKey, limit]
  );

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (status.trim()) params.set("status", status.trim());
    if (capability.trim()) params.set("capability", capability.trim());
    if (periodKey.trim()) params.set("period_key", periodKey.trim());
    if (limit.trim()) params.set("limit", limit.trim());

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const resetFilters = () => {
    setStatus("");
    setCapability("");
    setPeriodKey("");
    setLimit("20");
    router.push(pathname);
  };

  return (
    <DashboardCard
      title="Ledger filters"
      subtitle="Filtres simples du ledger pour ce workspace."
    >
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
            <option value="success">success</option>
            <option value="blocked">blocked</option>
            <option value="error">error</option>
            <option value="unsupported">unsupported</option>
          </select>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus("")}
              className={quickChipClass(status === "")}
            >
              Tous
            </button>

            {QUICK_STATUS_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={quickChipClass(status === item)}
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
            placeholder="health_tick"
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
            Period key
          </div>
          <input
            type="text"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            placeholder="2026-04"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none"
          />
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

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={badgeClassName("default")}>Limit: {summary.limit}</span>
        <span className={badgeClassName("default")}>Status: {summary.status}</span>
        <span className={badgeClassName("default")}>
          Capability: {summary.capability}
        </span>
        <span className={badgeClassName("default")}>Period: {summary.period}</span>
      </div>
    </DashboardCard>
  );
}
