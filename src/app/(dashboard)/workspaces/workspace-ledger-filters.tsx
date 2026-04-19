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

const QUICK_STATUS_OPTIONS = [
  "success",
  "error",
  "blocked",
  "unsupported",
] as const;

const QUICK_CAPABILITY_OPTIONS = ["health_tick", "http_exec"] as const;

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

function quickChipClass(
  active: boolean,
  tone: "default" | "danger" | "warning" | "info" = "default"
): string {
  if (active) {
    if (tone === "danger") {
      return "inline-flex rounded-full border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium text-red-300 sm:text-xs";
    }

    if (tone === "warning") {
      return "inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] font-medium text-amber-300 sm:text-xs";
    }

    if (tone === "info") {
      return "inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-[11px] font-medium text-sky-300 sm:text-xs";
    }

    return "inline-flex rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-[11px] font-medium text-sky-300 sm:text-xs";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 sm:text-xs";
}

function fieldClassName(): string {
  return "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500";
}

function sectionLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function primaryButtonClassName(): string {
  return "inline-flex items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-5 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20";
}

function secondaryButtonClassName(): string {
  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white";
}

function getCurrentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function applyPreset(
  preset: {
    status?: string;
    capability?: string;
    periodKey?: string;
    limit?: string;
  },
  setters: {
    setStatus: (value: string) => void;
    setCapability: (value: string) => void;
    setPeriodKey: (value: string) => void;
    setLimit: (value: string) => void;
  }
) {
  setters.setStatus(preset.status ?? "");
  setters.setCapability(preset.capability ?? "");
  setters.setPeriodKey(preset.periodKey ?? "");
  setters.setLimit(preset.limit ?? "20");
}

function statusBadgeVariant(
  value: string
): "default" | "success" | "warning" | "danger" | "info" | "violet" {
  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "tous") return "default";
  if (normalized === "success") return "success";
  if (normalized === "error") return "danger";
  if (normalized === "blocked") return "warning";
  if (normalized === "unsupported") return "violet";

  return "info";
}

function buildQuickRead(summary: {
  status: string;
  capability: string;
  period: string;
  limit: string;
}) {
  const parts: string[] = [];

  if (summary.status !== "Tous") {
    parts.push(`statut ${summary.status}`);
  }

  if (summary.capability !== "Toutes") {
    parts.push(`capability ${summary.capability}`);
  }

  if (summary.period !== "Toutes") {
    parts.push(`période ${summary.period}`);
  }

  if (parts.length === 0) {
    return "Lecture large du ledger du workspace, sans filtre de statut, capability ou période.";
  }

  return `Lecture filtrée du ledger sur ${parts.join(" · ")} avec une limite de ${summary.limit} entrée(s).`;
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
      capability: capability.trim() ? capability.trim() : "Toutes",
      period: periodKey.trim() ? periodKey.trim() : "Toutes",
      limit: limit.trim() || "20",
    }),
    [status, capability, periodKey, limit]
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean(status.trim() || capability.trim() || periodKey.trim());
  }, [status, capability, periodKey]);

  const quickRead = useMemo(() => buildQuickRead(summary), [summary]);

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
      subtitle="Filtres simples du ledger pour ce workspace, avec presets rapides et lecture claire de la vue active."
    >
      <div className="space-y-6">
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 md:p-5">
          <div className={sectionLabelClassName()}>Ledger posture</div>

          <div className="mt-3 text-xl font-semibold tracking-tight text-white">
            Lecture active
          </div>

          <p className="mt-2 text-sm leading-6 text-zinc-400">{quickRead}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Status
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-200">
                {summary.status}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Capability
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-200">
                {summary.capability}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Period
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-200">
                {summary.period}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Limit
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-200">
                {summary.limit}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            {hasActiveFilters
              ? "Le ledger est actuellement filtré."
              : "Aucun filtre actif. La vue reste large et neutre."}
          </div>
        </div>

        <div>
          <div className={`${sectionLabelClassName()} mb-2`}>Presets</div>

          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              type="button"
              onClick={() =>
                applyPreset(
                  {
                    status: "success",
                    capability: "health_tick",
                    periodKey: currentPeriodKey,
                    limit: "20",
                  },
                  { setStatus, setCapability, setPeriodKey, setLimit }
                )
              }
              className={`${quickChipClass(
                status === "success" &&
                  capability === "health_tick" &&
                  periodKey === currentPeriodKey &&
                  limit === "20",
                "success"
              )} max-w-full whitespace-normal text-left leading-snug`}
            >
              success + health_tick + période courante
            </button>

            <button
              type="button"
              onClick={() =>
                applyPreset(
                  {
                    status: "",
                    capability: "health_tick",
                    periodKey: currentPeriodKey,
                    limit: "20",
                  },
                  { setStatus, setCapability, setPeriodKey, setLimit }
                )
              }
              className={`${quickChipClass(
                status === "" &&
                  capability === "health_tick" &&
                  periodKey === currentPeriodKey &&
                  limit === "20",
                "info"
              )} max-w-full whitespace-normal text-left leading-snug`}
            >
              tous + health_tick + période courante
            </button>

            <button
              type="button"
              onClick={() =>
                applyPreset(
                  {
                    status: "error",
                    capability: "",
                    periodKey: currentPeriodKey,
                    limit: "20",
                  },
                  { setStatus, setCapability, setPeriodKey, setLimit }
                )
              }
              className={`${quickChipClass(
                status === "error" &&
                  capability === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20",
                "danger"
              )} max-w-full whitespace-normal text-left leading-snug`}
            >
              error + période courante
            </button>

            <button
              type="button"
              onClick={() =>
                applyPreset(
                  {
                    status: "blocked",
                    capability: "",
                    periodKey: currentPeriodKey,
                    limit: "20",
                  },
                  { setStatus, setCapability, setPeriodKey, setLimit }
                )
              }
              className={`${quickChipClass(
                status === "blocked" &&
                  capability === "" &&
                  periodKey === currentPeriodKey &&
                  limit === "20",
                "warning"
              )} max-w-full whitespace-normal text-left leading-snug`}
            >
              blocked + période courante
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <div className={sectionLabelClassName()}>Status</div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClassName()}
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
                  className={quickChipClass(
                    status === item,
                    item === "error"
                      ? "danger"
                      : item === "blocked"
                        ? "warning"
                        : item === "unsupported"
                          ? "violet"
                          : "success"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>

          <label className="space-y-2">
            <div className={sectionLabelClassName()}>Capability</div>

            <input
              type="text"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="health_tick"
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
                  className={quickChipClass(capability === item, "info")}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>

          <label className="space-y-2">
            <div className={sectionLabelClassName()}>Period key</div>

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
                  className={quickChipClass(periodKey === item, "info")}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>

          <label className="space-y-2">
            <div className={sectionLabelClassName()}>Limit</div>

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

            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-400">
              Taille maximale de la vue ledger.
            </div>
          </label>

          <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
            <button
              type="button"
              onClick={applyFilters}
              className={primaryButtonClassName()}
            >
              Appliquer les filtres
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className={secondaryButtonClassName()}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          <span className={badgeClassName("default")}>Limit: {summary.limit}</span>
          <span className={badgeClassName(statusBadgeVariant(summary.status))}>
            Status: {summary.status}
          </span>
          <span className={badgeClassName("info")}>
            Capability: {summary.capability}
          </span>
          <span className={badgeClassName("violet")}>
            Period: {summary.period}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}
