import Link from "next/link";
import { PageHeader } from "../../../../components/ui/page-header";
import { DashboardCard } from "../../../../components/ui/dashboard-card";
import { WorkspaceLedgerFilters } from "../workspace-ledger-filters";

type WorkspaceInfo = {
  record_id?: string;
  workspace_id?: string;
  name?: string;
  slug?: string;
  type?: string;
  plan_id?: string;
  plan_code?: string;
  plan_label?: string;
  status?: string;
  is_active?: boolean;
  last_usage_reset_at?: string;
  current_usage_period_key?: string;
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

type UsagePeriodReset = {
  ok?: boolean;
  exists?: boolean;
  workspace_id?: string;
  reset_applied?: boolean;
  current_period?: string;
  effective_period?: string;
  effective_period_before_reset?: string;
  fallback?: boolean;
  reason?: string;
};

type CapabilitiesInfo = {
  resolved_plan_key?: string;
  allowed_capabilities?: string[];
};

type WorkspaceDetailResponse = {
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
  usage_period_reset?: UsagePeriodReset;
  capabilities?: CapabilitiesInfo;
  ts?: string;
  error?: string;
};

type UsageLedgerItem = {
  record_id: string;
  usage_id?: string;
  name?: string;
  workspace_id?: string;
  run_record_id?: string;
  run_id?: string;
  capability?: string;
  usage_type?: string;
  status?: string;
  worker?: string;
  idempotency_key?: string;
  quantity?: number;
  unit?: string;
  billable?: boolean;
  period_key?: string;
  runs_delta?: number;
  tokens_delta?: number;
  http_calls_delta?: number;
  created_at?: string;
  metadata_json?: string;
};

type UsageLedgerResponse = {
  ok: boolean;
  workspace_id?: string;
  count?: number;
  filters?: {
    limit?: number;
    status?: string;
    capability?: string;
    period_key?: string;
  };
  items?: UsageLedgerItem[];
  ts?: string;
  error?: string;
};

type LedgerFilters = {
  status: string;
  capability: string;
  period_key: string;
  limit: number;
};

function formatNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function formatOptional(value?: string | null): string {
  return value && value.trim() ? value : "—";
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

function humanizePlan(workspace?: WorkspaceInfo): string {
  const raw =
    workspace?.plan_code ||
    workspace?.plan_label ||
    workspace?.plan_id ||
    "";

  if (!raw) return "—";
  if (raw.startsWith("rec")) return "Plan linked";

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeSignal(code?: string): string {
  const value = String(code || "").trim();
  if (!value) return "—";

  const map: Record<string, string> = {
    soft_limit_runs_month_exceeded: "Seuil mensuel runs dépassé",
    hard_limit_runs_month_reached: "Limite mensuelle runs atteinte",
    soft_limit_tokens_month_exceeded: "Seuil mensuel tokens dépassé",
    hard_limit_tokens_month_reached: "Limite mensuelle tokens atteinte",
    soft_limit_http_calls_month_exceeded: "Seuil mensuel appels HTTP dépassé",
    hard_limit_http_calls_month_reached: "Limite mensuelle appels HTTP atteinte",
    workspace_not_found: "Workspace introuvable",
    workspace_inactive: "Workspace inactif",
    capability_not_allowed_for_plan: "Capability non autorisée pour ce plan",
    snapshot_lookup_failed_but_record_listed: "Snapshot détaillé indisponible",
    success: "Succès",
    error: "Erreur",
    blocked: "Bloqué",
    unsupported: "Non supporté",
    run: "Run",
  };

  if (map[value]) return map[value];

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

function statusVariant(
  isActive?: boolean,
  blocked?: boolean
): "success" | "warning" | "danger" | "default" {
  if (blocked) return "danger";
  if (isActive) return "success";
  return "warning";
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

function meterVariant(
  blocked: boolean | undefined,
  softReached: boolean | undefined,
  hardReached: boolean | undefined
): "success" | "warning" | "danger" | "default" {
  if (blocked || hardReached) return "danger";
  if (softReached) return "warning";
  return "success";
}

function ledgerStatusVariant(
  status?: string
): "success" | "warning" | "danger" | "default" {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "success") return "success";
  if (normalized === "blocked" || normalized === "unsupported") return "warning";
  if (normalized === "error") return "danger";
  return "default";
}

function parseLedgerFilters(
  searchParams?: Record<string, string | string[] | undefined>
): LedgerFilters {
  const getSingle = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] || "" : value || "";

  const rawStatus = getSingle(searchParams?.status).trim();
  const rawCapability = getSingle(searchParams?.capability).trim();
  const rawPeriodKey = getSingle(searchParams?.period_key).trim();
  const rawLimit = Number.parseInt(getSingle(searchParams?.limit), 10);

  const safeLimit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 100))
    : 20;

  return {
    status: rawStatus,
    capability: rawCapability,
    period_key: rawPeriodKey,
    limit: safeLimit,
  };
}

function buildLedgerQuery(filters: LedgerFilters): string {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.capability) params.set("capability", filters.capability);
  if (filters.period_key) params.set("period_key", filters.period_key);
  if (filters.limit) params.set("limit", String(filters.limit));

  return params.toString();
}

