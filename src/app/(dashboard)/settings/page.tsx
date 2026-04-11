import type { ReactNode } from "react";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

type WorkspaceInfo = {
  record_id?: string;
  workspace_id?: string;
  name?: string;
  slug?: string;
  type?: string;
  plan_id?: string;
  plan_label?: string;
  plan_code?: string;
  status?: string;
  is_active?: boolean;
  last_usage_reset_at?: string;
};

type UsageValues = {
  runs_month?: number;
  tokens_month?: number;
  http_calls_month?: number;
};

type LimitValues = {
  soft_runs_month?: number;
  hard_runs_month?: number;
  soft_tokens_month?: number;
  hard_tokens_month?: number;
  soft_http_calls_month?: number;
  hard_http_calls_month?: number;
};

type ProjectedValues = {
  runs_month?: number;
  tokens_month?: number;
  http_calls_month?: number;
  estimated_tokens_delta?: number;
};

type EstimationValues = {
  requested_tokens?: number;
  source?: string;
  text_chars?: number;
};

type MeterValues = {
  current?: number;
  projected?: number;
  soft_limit?: number | null;
  hard_limit?: number | null;
  remaining_to_soft?: number | null;
  remaining_to_hard?: number | null;
  soft_reached_on_projection?: boolean;
  hard_reached_on_projection?: boolean;
};

type WorkspaceUsageResponse = {
  ok: boolean;
  workspace?: WorkspaceInfo;
  usage?: UsageValues;
  limits?: LimitValues;
  projected?: ProjectedValues;
  estimation?: EstimationValues;
  meters?: Record<string, MeterValues>;
  warnings?: string[];
  blocked?: boolean;
  block_reason?: string;
  ts?: string;
  error?: string;
};

function formatNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function formatOptionalNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function statCardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
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

function statusBadgeVariant(
  isActive?: boolean,
  blocked?: boolean
): "success" | "warning" | "danger" | "default" {
  if (blocked) return "danger";
  if (isActive) return "success";
  return "warning";
}

function usageVariant(
  blocked: boolean | undefined,
  softReached: boolean | undefined,
  hardReached: boolean | undefined
): "success" | "warning" | "danger" | "default" {
  if (blocked || hardReached) return "danger";
  if (softReached) return "warning";
  return "success";
}

function progressPercent(current?: number, hardLimit?: number | null): number {
  if (
    typeof current !== "number" ||
    !Number.isFinite(current) ||
    typeof hardLimit !== "number" ||
    !Number.isFinite(hardLimit) ||
    hardLimit <= 0
  ) {
    return 0;
  }

  const percent = Math.round((current / hardLimit) * 100);
  return Math.max(0, Math.min(percent, 100));
}

function humanizePlanLabel(workspace?: WorkspaceInfo): string {
  const raw =
    workspace?.plan_label ||
    workspace?.plan_code ||
    workspace?.plan_id ||
    "";

  if (!raw) return "—";
  if (raw.startsWith("rec")) return "Plan linked";

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeQuotaSignal(code?: string): string {
  const value = String(code || "").trim();

  const map: Record<string, string> = {
    soft_limit_runs_month_exceeded: "Seuil mensuel runs dépassé",
    hard_limit_runs_month_reached: "Limite mensuelle runs atteinte",
    soft_limit_tokens_month_exceeded: "Seuil mensuel tokens dépassé",
    hard_limit_tokens_month_reached: "Limite mensuelle tokens atteinte",
    soft_limit_http_calls_month_exceeded: "Seuil mensuel appels HTTP dépassé",
    hard_limit_http_calls_month_reached: "Limite mensuelle appels HTTP atteinte",
    workspace_not_found: "Workspace introuvable",
    workspace_inactive: "Workspace inactif",
    workspace_limit_blocked: "Exécution bloquée par les quotas",
  };

  if (map[value]) return map[value];

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function fetchWorkspaceUsage(params?: {
  capability?: string;
  estimatedTokens?: number;
  projectRequestedRun?: boolean;
}): Promise<WorkspaceUsageResponse | null> {
  const baseUrl =
    process.env.BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  const workspaceId = process.env.BOSAI_WORKSPACE_ID || "";
  const workspaceApiKey = process.env.BOSAI_WORKSPACE_API_KEY || "";

  if (!baseUrl || !workspaceId || !workspaceApiKey) {
    return null;
  }

  const searchParams = new URLSearchParams({
    workspace_id: workspaceId,
  });

  if (params?.capability) {
    searchParams.set("capability", params.capability);
  }

  if (
    typeof params?.estimatedTokens === "number" &&
    Number.isFinite(params.estimatedTokens) &&
    params.estimatedTokens > 0
  ) {
    searchParams.set("estimated_tokens", String(params.estimatedTokens));
  }

  if (params?.projectRequestedRun) {
    searchParams.set("project_requested_run", "1");
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/workspace/usage?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-bosai-key": workspaceApiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await response.text(),
      };
    }

    return (await response.json()) as WorkspaceUsageResponse;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "workspace_usage_fetch_failed",
    };
  }
}

function StatCard({
  label,
  value,
  helper,
  badge,
}: {
  label: string;
  value: string;
  helper?: string;
  badge?: ReactNode;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-zinc-400">{label}</div>
        {badge}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {helper ? <div className="mt-3 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function MeterCard({
  label,
  meter,
  blocked,
}: {
  label: string;
  meter?: MeterValues;
  blocked?: boolean;
}) {
  const current = meter?.current ?? 0;
  const projected = meter?.projected ?? current;
  const hardLimit = meter?.hard_limit ?? null;
  const softLimit = meter?.soft_limit ?? null;
  const percent = progressPercent(current, hardLimit);
  const variant = usageVariant(
    blocked,
    meter?.soft_reached_on_projection,
    meter?.hard_reached_on_projection
  );

  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={metaLabelClassName()}>{label}</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-white">
            {formatNumber(current)}
          </div>
        </div>

        <span className={badgeClassName(variant)}>
          {blocked || meter?.hard_reached_on_projection
            ? "BLOCKED"
            : meter?.soft_reached_on_projection
              ? "WARNING"
              : "OK"}
        </span>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/70"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-400">
        <div>
          <div className={metaLabelClassName()}>Projeté</div>
          <div className="mt-1 text-zinc-200">{formatNumber(projected)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Hard limit</div>
          <div className="mt-1 text-zinc-200">{formatOptionalNumber(hardLimit)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Soft limit</div>
          <div className="mt-1 text-zinc-200">{formatOptionalNumber(softLimit)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Restant hard</div>
          <div className="mt-1 text-zinc-200">
            {formatOptionalNumber(meter?.remaining_to_hard ?? null)}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
