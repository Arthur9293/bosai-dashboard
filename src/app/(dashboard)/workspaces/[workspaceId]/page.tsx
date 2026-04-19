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

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-sky-500/20 bg-sky-500/12 text-sky-300 hover:bg-sky-500/18`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function formatNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function formatMaybeNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "—";
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

function formatBool(value?: boolean | null): string {
  return value ? "YES" : "NO";
}

function compactText(value?: string | null, max = 280): string {
  const text = String(value || "").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
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
    soft_limit_http_calls_month_exceeded:
      "Seuil mensuel appels HTTP dépassé",
    hard_limit_http_calls_month_reached:
      "Limite mensuelle appels HTTP atteinte",
    workspace_not_found: "Workspace introuvable",
    workspace_inactive: "Workspace inactif",
    capability_not_allowed_for_plan:
      "Capability non autorisée pour ce plan",
    snapshot_lookup_failed_but_record_listed:
      "Snapshot détaillé indisponible",
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

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
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
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "success") return "success";
  if (normalized === "blocked" || normalized === "unsupported") {
    return "warning";
  }
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

function buildWorkspaceQuickRead(args: {
  blocked: boolean;
  warningsCount: number;
  capabilitiesCount: number;
  ledgerCount: number;
  planKey?: string;
  blockReason?: string;
}): string {
  if (args.blocked) {
    return `Workspace bloqué. Raison principale : ${humanizeSignal(
      args.blockReason
    )}.`;
  }

  if (args.warningsCount > 0) {
    return `Workspace exploitable avec ${args.warningsCount} warning(s) quota visibles, ${args.capabilitiesCount} capability(s) remontées et ${args.ledgerCount} entrée(s) ledger visibles.`;
  }

  return `Workspace globalement stable avec ${args.capabilitiesCount} capability(s) autorisées et ${args.ledgerCount} entrée(s) ledger visibles${
    args.planKey ? ` sur le plan ${args.planKey}` : ""
  }.`;
}

function buildLedgerQuickRead(filters: LedgerFilters, count: number): string {
  const parts: string[] = [];

  if (filters.status) parts.push(`statut ${filters.status}`);
  if (filters.capability) parts.push(`capability ${filters.capability}`);
  if (filters.period_key) parts.push(`période ${filters.period_key}`);

  if (parts.length === 0) {
    return `Lecture large du ledger avec ${count} résultat(s) visibles.`;
  }

  return `Lecture filtrée du ledger sur ${parts.join(
    " · "
  )}, avec ${count} résultat(s) visibles.`;
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
  const urlBase = `${baseUrl.replace(
    /\/+$/,
    ""
  )}/workspaces/${encodeURIComponent(workspaceId)}/usage-ledger`;
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
        error instanceof Error
          ? error.message
          : "workspace_usage_ledger_fetch_failed",
    };
  }
}

function StatCard({
  label,
  value,
  tone = "text-white",
  helper,
}: {
  label: string;
  value: string | number;
  tone?: string;
  helper?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function MetaCard({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-zinc-200 ${breakAll ? "break-all" : ""}`}>
        {value || "—"}
      </div>
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
  const variant = meterVariant(
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
          <div className="mt-1 text-zinc-200">{formatMaybeNumber(hardLimit)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Soft limit</div>
          <div className="mt-1 text-zinc-200">{formatMaybeNumber(softLimit)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Restant hard</div>
          <div className="mt-1 text-zinc-200">
            {formatMaybeNumber(meter?.remaining_to_hard)}
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

  const workspaceQuickRead = buildWorkspaceQuickRead({
    blocked,
    warningsCount: warnings.length,
    capabilitiesCount: capabilities.length,
    ledgerCount: ledger?.count ?? ledgerItems.length,
    planKey: data?.capabilities?.resolved_plan_key,
    blockReason: data?.block_reason,
  });

  const ledgerQuickRead = buildLedgerQuickRead(
    ledgerFilters,
    ledger?.count ?? ledgerItems.length
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SaaS"
        title={workspace?.name || workspaceId}
        description="Vue détaillée du workspace : identité, plan, quotas, période courante, reset mensuel et capabilities autorisées."
      />

      <div className="flex flex-wrap gap-3">
        <Link href="/workspaces" className={actionLinkClassName("soft")}>
          Retour Workspaces
        </Link>
        <Link href="/settings" className={actionLinkClassName("default")}>
          Ouvrir Settings
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
            <div className={sectionLabelClassName()}>Workspace identity</div>

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

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Runs"
              value={formatNumber(usage.runs_month)}
              helper={`Hard ${formatMaybeNumber(limits.hard_runs_month)}`}
            />
            <StatCard
              label="Tokens"
              value={formatNumber(usage.tokens_month)}
              helper={`Hard ${formatMaybeNumber(limits.hard_tokens_month)}`}
            />
            <StatCard
              label="HTTP"
              value={formatNumber(usage.http_calls_month)}
              helper={`Hard ${formatMaybeNumber(limits.hard_http_calls_month)}`}
            />
            <StatCard
              label="Capabilities"
              value={capabilities.length}
              helper={formatOptional(data?.capabilities?.resolved_plan_key)}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardCard
              title="Workspace identity"
              subtitle="Lecture produit et technique du workspace."
            >
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetaCard
                  label="Workspace ID"
                  value={workspace?.workspace_id || workspaceId}
                  breakAll
                />
                <MetaCard label="Slug" value={formatOptional(workspace?.slug)} />
                <MetaCard label="Type" value={formatOptional(workspace?.type)} />
                <MetaCard label="Plan" value={humanizePlan(workspace)} />
                <MetaCard
                  label="Plan code"
                  value={formatOptional(
                    workspace?.plan_code || workspace?.plan_label
                  )}
                />
                <MetaCard label="Status" value={formatOptional(workspace?.status)} />
                <MetaCard
                  label="Current period"
                  value={formatOptional(workspace?.current_usage_period_key)}
                />
                <MetaCard
                  label="Last reset"
                  value={formatDate(workspace?.last_usage_reset_at)}
                />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Workspace posture"
              subtitle="Lecture rapide du tenant visible."
            >
              <div className="space-y-3">
                <InfoRow label="Blocked" value={formatBool(blocked)} />
                <InfoRow label="Warnings" value={warnings.length} />
                <InfoRow
                  label="Resolved plan"
                  value={formatOptional(data?.capabilities?.resolved_plan_key)}
                />
                <InfoRow
                  label="Ledger items"
                  value={ledger?.count ?? ledgerItems.length}
                />
              </div>

              <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Quick read</div>
                <div className="mt-2 text-sm leading-6 text-zinc-300">
                  {workspaceQuickRead}
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="space-y-4">
            <div className={sectionLabelClassName()}>Meters</div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <DashboardCard
              title="Current usage"
              subtitle="État courant du workspace."
            >
              <div className="space-y-3">
                <InfoRow label="Runs" value={formatNumber(usage.runs_month)} />
                <InfoRow label="Tokens" value={formatNumber(usage.tokens_month)} />
                <InfoRow label="HTTP" value={formatNumber(usage.http_calls_month)} />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Plan limits"
              subtitle="Soft et hard limits configurés."
            >
              <div className="space-y-3">
                <InfoRow
                  label="Runs"
                  value={`${formatMaybeNumber(
                    limits.soft_runs_month
                  )} / ${formatMaybeNumber(limits.hard_runs_month)}`}
                />
                <InfoRow
                  label="Tokens"
                  value={`${formatMaybeNumber(
                    limits.soft_tokens_month
                  )} / ${formatMaybeNumber(limits.hard_tokens_month)}`}
                />
                <InfoRow
                  label="HTTP"
                  value={`${formatMaybeNumber(
                    limits.soft_http_calls_month
                  )} / ${formatMaybeNumber(limits.hard_http_calls_month)}`}
                />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Projection"
              subtitle="Projection worker pour l’état courant."
            >
              <div className="space-y-3">
                <InfoRow
                  label="Projected runs"
                  value={formatNumber(projected.runs_month)}
                />
                <InfoRow
                  label="Projected tokens"
                  value={formatNumber(projected.tokens_month)}
                />
                <InfoRow
                  label="Projected HTTP"
                  value={formatNumber(projected.http_calls_month)}
                />
                <InfoRow
                  label="Estimated delta"
                  value={formatNumber(projected.estimated_tokens_delta)}
                />
                <InfoRow
                  label="Requested tokens"
                  value={formatNumber(estimation.requested_tokens)}
                />
                <InfoRow
                  label="Text chars"
                  value={formatNumber(estimation.text_chars)}
                />
                <InfoRow
                  label="Estimation source"
                  value={formatOptional(estimation.source)}
                />
              </div>
            </DashboardCard>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardCard
              title="Reset status"
              subtitle="État du cycle mensuel et fallback éventuel."
            >
              <div className="space-y-3">
                <InfoRow
                  label="Current period"
                  value={formatOptional(resetInfo.current_period)}
                />
                <InfoRow
                  label="Effective period"
                  value={formatOptional(
                    resetInfo.effective_period ||
                      resetInfo.effective_period_before_reset
                  )}
                />
                <InfoRow
                  label="Reset applied"
                  value={formatBool(resetInfo.reset_applied)}
                />
                <InfoRow label="Fallback" value={formatBool(resetInfo.fallback)} />
                <InfoRow label="Exists" value={formatBool(resetInfo.exists)} />
                <InfoRow label="OK" value={formatBool(resetInfo.ok)} />
              </div>

              {resetInfo.reason ? (
                <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-200">
                  {humanizeSignal(resetInfo.reason)}
                </div>
              ) : null}
            </DashboardCard>

            <DashboardCard
              title="Allowed capabilities"
              subtitle="Capabilities autorisées pour ce plan."
            >
              <div className="space-y-4">
                <InfoRow
                  label="Resolved plan key"
                  value={formatOptional(data?.capabilities?.resolved_plan_key)}
                />

                {capabilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {capabilities.map((capability) => (
                      <span key={capability} className={badgeClassName("info")}>
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
              subtitle="État final de blocage et raison principale."
            >
              <div className="space-y-3">
                <InfoRow label="Blocked" value={formatBool(blocked)} />

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
                  {blocked
                    ? humanizeSignal(data?.block_reason)
                    : "Aucun blocage actif."}
                </div>
              </div>
            </DashboardCard>
          </section>

          <section className="space-y-4">
            <div className={sectionLabelClassName()}>Usage history</div>

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
              <>
                <DashboardCard
                  title="Ledger posture"
                  subtitle="Lecture rapide du ledger visible pour ce workspace."
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoRow
                      label="Visible items"
                      value={ledger?.count ?? ledgerItems.length}
                    />
                    <InfoRow
                      label="Status filter"
                      value={ledgerFilters.status || "Tous"}
                    />
                    <InfoRow
                      label="Capability filter"
                      value={ledgerFilters.capability || "Toutes"}
                    />
                    <InfoRow
                      label="Period filter"
                      value={ledgerFilters.period_key || "Toutes"}
                    />
                  </div>

                  <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                    <div className={metaLabelClassName()}>Quick read</div>
                    <div className="mt-2 text-sm leading-6 text-zinc-300">
                      {ledgerQuickRead}
                    </div>
                  </div>
                </DashboardCard>

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
                          className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-words text-base font-semibold text-white">
                                {item.name ||
                                  item.capability ||
                                  item.usage_id ||
                                  item.record_id}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {formatDate(item.created_at)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span
                                className={badgeClassName(
                                  ledgerStatusVariant(item.status)
                                )}
                              >
                                {humanizeSignal(item.status)}
                              </span>

                              {item.capability ? (
                                <span className={badgeClassName("default")}>
                                  {item.capability}
                                </span>
                              ) : null}

                              {item.period_key ? (
                                <span className={badgeClassName("violet")}>
                                  {item.period_key}
                                </span>
                              ) : null}

                              {item.usage_type ? (
                                <span className={badgeClassName("info")}>
                                  {item.usage_type}
                                </span>
                              ) : null}

                              {typeof item.billable === "boolean" ? (
                                <span
                                  className={badgeClassName(
                                    item.billable ? "success" : "default"
                                  )}
                                >
                                  {item.billable ? "BILLABLE" : "NON BILLABLE"}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <MetaCard
                              label="Runs delta"
                              value={formatNumber(item.runs_delta)}
                            />
                            <MetaCard
                              label="Tokens delta"
                              value={formatNumber(item.tokens_delta)}
                            />
                            <MetaCard
                              label="HTTP delta"
                              value={formatNumber(item.http_calls_delta)}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <MetaCard
                              label="Worker"
                              value={formatOptional(item.worker)}
                              breakAll
                            />
                            <MetaCard
                              label="Idempotency key"
                              value={formatOptional(item.idempotency_key)}
                              breakAll
                            />
                            <MetaCard
                              label="Run record"
                              value={formatOptional(item.run_record_id)}
                              breakAll
                            />
                            <MetaCard
                              label="Run ID"
                              value={formatOptional(item.run_id)}
                              breakAll
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <MetaCard
                              label="Quantity"
                              value={`${formatMaybeNumber(item.quantity)} ${
                                item.unit || ""
                              }`.trim() || "—"}
                            />
                            <MetaCard
                              label="Usage ID"
                              value={formatOptional(item.usage_id)}
                              breakAll
                            />
                          </div>

                          {item.metadata_json ? (
                            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/30 px-4 py-4">
                              <div className={metaLabelClassName()}>
                                Metadata preview
                              </div>
                              <div className="mt-2 break-words text-sm leading-6 text-zinc-300">
                                {compactText(item.metadata_json)}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardCard>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