async function fetchWorkspaceDetail(
  workspaceId: string
): Promise<WorkspaceDetailResponse | null> {
  const baseUrl =
    process.env.BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  const workspaceApiKey = process.env.BOSAI_WORKSPACE_API_KEY || "";

  if (!baseUrl || !workspaceApiKey) {
    return null;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/workspaces/${encodeURIComponent(
    workspaceId
  )}`;

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

    return (await response.json()) as WorkspaceDetailResponse;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "workspace_detail_fetch_failed",
    };
  }
}

async function fetchWorkspaceUsageLedger(
  workspaceId: string,
  filters: LedgerFilters
): Promise<UsageLedgerResponse | null> {
  const baseUrl =
    process.env.BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  const workspaceApiKey = process.env.BOSAI_WORKSPACE_API_KEY || "";

  if (!baseUrl || !workspaceApiKey) {
    return null;
  }

  const query = buildLedgerQuery(filters);
  const urlBase = `${baseUrl.replace(/\/+$/, "")}/workspaces/${encodeURIComponent(
    workspaceId
  )}/usage-ledger`;
  const url = query ? `${urlBase}?${query}` : urlBase;

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

    return (await response.json()) as UsageLedgerResponse;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "workspace_usage_ledger_fetch_failed",
    };
  }
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
  const variant = meterVariant(
    blocked,
    meter?.soft_reached_on_projection,
    meter?.hard_reached_on_projection
  );

  return (
    <DashboardCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
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
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Projeté
          </div>
          <div className="mt-1 text-zinc-200">{formatNumber(projected)}</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Hard limit
          </div>
          <div className="mt-1 text-zinc-200">{formatNumber(hardLimit)}</div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Soft limit
          </div>
          <div className="mt-1 text-zinc-200">
            {typeof softLimit === "number" ? softLimit : "—"}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Restant hard
          </div>
          <div className="mt-1 text-zinc-200">
            {typeof meter?.remaining_to_hard === "number"
              ? meter.remaining_to_hard
              : "—"}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const ledgerFilters = parseLedgerFilters(resolvedSearchParams);

  const [data, ledger] = await Promise.all([
    fetchWorkspaceDetail(workspaceId),
    fetchWorkspaceUsageLedger(workspaceId, ledgerFilters),
  ]);

  const workspace = data?.workspace;
  const usage = data?.usage ?? {};
  const limits = data?.limits ?? {};
  const projected = data?.projected ?? {};
  const estimation = data?.estimation ?? {};
  const warnings = data?.warnings ?? [];
  const capabilities = data?.capabilities?.allowed_capabilities ?? [];
  const blocked = data?.blocked ?? false;
  const resetInfo = data?.usage_period_reset ?? {};
  const ledgerItems = ledger?.items ?? [];

  const envReady =
    Boolean(
      process.env.BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL
    ) && Boolean(process.env.BOSAI_WORKSPACE_API_KEY);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SaaS"
        title={workspace?.name || workspaceId}
        description="Vue détaillée du workspace : identité, plan, quotas, période courante, reset mensuel et capabilities autorisées."
      />

      <div>
        <Link
          href="/workspaces"
          className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10 hover:text-white"
        >
          ← Retour Workspaces
        </Link>
      </div>

      {!envReady ? (
        <DashboardCard
          title="Workspace detail non raccordé"
          subtitle="Les variables serveur nécessaires ne sont pas encore configurées."
        >
          <div className="space-y-3 text-sm text-zinc-400">
            <div className="text-zinc-200">BOSAI_WORKER_URL</div>
            <div className="text-zinc-200">BOSAI_WORKSPACE_API_KEY</div>
          </div>
        </DashboardCard>
      ) : null}

      {envReady && !data?.ok ? (
        <DashboardCard
          title="Worker response"
          subtitle="Le worker a répondu avec une erreur ou un payload partiel."
        >
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {data?.error || "workspace_detail_fetch_failed"}
          </div>
        </DashboardCard>
      ) : null}

      {envReady && data?.ok ? (
        <>
          <section className="space-y-4 border-b border-white/10 pb-6">
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Workspace identity
            </div>

            <div className="space-y-4 xl:flex xl:items-end xl:justify-between xl:gap-8 xl:space-y-0">
              <div className="max-w-4xl">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {workspace?.name || workspace?.workspace_id || workspaceId}
                </h2>
                <p className="mt-2 break-all text-base text-zinc-400">
                  {workspace?.workspace_id || workspaceId}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={badgeClassName(
                    statusVariant(workspace?.is_active, blocked)
                  )}
                >
                  {blocked ? "BLOCKED" : workspace?.is_active ? "ACTIVE" : "INACTIVE"}
                </span>

                {workspace?.type ? (
                  <span className={badgeClassName("info")}>
                    {workspace.type.toUpperCase()}
                  </span>
                ) : null}

                <span className={badgeClassName("violet")}>
                  {humanizePlan(workspace)}
                </span>

                {workspace?.current_usage_period_key ? (
                  <span className={badgeClassName("default")}>
                    {workspace.current_usage_period_key}
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard>
              <div className="text-sm text-zinc-400">Slug</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {formatOptional(workspace?.slug)}
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="text-sm text-zinc-400">Plan code</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {formatOptional(workspace?.plan_code || workspace?.plan_label)}
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {formatOptional(workspace?.status)}
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="text-sm text-zinc-400">Last reset</div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {formatDate(workspace?.last_usage_reset_at)}
              </div>
            </DashboardCard>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <MeterCard
              label="Runs meter"
              meter={data?.meters?.runs_month}
              blocked={blocked}
            />
            <MeterCard
              label="Tokens meter"
              meter={data?.meters?.tokens_month}
              blocked={blocked}
            />
            <MeterCard
              label="HTTP meter"
              meter={data?.meters?.http_calls_month}
              blocked={blocked}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <DashboardCard
              title="Current usage"
              subtitle="État courant du workspace."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Runs</span>
                  <span className="text-zinc-200">{formatNumber(usage.runs_month)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Tokens</span>
                  <span className="text-zinc-200">{formatNumber(usage.tokens_month)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>HTTP</span>
                  <span className="text-zinc-200">{formatNumber(usage.http_calls_month)}</span>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Plan limits"
              subtitle="Soft / hard limits configurés."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Runs</span>
                  <span className="text-zinc-200">
                    {formatNumber(limits.soft_runs_month)} / {formatNumber(limits.hard_runs_month)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Tokens</span>
                  <span className="text-zinc-200">
                    {formatNumber(limits.soft_tokens_month)} / {formatNumber(limits.hard_tokens_month)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>HTTP</span>
                  <span className="text-zinc-200">
                    {formatNumber(limits.soft_http_calls_month)} / {formatNumber(limits.hard_http_calls_month)}
                  </span>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Projection"
              subtitle="Projection worker pour l’état courant."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Projected runs</span>
                  <span className="text-zinc-200">{formatNumber(projected.runs_month)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Projected tokens</span>
                  <span className="text-zinc-200">{formatNumber(projected.tokens_month)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Projected HTTP</span>
                  <span className="text-zinc-200">{formatNumber(projected.http_calls_month)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Estimation source</span>
                  <span className="text-zinc-200">{formatOptional(estimation.source)}</span>
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardCard
              title="Reset status"
              subtitle="État du cycle mensuel."
            >
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-4">
                  <span>Current period</span>
                  <span className="text-zinc-200">
                    {formatOptional(resetInfo.current_period)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Effective period</span>
                  <span className="text-zinc-200">
                    {formatOptional(
                      resetInfo.effective_period || resetInfo.effective_period_before_reset
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Reset applied</span>
                  <span className="text-zinc-200">
                    {resetInfo.reset_applied ? "YES" : "NO"}
                  </span>
                </div>
                {resetInfo.reason ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-200">
                    {humanizeSignal(resetInfo.reason)}
                  </div>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard
              title="Allowed capabilities"
              subtitle="Capabilities autorisées pour ce plan."
            >
              <div className="space-y-3">
                <div className="text-sm text-zinc-400">
                  Resolved plan key:{" "}
                  <span className="text-zinc-200">
                    {formatOptional(data?.capabilities?.resolved_plan_key)}
                  </span>
                </div>

                {capabilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map((capability) => (
                      <span key={capability} className={badgeClassName("default")}>
                        {capability}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    Aucune capability remontée.
                  </div>
                )}
              </div>
            </DashboardCard>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardCard
              title="Warnings"
              subtitle="Signaux quota soft limits."
            >
              <div className="space-y-2">
                {warnings.length > 0 ? (
                  warnings.map((warning) => (
                    <div
                      key={warning}
                      className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
                    >
                      {humanizeSignal(warning)}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    Aucun warning actif.
                  </div>
                )}
              </div>
            </DashboardCard>

            <DashboardCard
              title="Blocking state"
              subtitle="État final de blocage."
            >
              <div className="space-y-3">
                <div className="text-sm text-zinc-400">
                  Blocked:{" "}
                  <span className={blocked ? "text-red-300" : "text-emerald-300"}>
                    {blocked ? "YES" : "NO"}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  {blocked ? humanizeSignal(data?.block_reason) : "Aucun blocage actif."}
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Usage history
            </div>

            <WorkspaceLedgerFilters initialFilters={ledgerFilters} />

            {!ledger?.ok ? (
              <DashboardCard
                title="Usage ledger response"
                subtitle="Le worker a répondu avec une erreur ou un payload partiel."
              >
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {ledger?.error || "workspace_usage_ledger_fetch_failed"}
                </div>
              </DashboardCard>
            ) : (
              <DashboardCard
                title="Usage history"
                subtitle={`Dernières écritures réelles du ledger pour ce workspace. ${formatNumber(
                  ledger?.count
                )} résultat(s).`}
              >
                {ledgerItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    Aucun événement de consommation trouvé.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ledgerItems.map((item) => (
                      <div
                        key={item.record_id}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {item.name || item.capability || item.usage_id || item.record_id}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {formatDate(item.created_at)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className={badgeClassName(ledgerStatusVariant(item.status))}>
                              {humanizeSignal(item.status)}
                            </span>
                            <span className={badgeClassName("default")}>
                              {formatOptional(item.capability)}
                            </span>
                            {item.period_key ? (
                              <span className={badgeClassName("violet")}>
                                {item.period_key}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-3">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Runs delta
                            </div>
                            <div className="mt-1 text-zinc-200">
                              {formatNumber(item.runs_delta)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Tokens delta
                            </div>
                            <div className="mt-1 text-zinc-200">
                              {formatNumber(item.tokens_delta)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              HTTP delta
                            </div>
                            <div className="mt-1 text-zinc-200">
                              {formatNumber(item.http_calls_delta)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 text-sm text-zinc-400 md:grid-cols-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Worker
                            </div>
                            <div className="mt-1 break-all text-zinc-200">
                              {formatOptional(item.worker)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Idempotency key
                            </div>
                            <div className="mt-1 break-all text-zinc-200">
                              {formatOptional(item.idempotency_key)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Run record
                            </div>
                            <div className="mt-1 break-all text-zinc-200">
                              {formatOptional(item.run_record_id)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Run ID
                            </div>
                            <div className="mt-1 break-all text-zinc-200">
                              {formatOptional(item.run_id)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
