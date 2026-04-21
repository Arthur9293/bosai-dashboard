import Link from "next/link";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import { WorkspacesFilters } from "./workspaces-filters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WorkspaceUsage = {
  runs_month?: number;
  tokens_month?: number;
  http_calls_month?: number;
};

type WorkspaceLimits = {
  soft_runs_month?: number;
  hard_runs_month?: number;
  soft_tokens_month?: number;
  hard_tokens_month?: number;
  soft_http_calls_month?: number;
  hard_http_calls_month?: number;
};

type WorkspaceResetInfo = {
  ok?: boolean;
  exists?: boolean;
  reset_applied?: boolean;
  current_period?: string;
  effective_period?: string;
  effective_period_before_reset?: string;
  fallback?: boolean;
  reason?: string;
};

type WorkspaceListItem = {
  record_id: string;
  workspace_id: string;
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
  usage?: WorkspaceUsage;
  limits?: WorkspaceLimits;
  blocked?: boolean;
  block_reason?: string;
  warnings?: string[];
  usage_period_reset?: WorkspaceResetInfo;
};

type WorkspacesResponse = {
  ok: boolean;
  count?: number;
  items?: WorkspaceListItem[];
  source?: {
    table?: string;
    view?: string;
    limit?: number;
  };
  ts?: string;
  error?: string;
};

type WorkspaceFilters = {
  status: string;
  plan: string;
  period_key: string;
  limit: number;
};

type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>
  | undefined;

function formatNumber(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-FR").format(value)
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

function humanizePlan(item: WorkspaceListItem): string {
  const raw = item.plan_code || item.plan_label || item.plan_id || "";
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
    capability_not_allowed_for_plan: "Capability non autorisée pour ce plan",
    snapshot_lookup_failed_but_record_listed:
      "Snapshot détaillé indisponible",
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

function workspaceStatusVariant(item: WorkspaceListItem) {
  if (item.blocked) return "danger" as const;
  if (item.is_active) return "success" as const;
  return "warning" as const;
}

function workspaceStatusLabel(item: WorkspaceListItem): string {
  if (item.blocked) return "BLOCKED";
  if (item.is_active) return "ACTIVE";
  return "INACTIVE";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName(): string {
  return "rounded-[18px] border border-white/10 bg-black/20 px-4 py-4";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function parseWorkspaceFilters(
  searchParams?: Record<string, string | string[] | undefined>
): WorkspaceFilters {
  const getSingle = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] || "" : value || "";

  const rawStatus = getSingle(searchParams?.status).trim().toLowerCase();
  const rawPlan = getSingle(searchParams?.plan).trim().toLowerCase();
  const rawPeriodKey = getSingle(searchParams?.period_key).trim();
  const rawLimit = Number.parseInt(getSingle(searchParams?.limit), 10);

  const allowedStatuses = new Set([
    "active",
    "blocked",
    "warnings",
    "fallback",
  ]);
  const safeStatus = allowedStatuses.has(rawStatus) ? rawStatus : "";

  const safeLimit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(rawLimit, 100))
    : 20;

  return {
    status: safeStatus,
    plan: rawPlan,
    period_key: rawPeriodKey,
    limit: safeLimit,
  };
}

function filterWorkspaces(
  items: WorkspaceListItem[],
  filters: WorkspaceFilters
): WorkspaceListItem[] {
  return items
    .filter((item) => {
      if (filters.status === "active" && !item.is_active) return false;
      if (filters.status === "blocked" && !item.blocked) return false;
      if (
        filters.status === "warnings" &&
        (item.warnings ?? []).length === 0
      ) {
        return false;
      }
      if (
        filters.status === "fallback" &&
        !item.usage_period_reset?.fallback
      ) {
        return false;
      }

      if (filters.plan) {
        const planRaw = [
          item.plan_code || "",
          item.plan_label || "",
          item.plan_id || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!planRaw.includes(filters.plan)) return false;
      }

      if (filters.period_key) {
        const periodValue = String(item.current_usage_period_key || "").trim();
        if (periodValue !== filters.period_key) return false;
      }

      return true;
    })
    .slice(0, filters.limit);
}

function isWorkspaceListItem(value: unknown): value is WorkspaceListItem {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.workspace_id === "string" &&
    record.workspace_id.trim().length > 0
  );
}

function normalizeWorkspacesResponse(raw: unknown): WorkspacesResponse {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error: "invalid_workspaces_payload",
      items: [],
    };
  }

  const record = raw as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];

  return {
    ok: Boolean(record.ok),
    count:
      typeof record.count === "number" && Number.isFinite(record.count)
        ? record.count
        : rawItems.length,
    items: rawItems.filter(isWorkspaceListItem),
    source:
      record.source && typeof record.source === "object"
        ? (record.source as WorkspacesResponse["source"])
        : undefined,
    ts: typeof record.ts === "string" ? record.ts : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
  };
}

