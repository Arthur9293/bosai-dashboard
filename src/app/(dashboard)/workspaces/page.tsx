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
