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

type PreviewBlockSummary = {
  primaryReason: string;
  extraReasons: string[];
};

type QuotaSignalContext = {
  runs?: number | null;
  hardRuns?: number | null;
  tokens?: number | null;
  hardTokens?: number | null;
  http?: number | null;
  hardHttp?: number | null;
  nextRun?: boolean;
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

function isOverLimit(
  value?: number | null,
  limit?: number | null
): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    typeof limit === "number" &&
    Number.isFinite(limit) &&
    limit > 0 &&
    value > limit
  );
}

function hardReasonLabel(
  resourceLabel: string,
  overLimit: boolean,
  nextRun?: boolean
): string {
  if (nextRun) {
    return overLimit
      ? `La prochaine exécution dépasserait la limite mensuelle ${resourceLabel}`
      : `La prochaine exécution atteindrait la limite mensuelle ${resourceLabel}`;
  }

  return overLimit
    ? `Limite mensuelle ${resourceLabel} dépassée`
    : `Limite mensuelle ${resourceLabel} atteinte`;
}

function humanizeQuotaSignal(
  code?: string,
  context?: QuotaSignalContext
): string {
  const value = String(code || "").trim();

  if (!value) return "—";

  const staticMap: Record<string, string> = {
    soft_limit_runs_month_exceeded: "Seuil mensuel runs dépassé",
    soft_limit_tokens_month_exceeded: "Seuil mensuel tokens dépassé",
    soft_limit_http_calls_month_exceeded: "Seuil mensuel appels HTTP dépassé",
    workspace_not_found: "Workspace introuvable",
    workspace_inactive: "Workspace inactif",
    workspace_limit_blocked: "Exécution bloquée par les quotas",
  };

  if (staticMap[value]) {
    return staticMap[value];
  }

  if (value === "hard_limit_runs_month_reached") {
    return hardReasonLabel(
      "runs",
      isOverLimit(context?.runs, context?.hardRuns),
      context?.nextRun
    );
  }

  if (value === "hard_limit_tokens_month_reached") {
    return hardReasonLabel(
      "tokens",
      isOverLimit(context?.tokens, context?.hardTokens),
      context?.nextRun
    );
  }

  if (value === "hard_limit_http_calls_month_reached") {
    return hardReasonLabel(
      "appels HTTP",
      isOverLimit(context?.http, context?.hardHttp),
      context?.nextRun
    );
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function collectPreviewHardBlockReasons(
  meters?: Record<string, MeterValues>
): string[] {
  const reasons: string[] = [];

  if (meters?.runs_month?.hard_reached_on_projection) {
    reasons.push("hard_limit_runs_month_reached");
  }

  if (meters?.tokens_month?.hard_reached_on_projection) {
    reasons.push("hard_limit_tokens_month_reached");
  }

  if (meters?.http_calls_month?.hard_reached_on_projection) {
    reasons.push("hard_limit_http_calls_month_reached");
  }

  return reasons;
}

function buildPreviewBlockSummary(
  previewUsage?: WorkspaceUsageResponse | null
): PreviewBlockSummary {
  const ordered: string[] = [];

  const pushUnique = (value?: string) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    if (!ordered.includes(normalized)) {
      ordered.push(normalized);
    }
  };

  pushUnique(previewUsage?.block_reason);

  for (const reason of collectPreviewHardBlockReasons(previewUsage?.meters)) {
    pushUnique(reason);
  }

  return {
    primaryReason: ordered[0] || "",
    extraReasons: ordered.slice(1),
  };
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
          <div className="mt-1 text-zinc-200">
            {formatOptionalNumber(hardLimit)}
          </div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Soft limit</div>
          <div className="mt-1 text-zinc-200">
            {formatOptionalNumber(softLimit)}
          </div>
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

function SignalList({
  warnings,
  blocked,
  blockReason,
  blockReasonLabel,
}: {
  warnings: string[];
  blocked?: boolean;
  blockReason?: string;
  blockReasonLabel?: string;
}) {
  return (
    <DashboardCard
      title="Quota signals"
      subtitle="Warnings soft et blocages hard traduits en langage produit."
    >
      <div className="space-y-3">
        {blocked ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="font-medium">{blockReasonLabel || "Blocage quota"}</div>
            {blockReason ? (
              <div className="mt-1 text-xs text-red-300/80">{blockReason}</div>
            ) : null}
          </div>
        ) : null}

        {warnings.length > 0 ? (
          warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              <div className="font-medium">{humanizeQuotaSignal(warning)}</div>
              <div className="mt-1 text-xs text-amber-300/80">{warning}</div>
            </div>
          ))
        ) : !blocked ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Aucun warning actif.
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export default async function SettingsPage() {
  const currentUsage = await fetchWorkspaceUsage();
  const previewUsage = await fetchWorkspaceUsage({
    capability: "http_exec",
    estimatedTokens: 700,
    projectRequestedRun: true,
  });

  const workspace = currentUsage?.workspace;
  const usage = currentUsage?.usage;
  const limits = currentUsage?.limits;
  const projected = currentUsage?.projected;
  const estimation = currentUsage?.estimation;
  const meters = currentUsage?.meters;
  const warnings = currentUsage?.warnings ?? [];
  const blocked = currentUsage?.blocked ?? false;
  const blockReason = currentUsage?.block_reason ?? "";

  const currentBlockReasonLabel = humanizeQuotaSignal(blockReason, {
    runs: usage?.runs_month ?? null,
    hardRuns: limits?.hard_runs_month ?? null,
    tokens: usage?.tokens_month ?? null,
    hardTokens: limits?.hard_tokens_month ?? null,
    http: usage?.http_calls_month ?? null,
    hardHttp: limits?.hard_http_calls_month ?? null,
    nextRun: false,
  });

  const previewWarnings = previewUsage?.warnings ?? [];
  const previewBlocked = previewUsage?.blocked ?? false;
  const previewSummary = buildPreviewBlockSummary(previewUsage);
  const previewPrimaryReason = previewSummary.primaryReason;
  const previewExtraReasons = previewSummary.extraReasons;

  const previewReasonContext: QuotaSignalContext = {
    runs: previewUsage?.projected?.runs_month ?? null,
    hardRuns: previewUsage?.limits?.hard_runs_month ?? null,
    tokens: previewUsage?.projected?.tokens_month ?? null,
    hardTokens: previewUsage?.limits?.hard_tokens_month ?? null,
    http: previewUsage?.projected?.http_calls_month ?? null,
    hardHttp: previewUsage?.limits?.hard_http_calls_month ?? null,
    nextRun: true,
  };

  const previewPrimaryReasonLabel = humanizeQuotaSignal(
    previewPrimaryReason,
    previewReasonContext
  );

  const envReady =
    Boolean(
      process.env.BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_BOSAI_WORKER_URL
    ) &&
    Boolean(process.env.BOSAI_WORKSPACE_ID) &&
    Boolean(process.env.BOSAI_WORKSPACE_API_KEY);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Workspace BOSAI, usage mensuel, limites de plan, warnings quota et preview d’exécution."
      />

      {!envReady ? (
        <DashboardCard
          title="Dashboard workspace non raccordé"
          subtitle="Cette page est prête, mais les variables serveur ne sont pas encore configurées."
        >
          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              <span className="text-zinc-200">BOSAI_WORKER_URL</span>
            </div>
            <div>
              <span className="text-zinc-200">BOSAI_WORKSPACE_ID</span>
            </div>
            <div>
              <span className="text-zinc-200">BOSAI_WORKSPACE_API_KEY</span>
            </div>
          </div>
        </DashboardCard>
      ) : null}

      {envReady ? (
        <>
          <section className="space-y-4 border-b border-white/10 pb-6">
            <div className={sectionLabelClassName()}>Workspace identity</div>

            <div className="space-y-4 xl:flex xl:items-end xl:justify-between xl:gap-8 xl:space-y-0">
              <div className="max-w-4xl">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {workspace?.name || workspace?.workspace_id || "Workspace"}
                </h2>
                <p className="mt-2 max-w-3xl text-base text-zinc-400">
                  Vue quota prête pour le cockpit SaaS : usage courant, limites,
                  projection avant run et état de blocage.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={badgeClassName(
                    statusBadgeVariant(workspace?.is_active, blocked)
                  )}
                >
                  {blocked
                    ? "BLOCKED"
                    : workspace?.is_active
                      ? "ACTIVE"
                      : "INACTIVE"}
                </span>

                {workspace?.type ? (
                  <span className={badgeClassName("info")}>
                    {workspace.type.toUpperCase()}
                  </span>
                ) : null}

                {workspace?.plan_label ||
                workspace?.plan_code ||
                workspace?.plan_id ? (
                  <span className={badgeClassName("violet")}>
                    {humanizePlanLabel(workspace)}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Runs / mois"
              value={formatNumber(usage?.runs_month)}
              helper={`Hard: ${formatOptionalNumber(
                limits?.hard_runs_month ?? null
              )}`}
            />
            <StatCard
              label="Tokens / mois"
              value={formatNumber(usage?.tokens_month)}
              helper={`Hard: ${formatOptionalNumber(
                limits?.hard_tokens_month ?? null
              )}`}
            />
            <StatCard
              label="Appels HTTP / mois"
              value={formatNumber(usage?.http_calls_month)}
              helper={`Hard: ${formatOptionalNumber(
                limits?.hard_http_calls_month ?? null
              )}`}
            />
            <StatCard
              label="Dernière remise à zéro"
              value={formatDate(workspace?.last_usage_reset_at)}
              helper={workspace?.workspace_id || "—"}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <MeterCard
              label="Jauge runs"
              meter={meters?.runs_month}
              blocked={blocked}
            />
            <MeterCard
              label="Jauge tokens"
              meter={meters?.tokens_month}
              blocked={blocked}
            />
            <MeterCard
              label="Jauge HTTP"
              meter={meters?.http_calls_month}
              blocked={blocked}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SignalList
              warnings={warnings}
              blocked={blocked}
              blockReason={blockReason}
              blockReasonLabel={currentBlockReasonLabel}
            />

            <DashboardCard
              title="Projection actuelle"
              subtitle="Projection renvoyée par le worker pour l’état courant."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Projected runs</span>
                  <span className="text-zinc-200">
                    {formatNumber(projected?.runs_month)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Projected tokens</span>
                  <span className="text-zinc-200">
                    {formatNumber(projected?.tokens_month)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Projected HTTP</span>
                  <span className="text-zinc-200">
                    {formatNumber(projected?.http_calls_month)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Estimated token delta</span>
                  <span className="text-zinc-200">
                    {formatNumber(projected?.estimated_tokens_delta)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Estimation source</span>
                  <span className="text-zinc-200">
                    {estimation?.source || "—"}
                  </span>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Workspace metadata"
              subtitle="Informations produit du workspace SaaS."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Workspace ID</span>
                  <span className="break-all text-right text-zinc-200">
                    {workspace?.workspace_id || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Slug</span>
                  <span className="text-zinc-200">{workspace?.slug || "—"}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Type</span>
                  <span className="text-zinc-200">{workspace?.type || "—"}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Plan</span>
                  <span className="text-zinc-200">
                    {humanizePlanLabel(workspace)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Plan code</span>
                  <span className="text-zinc-200">
                    {workspace?.plan_code || workspace?.plan_label || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Plan ref</span>
                  <span className="break-all text-right text-zinc-200">
                    {workspace?.plan_id || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Status</span>
                  <span className="text-zinc-200">
                    {workspace?.status || "—"}
                  </span>
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardCard
              title="Plan limits"
              subtitle="Soft / hard limits configurés sur le workspace."
            >
              <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className={metaLabelClassName()}>Runs soft</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.soft_runs_month ?? null)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className={metaLabelClassName()}>Runs hard</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.hard_runs_month ?? null)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className={metaLabelClassName()}>Tokens soft</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.soft_tokens_month ?? null)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className={metaLabelClassName()}>Tokens hard</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.hard_tokens_month ?? null)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className={metaLabelClassName()}>HTTP soft</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.soft_http_calls_month ?? null)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className={metaLabelClassName()}>HTTP hard</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.hard_http_calls_month ?? null)}
                  </div>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Preview next run"
              subtitle="Simulation avant exécution via /workspace/usage avec capability=http_exec et estimated_tokens=700."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Projected runs</span>
                  <span className="text-zinc-200">
                    {formatNumber(previewUsage?.projected?.runs_month)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Projected tokens</span>
                  <span className="text-zinc-200">
                    {formatNumber(previewUsage?.projected?.tokens_month)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Projected HTTP</span>
                  <span className="text-zinc-200">
                    {formatNumber(previewUsage?.projected?.http_calls_month)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Blocage prévu</span>
                  <span
                    className={
                      previewBlocked
                        ? "font-medium text-red-300"
                        : "font-medium text-emerald-300"
                    }
                  >
                    {previewBlocked ? "OUI" : "NON"}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <div className={metaLabelClassName()}>Blocage principal prévu</div>
                  <div className="mt-2 text-sm text-white">
                    {previewBlocked
                      ? previewPrimaryReasonLabel
                      : "Aucun blocage prévisionnel"}
                  </div>
                  {previewPrimaryReason ? (
                    <div className="mt-1 text-xs text-zinc-500">
                      {previewPrimaryReason}
                    </div>
                  ) : null}
                </div>

                {previewExtraReasons.length > 0 ? (
                  <div className="space-y-2">
                    <div className={metaLabelClassName()}>
                      Autres blocages prévus
                    </div>
                    {previewExtraReasons.map((reason) => (
                      <div
                        key={reason}
                        className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-200"
                      >
                        <div className="font-medium">
                          {humanizeQuotaSignal(reason, previewReasonContext)}
                        </div>
                        <div className="mt-1 text-xs text-red-300/80">
                          {reason}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="pt-2">
                  {previewWarnings.length > 0 ? (
                    <div className="space-y-2">
                      {previewWarnings.map((warning) => (
                        <div
                          key={warning}
                          className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-200"
                        >
                          <div className="font-medium">
                            {humanizeQuotaSignal(warning)}
                          </div>
                          <div className="mt-1 text-xs text-amber-300/80">
                            {warning}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-zinc-300">
                      Aucun warning preview.
                    </div>
                  )}
                </div>
              </div>
            </DashboardCard>
          </section>

          {!currentUsage?.ok ? (
            <DashboardCard
              title="Worker response"
              subtitle="Le worker a répondu avec une erreur ou un payload partiel."
            >
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {currentUsage?.error || "workspace_usage_failed"}
              </div>
            </DashboardCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