async function fetchWorkspaces(): Promise<WorkspacesResponse | null> {
  const baseUrl =
    process.env.BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  const workspaceApiKey = process.env.BOSAI_WORKSPACE_API_KEY || "";

  if (!baseUrl || !workspaceApiKey) {
    return null;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/workspaces`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-bosai-key": workspaceApiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await response.text(),
        items: [],
      };
    }

    const json = await response.json();
    return normalizeWorkspacesResponse(json);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "workspaces_fetch_failed",
      items: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getQuickRead(params: {
  visibleCount: number;
  activeCount: number;
  blockedCount: number;
  warningCount: number;
  hasActiveFilters: boolean;
}): string {
  const {
    visibleCount,
    activeCount,
    blockedCount,
    warningCount,
    hasActiveFilters,
  } = params;

  if (blockedCount > 0) {
    return "Priorité : ouvrir les workspaces bloqués puis vérifier leurs signaux quota et leur état de reset.";
  }

  if (warningCount > 0) {
    return "Lecture bleue : certains tenants approchent des seuils et méritent une vérification avant blocage.";
  }

  if (activeCount > 0 && visibleCount > 0) {
    return hasActiveFilters
      ? "Le sous-ensemble filtré paraît globalement stable sur le registre visible."
      : "Le registre visible paraît majoritairement stable sur les tenants actifs.";
  }

  if (visibleCount > 0) {
    return "Les workspaces visibles restent lisibles, mais sans signal actif dominant.";
  }

  return "Aucun workspace ne correspond aux filtres actuels.";
}

function getUsageTone(current?: number, hard?: number): string {
  const currentValue = typeof current === "number" ? current : 0;
  const hardValue = typeof hard === "number" ? hard : 0;

  if (hardValue > 0 && currentValue >= hardValue) return "text-red-300";
  if (hardValue > 0 && currentValue >= hardValue * 0.8)
    return "text-amber-300";
  return "text-white";
}

function getWorkspacePeriodLabel(item: WorkspaceListItem): string {
  return item.current_usage_period_key?.trim() || "Période inconnue";
}

function StatTile({
  label,
  value,
  helper,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  helper?: string;
  toneClass?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function RegistryInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function UsageMiniStat({
  label,
  current,
  hard,
}: {
  label: string;
  current?: number;
  hard?: number;
}) {
  return (
    <div className={metaBoxClassName()}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-lg font-semibold ${getUsageTone(current, hard)}`}>
        {formatNumber(current)}
      </div>
      <div className="mt-1 text-sm text-zinc-400">/ {formatNumber(hard)}</div>
    </div>
  );
}

