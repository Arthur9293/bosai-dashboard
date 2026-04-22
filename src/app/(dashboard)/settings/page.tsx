import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function getWorkerBaseUrl(): string {
  return (
    process.env.BOSAI_WORKER_BASE_URL ||
    process.env.BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  ).replace(/\/+$/, "");
}

function getWorkspaceId(): string {
  return (
    process.env.BOSAI_WORKSPACE_ID ||
    process.env.NEXT_PUBLIC_BOSAI_WORKSPACE_ID ||
    ""
  ).trim();
}

function getWorkspaceApiKey(): string {
  return (
    process.env.BOSAI_WORKSPACE_API_KEY ||
    process.env.WORKSPACE_API_KEY ||
    ""
  ).trim();
}

function shellCardClassName(): string {
  return [
    "rounded-[28px] border border-white/10 p-6 md:p-7",
    "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.10),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaBoxClassName(): string {
  return "rounded-[18px] border border-white/10 bg-black/20 px-4 py-4";
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

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/12 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/18";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
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

function formatNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-FR").format(value)
    : "0";
}

function formatOptionalNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-FR").format(value)
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
  const baseUrl = getWorkerBaseUrl();
  const workspaceId = getWorkspaceId();
  const workspaceApiKey = getWorkspaceApiKey();

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

  const url = `${baseUrl}/workspace/usage?${searchParams.toString()}`;

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

function getCurrentQuickRead(params: {
  blocked: boolean;
  warningsCount: number;
  usage?: UsageValues;
  limits?: LimitValues;
  ok?: boolean;
}): string {
  const { blocked, warningsCount, usage, limits, ok } = params;

  if (!ok) {
    return "Le worker a répondu avec un payload partiel ou une erreur sur la lecture workspace.";
  }

  if (blocked) {
    return "Le workspace est actuellement bloqué par les quotas. Il faut vérifier la ressource dominante et l’état de reset avant toute exécution.";
  }

  if (warningsCount > 0) {
    return "Le workspace reste actif, mais certains seuils soft demandent une surveillance avant blocage.";
  }

  const runs = usage?.runs_month ?? 0;
  const hardRuns = limits?.hard_runs_month ?? 0;

  if (hardRuns > 0 && runs > 0) {
    return "Le workspace semble stable avec une consommation lisible par rapport à son plan courant.";
  }

  return "Le workspace visible ne montre pas de signal quota dominant pour le moment.";
}

function getPreviewQuickRead(params: {
  previewBlocked: boolean;
  previewWarningsCount: number;
  previewOk?: boolean;
}): string {
  const { previewBlocked, previewWarningsCount, previewOk } = params;

  if (!previewOk) {
    return "La simulation preview n’a pas retourné un payload complet.";
  }

  if (previewBlocked) {
    return "La prochaine exécution projetée déclencherait un blocage quota.";
  }

  if (previewWarningsCount > 0) {
    return "La prochaine exécution resterait autorisée, mais générerait des warnings de quota.";
  }

  return "La prochaine exécution projetée reste dans les limites visibles du plan.";
}

function StatCard({
  label,
  value,
  helper,
  badge,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  helper?: string;
  badge?: ReactNode;
  toneClass?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-zinc-400">{label}</div>
        {badge}
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function SectionBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <DashboardCard title={title} subtitle={subtitle}>
      {children}
    </DashboardCard>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="break-all text-right text-sm font-medium text-zinc-200">
        {value}
      </span>
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

  const fillClass =
    variant === "danger"
      ? "bg-red-400"
      : variant === "warning"
        ? "bg-amber-400"
        : "bg-sky-400";

  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={metaLabelClassName()}>{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
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
            className={`h-full rounded-full ${fillClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-400">
        <div className={metaBoxClassName()}>
          <div className={metaLabelClassName()}>Projeté</div>
          <div className="mt-1 text-zinc-200">{formatNumber(projected)}</div>
        </div>

        <div className={metaBoxClassName()}>
          <div className={metaLabelClassName()}>Hard limit</div>
          <div className="mt-1 text-zinc-200">
            {formatOptionalNumber(hardLimit)}
          </div>
        </div>

        <div className={metaBoxClassName()}>
          <div className={metaLabelClassName()}>Soft limit</div>
          <div className="mt-1 text-zinc-200">
            {formatOptionalNumber(softLimit)}
          </div>
        </div>

        <div className={metaBoxClassName()}>
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
  const envReady =
    Boolean(getWorkerBaseUrl()) &&
    Boolean(getWorkspaceId()) &&
    Boolean(getWorkspaceApiKey());

  let currentUsage: WorkspaceUsageResponse | null = null;
  let previewUsage: WorkspaceUsageResponse | null = null;

  if (envReady) {
    [currentUsage, previewUsage] = await Promise.all([
      fetchWorkspaceUsage(),
      fetchWorkspaceUsage({
        capability: "http_exec",
        estimatedTokens: 700,
        projectRequestedRun: true,
      }),
    ]);
  }

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

  const currentQuickRead = getCurrentQuickRead({
    blocked,
    warningsCount: warnings.length,
    usage,
    limits,
    ok: currentUsage?.ok,
  });

  const previewQuickRead = getPreviewQuickRead({
    previewBlocked,
    previewWarningsCount: previewWarnings.length,
    previewOk: previewUsage?.ok,
  });

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
              <span className="text-zinc-200">BOSAI_WORKER_BASE_URL / BOSAI_WORKER_URL</span>
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
          <section className={shellCardClassName()}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-5">
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

                  {(workspace?.plan_label ||
                    workspace?.plan_code ||
                    workspace?.plan_id) && (
                    <span className={badgeClassName("violet")}>
                      {humanizePlanLabel(workspace)}
                    </span>
                  )}

                  <span className={badgeClassName("default")}>
                    Workspace Settings
                  </span>
                </div>

                <div className="space-y-3">
                  <div className={sectionLabelClassName()}>
                    BOSAI Settings Layer
                  </div>

                  <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {workspace?.name || workspace?.workspace_id || "Workspace"}
                  </h2>

                  <p className="max-w-3xl text-base leading-8 text-zinc-400">
                    Surface de pilotage quota et posture d’exécution. Ici,
                    l’utilisateur doit comprendre en un regard l’état du tenant,
                    la pression sur les limites, et le risque avant le prochain run.
                  </p>
                </div>
              </div>

              <div className="w-full max-w-md">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5 md:p-6">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Quick read
                  </div>

                  <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Workspace posture
                  </div>

                  <div className="mt-3 text-sm leading-6 text-white/70">
                    {currentQuickRead}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/workspaces" className={actionLinkClassName("soft")}>
                      Ouvrir Workspaces
                    </Link>
                    <Link href="/runs" className={actionLinkClassName("default")}>
                      Voir Runs
                    </Link>
                    <Link href="/sla" className={actionLinkClassName("danger")}>
                      Voir SLA
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Runs / mois"
              value={formatNumber(usage?.runs_month)}
              helper={`Hard: ${formatOptionalNumber(
                limits?.hard_runs_month ?? null
              )}`}
              toneClass="text-white"
            />
            <StatCard
              label="Tokens / mois"
              value={formatNumber(usage?.tokens_month)}
              helper={`Hard: ${formatOptionalNumber(
                limits?.hard_tokens_month ?? null
              )}`}
              toneClass="text-white"
            />
            <StatCard
              label="Appels HTTP / mois"
              value={formatNumber(usage?.http_calls_month)}
              helper={`Hard: ${formatOptionalNumber(
                limits?.hard_http_calls_month ?? null
              )}`}
              toneClass="text-sky-300"
            />
            <StatCard
              label="Dernière remise à zéro"
              value={formatDate(workspace?.last_usage_reset_at)}
              helper={workspace?.workspace_id || "—"}
              toneClass="text-white"
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

            <SectionBlock
              title="Projection actuelle"
              subtitle="Projection renvoyée par le worker pour l’état courant."
            >
              <div className="space-y-3">
                <InfoRow
                  label="Projected runs"
                  value={formatNumber(projected?.runs_month)}
                />
                <InfoRow
                  label="Projected tokens"
                  value={formatNumber(projected?.tokens_month)}
                />
                <InfoRow
                  label="Projected HTTP"
                  value={formatNumber(projected?.http_calls_month)}
                />
                <InfoRow
                  label="Estimated token delta"
                  value={formatNumber(projected?.estimated_tokens_delta)}
                />
                <InfoRow
                  label="Estimation source"
                  value={estimation?.source || "—"}
                />
              </div>
            </SectionBlock>

            <SectionBlock
              title="Current posture"
              subtitle="Résumé opérable du tenant actuel."
            >
              <div className="space-y-3">
                <InfoRow
                  label="Warnings"
                  value={formatNumber(warnings.length)}
                />
                <InfoRow
                  label="Blocked"
                  value={blocked ? "OUI" : "NON"}
                />
                <InfoRow
                  label="Plan"
                  value={humanizePlanLabel(workspace)}
                />
                <InfoRow
                  label="Workspace"
                  value={workspace?.workspace_id || "—"}
                />
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className={metaLabelClassName()}>Quick read</div>
                <div className="mt-2 text-sm leading-6 text-zinc-300">
                  {currentQuickRead}
                </div>
              </div>
            </SectionBlock>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionBlock
              title="Plan limits"
              subtitle="Soft / hard limits configurés sur le workspace."
            >
              <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2">
                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Runs soft</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.soft_runs_month ?? null)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Runs hard</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.hard_runs_month ?? null)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Tokens soft</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.soft_tokens_month ?? null)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Tokens hard</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.hard_tokens_month ?? null)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>HTTP soft</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.soft_http_calls_month ?? null)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>HTTP hard</div>
                  <div className="mt-1 text-zinc-200">
                    {formatOptionalNumber(limits?.hard_http_calls_month ?? null)}
                  </div>
                </div>
              </div>
            </SectionBlock>

            <SectionBlock
              title="Preview next run"
              subtitle="Simulation avant exécution via /workspace/usage avec capability=http_exec et estimated_tokens=700."
            >
              <div className="flex flex-wrap gap-2">
                <span className={badgeClassName(previewBlocked ? "danger" : "success")}>
                  {previewBlocked ? "BLOCKAGE PRÉVU" : "PREVIEW OK"}
                </span>

                {previewWarnings.length > 0 ? (
                  <span className={badgeClassName("warning")}>
                    {previewWarnings.length} warning(s)
                  </span>
                ) : (
                  <span className={badgeClassName("info")}>Blue preview</span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Projected runs</div>
                  <div className="mt-1 text-zinc-200">
                    {formatNumber(previewUsage?.projected?.runs_month)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Projected tokens</div>
                  <div className="mt-1 text-zinc-200">
                    {formatNumber(previewUsage?.projected?.tokens_month)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Projected HTTP</div>
                  <div className="mt-1 text-zinc-200">
                    {formatNumber(previewUsage?.projected?.http_calls_month)}
                  </div>
                </div>

                <div className={metaBoxClassName()}>
                  <div className={metaLabelClassName()}>Blocage prévu</div>
                  <div
                    className={`mt-1 ${
                      previewBlocked ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {previewBlocked ? "OUI" : "NON"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
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
                <div className="mt-4 space-y-2">
                  <div className={metaLabelClassName()}>Autres blocages prévus</div>
                  {previewExtraReasons.map((reason) => (
                    <div
                      key={reason}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-200"
                    >
                      <div className="font-medium">
                        {humanizeQuotaSignal(reason, previewReasonContext)}
                      </div>
                      <div className="mt-1 text-xs text-red-300/80">{reason}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className={metaLabelClassName()}>Preview read</div>
                <div className="mt-2 text-sm leading-6 text-zinc-300">
                  {previewQuickRead}
                </div>
              </div>

              <div className="mt-4">
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
            </SectionBlock>
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
