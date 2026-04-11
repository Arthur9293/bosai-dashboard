import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

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
    soft_limit_http_calls_month_exceeded: "Seuil mensuel appels HTTP dépassé",
    hard_limit_http_calls_month_reached: "Limite mensuelle appels HTTP atteinte",
    workspace_not_found: "Workspace introuvable",
    workspace_inactive: "Workspace inactif",
    capability_not_allowed_for_plan: "Capability non autorisée pour ce plan",
    snapshot_lookup_failed_but_record_listed: "Snapshot détaillé indisponible",
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

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
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

    return (await response.json()) as WorkspacesResponse;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "workspaces_fetch_failed",
    };
  }
}

function StatTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {helper ? <div className="mt-3 text-sm text-zinc-300">{helper}</div> : null}
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
          {item.blocked ? "BLOCKED" : item.is_active ? "ACTIVE" : "INACTIVE"}
        </span>
      }
    >
      <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
        Workspace
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.type ? (
          <span className={badgeClassName("info")}>{item.type.toUpperCase()}</span>
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
          <div className={metaLabelClassName()}>Last usage reset</div>
          <div className="mt-1 text-zinc-200">
            {formatDate(item.last_usage_reset_at)}
          </div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Runs</div>
          <div className="mt-1 text-zinc-200">
            {formatNumber(usage.runs_month)} / {formatNumber(limits.hard_runs_month)}
          </div>
        </div>

        <div>
          <div className={metaLabelClassName()}>HTTP</div>
          <div className="mt-1 text-zinc-200">
            {formatNumber(usage.http_calls_month)} /{" "}
            {formatNumber(limits.hard_http_calls_month)}
          </div>
        </div>

        <div>
          <div className={metaLabelClassName()}>Tokens</div>
          <div className="mt-1 text-zinc-200">
            {formatNumber(usage.tokens_month)} /{" "}
            {formatNumber(limits.hard_tokens_month)}
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
    </DashboardCard>
  );
}

export default async function WorkspacesPage() {
  const data = await fetchWorkspaces();
  const items = data?.items ?? [];

  const envReady =
    Boolean(
      process.env.BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL
    ) && Boolean(process.env.BOSAI_WORKSPACE_API_KEY);

  const activeCount = items.filter((item) => item.is_active).length;
  const blockedCount = items.filter((item) => item.blocked).length;
  const warningCount = items.filter((item) => (item.warnings ?? []).length > 0).length;

  return (
    <div className="space-y-8">
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
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Total workspaces"
              value={formatNumber(items.length)}
              helper={`Source: ${data?.source?.table || "Workspaces"}`}
            />
            <StatTile
              label="Active"
              value={formatNumber(activeCount)}
              helper="Workspaces actifs"
            />
            <StatTile
              label="Blocked"
              value={formatNumber(blockedCount)}
              helper="Blocages quota / état"
            />
            <StatTile
              label="Warnings"
              value={formatNumber(warningCount)}
              helper="Signaux soft limits"
            />
          </section>

          <DashboardCard
            title="Registry status"
            subtitle="Lecture backend depuis le worker BOSAI."
          >
            <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
              <div className="flex justify-between gap-4">
                <span>Source table</span>
                <span className="text-zinc-200">{data?.source?.table || "—"}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span>View</span>
                <span className="text-zinc-200">
                  {data?.source?.view?.trim() ? data.source.view : "Default"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Limit</span>
                <span className="text-zinc-200">
                  {formatNumber(data?.source?.limit)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span>Fetched</span>
                <span className="text-zinc-200">{formatNumber(data?.count)}</span>
              </div>
            </div>
          </DashboardCard>

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
              <div className={sectionLabelClassName()}>Workspace cards</div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {items.map((item) => (
                  <WorkspaceCard key={item.record_id || item.workspace_id} item={item} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