function WorkspaceCard({ item }: { item: WorkspaceListItem }) {
  const warnings = item.warnings ?? [];
  const usage = item.usage ?? {};
  const limits = item.limits ?? {};
  const resetInfo = item.usage_period_reset ?? {};

  return (
    <DashboardCard
      rightSlot={
        <span className={badgeClassName(workspaceStatusVariant(item))}>
          {workspaceStatusLabel(item)}
        </span>
      }
    >
      <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
        Workspace
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.type ? (
          <span className={badgeClassName("info")}>
            {item.type.toUpperCase()}
          </span>
        ) : null}

        <span className={badgeClassName("violet")}>{humanizePlan(item)}</span>

        {item.current_usage_period_key ? (
          <span className={badgeClassName("default")}>
            {item.current_usage_period_key}
          </span>
        ) : null}

        {resetInfo.fallback ? (
          <span className={badgeClassName("warning")}>FALLBACK</span>
        ) : null}
      </div>

      <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {item.name || item.workspace_id}
      </div>

      <p className="mt-2 break-all text-sm text-zinc-400">{item.workspace_id}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <UsageMiniStat
          label="Runs"
          current={usage.runs_month}
          hard={limits.hard_runs_month}
        />
        <UsageMiniStat
          label="HTTP"
          current={usage.http_calls_month}
          hard={limits.hard_http_calls_month}
        />
        <UsageMiniStat
          label="Tokens"
          current={usage.tokens_month}
          hard={limits.hard_tokens_month}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 text-sm text-zinc-400 md:grid-cols-2">
        <div>
          <div className={metaLabelClassName()}>Slug</div>
          <div className="mt-1 text-zinc-200">{formatOptional(item.slug)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Status</div>
          <div className="mt-1 text-zinc-200">{formatOptional(item.status)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Plan code</div>
          <div className="mt-1 text-zinc-200">
            {formatOptional(item.plan_code || item.plan_label)}
          </div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Usage period</div>
          <div className="mt-1 text-zinc-200">{getWorkspacePeriodLabel(item)}</div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Last usage reset</div>
          <div className="mt-1 text-zinc-200">
            {formatDate(item.last_usage_reset_at)}
          </div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Reset state</div>
          <div className="mt-1 text-zinc-200">
            {resetInfo.reset_applied
              ? "Reset applied"
              : resetInfo.fallback
                ? humanizeSignal(resetInfo.reason)
                : "Stable"}
          </div>
        </div>
      </div>

      {item.blocked ? (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {humanizeSignal(item.block_reason)}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-5 space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              {humanizeSignal(warning)}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-5">
        <Link
          href={`/workspaces/${encodeURIComponent(item.workspace_id)}`}
          className="inline-flex w-full items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/15 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
        >
          Ouvrir le workspace
        </Link>
      </div>
    </DashboardCard>
  );
}

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : undefined;

  const filters = parseWorkspaceFilters(resolvedSearchParams);
  const data = await fetchWorkspaces();

  const items = Array.isArray(data?.items) ? data!.items : [];
  const filteredItems = filterWorkspaces(items, filters);

  const envReady =
    Boolean(
      process.env.BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL
    ) && Boolean(process.env.BOSAI_WORKSPACE_API_KEY);

  const activeCount = filteredItems.filter((item) => item.is_active).length;
  const blockedCount = filteredItems.filter((item) => item.blocked).length;
  const warningCount = filteredItems.filter(
    (item) => (item.warnings ?? []).length > 0
  ).length;

  const hasActiveFilters = Boolean(
    filters.status || filters.plan || filters.period_key
  );

  const quickRead = getQuickRead({
    visibleCount: filteredItems.length,
    activeCount,
    blockedCount,
    warningCount,
    hasActiveFilters,
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="SaaS"
        title="Workspaces"
        description="Vue consolidée des tenants BOSAI : plan, statut, période courante, usage, limites et signaux quota."
      />

      {!envReady ? (
        <DashboardCard
          title="Dashboard workspaces non raccordé"
          subtitle="Les variables serveur nécessaires ne sont pas encore configurées."
        >
          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              <span className="text-zinc-200">BOSAI_WORKER_URL</span>
            </div>
            <div>
              <span className="text-zinc-200">BOSAI_WORKSPACE_API_KEY</span>
            </div>
          </div>
        </DashboardCard>
      ) : null}

      {envReady ? (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
            <DashboardCard
              title="Workspace posture"
              subtitle="Lecture rapide du registre visible avec focus quotas, blocages et stabilité."
            >
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatTile
                  label="Visible"
                  value={formatNumber(filteredItems.length)}
                  toneClass="text-sky-300"
                  helper={
                    hasActiveFilters
                      ? `Filtrés sur ${formatNumber(items.length)}`
                      : "Registre courant"
                  }
                />
                <StatTile
                  label="Active"
                  value={formatNumber(activeCount)}
                  toneClass="text-emerald-300"
                  helper="Tenants actifs"
                />
                <StatTile
                  label="Blocked"
                  value={formatNumber(blockedCount)}
                  toneClass="text-red-300"
                  helper="Blocages visibles"
                />
                <StatTile
                  label="Warnings"
                  value={formatNumber(warningCount)}
                  toneClass="text-amber-300"
                  helper="Soft limits visibles"
                />
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className={metaLabelClassName()}>Quick read</div>
                <div className="mt-2 text-sm leading-6 text-zinc-300">
                  {quickRead}
                </div>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Registry status"
              subtitle="Lecture backend depuis le worker BOSAI."
            >
              <div className="space-y-3">
                <RegistryInfoRow
                  label="Source table"
                  value={data?.source?.table || "—"}
                />
                <RegistryInfoRow
                  label="View"
                  value={data?.source?.view?.trim() ? data.source.view : "Default"}
                />
                <RegistryInfoRow
                  label="Limit"
                  value={formatNumber(data?.source?.limit)}
                />
                <RegistryInfoRow
                  label="Fetched"
                  value={formatNumber(data?.count)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={badgeClassName("info")}>Registry linked</span>
                <span className={badgeClassName("default")}>
                  {hasActiveFilters ? "Filtered view" : "Full view"}
                </span>
                {blockedCount > 0 ? (
                  <span className={badgeClassName("danger")}>Blocked visible</span>
                ) : null}
              </div>
            </DashboardCard>
          </section>

          <WorkspacesFilters initialFilters={filters} />

          {!data?.ok ? (
            <DashboardCard
              title="Worker response"
              subtitle="Le worker a répondu avec une erreur ou un payload partiel."
            >
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {data?.error || "workspaces_fetch_failed"}
              </div>
            </DashboardCard>
          ) : null}

          {data?.ok ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className={sectionLabelClassName()}>Workspace cards</div>
                <span className={badgeClassName("info")}>
                  {formatNumber(filteredItems.length)} visible(s)
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <DashboardCard
                  title="Aucun workspace visible"
                  subtitle="Aucun workspace ne correspond aux filtres actuels."
                >
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    Essaie un autre status, plan ou period key.
                  </div>
                </DashboardCard>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {filteredItems.map((item) => (
                    <WorkspaceCard
                      key={item.record_id || item.workspace_id}
                      item={item}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
