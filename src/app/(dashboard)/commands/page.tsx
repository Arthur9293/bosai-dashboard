import Link from "next/link";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  fetchCommands,
  type CommandItem,
  type CommandsResponse,
} from "@/lib/api";

type SearchParams = {
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_event_id?: string | string[];
  from?: string | string[];
  bucket?: string | string[];
  capability?: string | string[];
  workspace_id?: string | string[];
  period_key?: string | string[];
  limit?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type CommandFilters = {
  bucket: string;
  capability: string;
  workspace_id: string;
  period_key: string;
  limit: number;
};

type CommandsFiltersProps = {
  initialFilters: CommandFilters;
  preservedParams: {
    flow_id: string;
    root_event_id: string;
    source_event_id: string;
    from: string;
  };
};

type StatusKind =
  | "queued"
  | "running"
  | "retry"
  | "failed"
  | "success"
  | "unknown";

type CountTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const CommandsFilters = dynamic<CommandsFiltersProps>(
  () =>
    import("./commands-filters").then((mod) => mod.CommandsFilters),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
        <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">
          Filters
        </div>
        <div className="mt-3 text-sm text-zinc-400">
          Chargement des filtres…
        </div>
      </section>
    ),
  }
);

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function compactCardClassName() {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.22em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName(): string {
  return "rounded-[18px] border border-white/10 bg-black/20 px-4 py-4";
}

function neutralPillClassName() {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
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

function toText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toText(item, "");
      if (candidate) return candidate;
    }
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toTextOrEmpty(value: unknown): string {
  return toText(value, "");
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeText(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = String(value || "").trim();
    if (text) search.set(key, text);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function humanStatusLabel(status?: string): string {
  const normalized = normalizeText(status);

  if (
    ["processed", "done", "success", "completed", "resolved"].includes(
      normalized
    )
  ) {
    return "Succès";
  }

  if (["queued", "queue", "pending", "new"].includes(normalized)) {
    return "En file";
  }

  if (["running", "processing"].includes(normalized)) {
    return "En cours";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "Retry";
  }

  if (["ignored"].includes(normalized)) {
    return "Ignorée";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "Échec";
  }

  return normalized ? normalized.toUpperCase() : "UNKNOWN";
}

function cleanCapabilityLabel(value: string): string {
  const raw = toText(value, "");
  if (!raw) return "unknown_capability";
  return raw.replace(/_/g, " ");
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.status) ||
    toTextOrEmpty(result.status) ||
    toTextOrEmpty(result.status_select) ||
    toTextOrEmpty(input.status) ||
    "unknown"
  );
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.capability) ||
    toTextOrEmpty(input.capability) ||
    toTextOrEmpty(result.capability) ||
    "unknown_capability"
  );
}

function getCommandTitle(command: CommandItem): string {
  return (
    toTextOrEmpty(command.name) ||
    cleanCapabilityLabel(getCommandCapability(command)) ||
    "Command detail"
  );
}

function getCommandWorkspace(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.workspace_id) ||
    toTextOrEmpty(input.workspace_id) ||
    toTextOrEmpty((input as Record<string, unknown>).workspaceId) ||
    toTextOrEmpty(result.workspace_id) ||
    toTextOrEmpty((result as Record<string, unknown>).workspaceId) ||
    "—"
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.flow_id) ||
    toTextOrEmpty(input.flow_id) ||
    toTextOrEmpty((input as Record<string, unknown>).flowId) ||
    toTextOrEmpty(result.flow_id) ||
    toTextOrEmpty((result as Record<string, unknown>).flowId) ||
    ""
  );
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.root_event_id) ||
    toTextOrEmpty(input.root_event_id) ||
    toTextOrEmpty((input as Record<string, unknown>).rootEventId) ||
    toTextOrEmpty(result.root_event_id) ||
    toTextOrEmpty((result as Record<string, unknown>).rootEventId) ||
    ""
  );
}

function getCommandSourceEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toTextOrEmpty(record.source_event_id) ||
    toTextOrEmpty(record.Source_Event_ID) ||
    toTextOrEmpty(input.source_event_id) ||
    toTextOrEmpty((input as Record<string, unknown>).sourceEventId) ||
    toTextOrEmpty(input.event_id) ||
    toTextOrEmpty((input as Record<string, unknown>).eventId) ||
    toTextOrEmpty(result.source_event_id) ||
    toTextOrEmpty((result as Record<string, unknown>).sourceEventId) ||
    toTextOrEmpty(result.event_id) ||
    toTextOrEmpty((result as Record<string, unknown>).eventId) ||
    ""
  );
}

function getCommandRunId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.run_record_id) ||
    toTextOrEmpty(command.linked_run) ||
    toTextOrEmpty(input.run_record_id) ||
    toTextOrEmpty((input as Record<string, unknown>).runRecordId) ||
    toTextOrEmpty(input.run_id) ||
    toTextOrEmpty((input as Record<string, unknown>).runId) ||
    toTextOrEmpty(result.run_record_id) ||
    toTextOrEmpty((result as Record<string, unknown>).runRecordId) ||
    toTextOrEmpty(result.run_id) ||
    toTextOrEmpty((result as Record<string, unknown>).runId) ||
    "—"
  );
}

function getCommandParentId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.parent_command_id) ||
    toTextOrEmpty(input.parent_command_id) ||
    toTextOrEmpty((input as Record<string, unknown>).parentCommandId) ||
    toTextOrEmpty(result.parent_command_id) ||
    toTextOrEmpty((result as Record<string, unknown>).parentCommandId) ||
    ""
  );
}

function getCommandToolKey(command: CommandItem): string {
  return toTextOrEmpty(command.tool_key);
}

function getCommandToolMode(command: CommandItem): string {
  return toTextOrEmpty(command.tool_mode);
}

function getCommandCreatedAt(command: CommandItem): string {
  return toTextOrEmpty(command.created_at);
}

function getCommandStartedAt(command: CommandItem): string {
  return toTextOrEmpty(command.started_at);
}

function getCommandFinishedAt(command: CommandItem): string {
  return toTextOrEmpty(command.finished_at);
}

function getCommandError(command: CommandItem): string {
  return toTextOrEmpty(command.error);
}

function getCommandSummaryLine(command: CommandItem): string {
  return [
    humanStatusLabel(getCommandStatus(command)),
    cleanCapabilityLabel(getCommandCapability(command)),
    getCommandWorkspace(command),
  ].join(" · ");
}

function commandMatchesFlowFilters(
  command: CommandItem,
  filters: {
    flowId: string;
    rootEventId: string;
    sourceEventId: string;
  }
) {
  const commandValues = [
    getCommandFlowId(command),
    getCommandRootEventId(command),
    getCommandSourceEventId(command),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const filterValues = [filters.flowId, filters.rootEventId, filters.sourceEventId]
    .map((value) => value.trim())
    .filter(Boolean);

  if (filterValues.length === 0) return true;

  return filterValues.some((filterValue) => commandValues.includes(filterValue));
}

function getBackToFlowsHref(
  filters: {
    flowId: string;
    rootEventId: string;
    sourceEventId: string;
  },
  workspaceId: string
) {
  if (filters.flowId) {
    return buildHref(`/flows/${encodeURIComponent(filters.flowId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  if (filters.rootEventId) {
    return buildHref(`/flows/${encodeURIComponent(filters.rootEventId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  if (filters.sourceEventId) {
    return buildHref(`/flows/${encodeURIComponent(filters.sourceEventId)}`, {
      workspace_id: workspaceId || undefined,
    });
  }

  return buildHref("/flows", {
    workspace_id: workspaceId || undefined,
  });
}

function getCommandStatusBucket(command: CommandItem) {
  const normalized = normalizeText(getCommandStatus(command));

  if (["queued", "queue", "pending", "new"].includes(normalized)) return "queued";
  if (["running", "processing"].includes(normalized)) return "running";
  if (["retry", "retriable"].includes(normalized)) return "retry";
  if (["error", "failed", "dead", "blocked"].includes(normalized)) return "failed";
  if (
    ["processed", "done", "success", "completed", "resolved"].includes(
      normalized
    )
  ) {
    return "done";
  }

  return "other";
}

function getCommandStatusBadgeKind(command: CommandItem): StatusKind {
  const bucket = getCommandStatusBucket(command);

  if (bucket === "queued") return "queued";
  if (bucket === "running") return "running";
  if (bucket === "retry") return "retry";
  if (bucket === "failed") return "failed";
  if (bucket === "done") return "success";
  return "unknown";
}

function getCommandPriority(command: CommandItem): number {
  const bucket = getCommandStatusBucket(command);

  if (bucket === "running") return 0;
  if (bucket === "retry") return 1;
  if (bucket === "failed") return 2;
  if (bucket === "queued") return 3;
  if (bucket === "done") return 4;
  return 5;
}

function getCommandTimestamp(command: CommandItem): number {
  const value =
    getCommandFinishedAt(command) ||
    getCommandStartedAt(command) ||
    getCommandCreatedAt(command);

  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCommandPeriodKey(command: CommandItem): string {
  const raw =
    getCommandFinishedAt(command) ||
    getCommandStartedAt(command) ||
    getCommandCreatedAt(command);

  if (!raw) return "";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 7);
}

function parseCommandFilters(
  searchParams?: Record<string, string | string[] | undefined>
): CommandFilters {
  const bucket = normalizeText(firstParam(searchParams?.bucket));
  const capability = normalizeText(firstParam(searchParams?.capability));
  const workspaceId = firstParam(searchParams?.workspace_id).trim();
  const periodKey = firstParam(searchParams?.period_key).trim();
  const rawLimit = Number.parseInt(firstParam(searchParams?.limit), 10);

  const allowedBuckets = new Set([
    "",
    "queued",
    "running",
    "retry",
    "failed",
    "done",
    "other",
  ]);

  return {
    bucket: allowedBuckets.has(bucket) ? bucket : "",
    capability,
    workspace_id: workspaceId,
    period_key: periodKey,
    limit: Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 20,
  };
}

function commandMatchesCommandFilters(
  command: CommandItem,
  filters: CommandFilters
) {
  if (filters.bucket && getCommandStatusBucket(command) !== filters.bucket) {
    return false;
  }

  if (filters.capability) {
    const capability = normalizeText(getCommandCapability(command));
    if (!capability.includes(normalizeText(filters.capability))) return false;
  }

  if (filters.workspace_id) {
    const workspace = normalizeText(getCommandWorkspace(command));
    if (!workspace.includes(normalizeText(filters.workspace_id))) return false;
  }

  if (filters.period_key) {
    if (getCommandPeriodKey(command) !== filters.period_key) return false;
  }

  return true;
}

function sortCommands(items: CommandItem[]) {
  return [...items].sort((a, b) => {
    const priorityDiff = getCommandPriority(a) - getCommandPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return getCommandTimestamp(b) - getCommandTimestamp(a);
  });
}

function sortDoneCommands(items: CommandItem[]) {
  return [...items].sort((a, b) => getCommandTimestamp(b) - getCommandTimestamp(a));
}

function sortOtherCommands(items: CommandItem[]) {
  return [...items].sort((a, b) => getCommandTimestamp(b) - getCommandTimestamp(a));
}

function StatusBadge({
  kind,
  label,
}: {
  kind: StatusKind;
  label: string;
}) {
  const className =
    kind === "queued"
      ? "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300"
      : kind === "running"
        ? "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300"
        : kind === "retry"
          ? "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300"
          : kind === "failed"
            ? "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300"
            : kind === "success"
              ? "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300"
              : "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";

  return <span className={className}>{label}</span>;
}

function SectionCountPill({
  value,
  tone = "default",
}: {
  value: number;
  tone?: CountTone;
}) {
  const className =
    tone === "info"
      ? "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300"
      : tone === "success"
        ? "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300"
        : tone === "warning"
          ? "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300"
          : tone === "danger"
            ? "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300"
            : tone === "muted"
              ? "inline-flex rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-medium text-zinc-400"
              : "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";

  return <span className={className}>{value}</span>;
}

function EmptyStatePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-8">
      <div className="text-lg font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-zinc-400">{description}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: number;
  toneClass: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div
        className={`mt-2 text-3xl font-semibold tracking-tight md:mt-3 md:text-4xl ${toneClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  description,
  count,
  countTone = "default",
  children,
}: {
  title: string;
  description: string;
  count: number;
  countTone?: CountTone;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className={sectionLabelClassName()}>{title}</div>
          <SectionCountPill value={count} tone={countTone} />
        </div>
        <p className="max-w-3xl text-base text-zinc-400">{description}</p>
      </div>

      {children}
    </section>
  );
}

function SignalMiniStat({
  label,
  value,
  toneClass = "text-white",
}: {
  label: string;
  value: string;
  toneClass?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function HeroActionCard({
  href,
  title,
  description,
  tone = "default",
}: {
  href: string;
  title: string;
  description: string;
  tone?: "default" | "danger" | "primary";
}) {
  const className =
    tone === "danger"
      ? "rounded-[22px] border border-rose-500/20 bg-rose-500/8 p-4 transition hover:bg-rose-500/12"
      : tone === "primary"
        ? "rounded-[22px] border border-emerald-500/20 bg-emerald-500/8 p-4 transition hover:bg-emerald-500/12"
        : "rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:bg-white/[0.04]";

  return (
    <Link href={href} className={className}>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{description}</div>
    </Link>
  );
}

function CommandCard({
  command,
  activeWorkspaceId,
}: {
  command: CommandItem;
  activeWorkspaceId: string;
}) {
  const id = String(command.id || "");
  const title = getCommandTitle(command);
  const status = getCommandStatus(command);
  const capability = getCommandCapability(command);
  const workspace = getCommandWorkspace(command);
  const flowId = getCommandFlowId(command);
  const rootEventId = getCommandRootEventId(command);
  const sourceEventId = getCommandSourceEventId(command);
  const runId = getCommandRunId(command);
  const parentId = getCommandParentId(command);
  const toolKey = getCommandToolKey(command);
  const toolMode = getCommandToolMode(command);
  const errorText = getCommandError(command);

  const detailHref = buildHref(`/commands/${encodeURIComponent(id)}`, {
    workspace_id: activeWorkspaceId || undefined,
    flow_id: flowId || undefined,
    root_event_id: rootEventId || undefined,
    source_event_id: sourceEventId || undefined,
    from: "commands",
  });

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>BOSAI Command</div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Link
                  href={detailHref}
                  className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
                >
                  {title}
                </Link>

                <div className="mt-2 text-sm text-zinc-400">
                  {getCommandSummaryLine(command)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  kind={getCommandStatusBadgeKind(command)}
                  label={humanStatusLabel(status).toUpperCase()}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={neutralPillClassName()}>
                {cleanCapabilityLabel(capability)}
              </span>

              {toolKey ? (
                <span className={neutralPillClassName()}>TOOL {toolKey}</span>
              ) : null}

              {toolMode ? (
                <span className={neutralPillClassName()}>MODE {toolMode}</span>
              ) : null}

              <span className={neutralPillClassName()}>{workspace}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Created</div>
            <div className="mt-2 text-zinc-100">
              {formatDate(getCommandCreatedAt(command))}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Finished</div>
            <div className="mt-2 text-zinc-100">
              {formatDate(getCommandFinishedAt(command))}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Run</div>
            <div className="mt-2 break-all text-zinc-100">{runId}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Parent</div>
            <div className="mt-2 break-all text-zinc-100">{parentId || "—"}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-2 break-all text-zinc-100">{flowId || "—"}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Root event</div>
            <div className="mt-2 break-all text-zinc-100">{rootEventId || "—"}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Source event</div>
            <div className="mt-2 break-all text-zinc-100">{sourceEventId || "—"}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Error</div>
            <div className="mt-2 break-all text-zinc-100">{errorText || "—"}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>ID</div>
            <div className="mt-2 break-all text-zinc-100">{id}</div>
          </div>
        </div>

        <div className="space-y-3">
          <Link href={detailHref} className={actionLinkClassName("primary")}>
            Ouvrir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function CommandsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const flowId = firstParam(resolvedSearchParams.flow_id).trim();
  const rootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const sourceEventId = firstParam(resolvedSearchParams.source_event_id).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  const commandFilters = parseCommandFilters(resolvedSearchParams);
  const activeWorkspaceId = commandFilters.workspace_id;

  let data: CommandsResponse | null = null;
  let fetchFailed = false;

  try {
    data = await fetchCommands({
      limit: 300,
      workspaceId: activeWorkspaceId || undefined,
    });
  } catch {
    data = null;
    fetchFailed = true;
  }

  const commands: CommandItem[] = Array.isArray(data?.commands)
    ? data.commands
    : [];

  const hasFlowFilters = Boolean(flowId || rootEventId || sourceEventId);

  const flowVisibleCommands = hasFlowFilters
    ? commands.filter((command) =>
        commandMatchesFlowFilters(command, {
          flowId,
          rootEventId,
          sourceEventId,
        })
      )
    : commands;

  const matchingCommands = flowVisibleCommands.filter((command) =>
    commandMatchesCommandFilters(command, commandFilters)
  );

  const queuedCommandsAll = matchingCommands.filter(
    (item) => getCommandStatusBucket(item) === "queued"
  );

  const runningCommandsAll = matchingCommands.filter(
    (item) => getCommandStatusBucket(item) === "running"
  );

  const retryCommandsAll = matchingCommands.filter(
    (item) => getCommandStatusBucket(item) === "retry"
  );

  const failedCommandsAll = matchingCommands.filter(
    (item) => getCommandStatusBucket(item) === "failed"
  );

  const doneCommandsAll = matchingCommands.filter(
    (item) => getCommandStatusBucket(item) === "done"
  );

  const otherCommandsAll = matchingCommands.filter(
    (item) => getCommandStatusBucket(item) === "other"
  );

  const needsAttentionAll = sortCommands(
    matchingCommands.filter((item) =>
      ["queued", "running", "retry", "failed"].includes(
        getCommandStatusBucket(item)
      )
    )
  );

  const completedAll = sortDoneCommands(doneCommandsAll);
  const otherAll = sortOtherCommands(otherCommandsAll);

  let remaining = commandFilters.limit;
  const needsAttentionCommands = needsAttentionAll.slice(0, remaining);
  remaining = Math.max(0, remaining - needsAttentionCommands.length);

  const completedCommands = completedAll.slice(0, remaining);
  remaining = Math.max(0, remaining - completedCommands.length);

  const otherCommands = otherAll.slice(0, remaining);

  const displayedCount =
    needsAttentionCommands.length +
    completedCommands.length +
    otherCommands.length;

  const backToFlowsHref =
    from === "flows" || from === "flow_detail"
      ? getBackToFlowsHref(
          { flowId, rootEventId, sourceEventId },
          activeWorkspaceId
        )
      : buildHref("/flows", {
          workspace_id: activeWorkspaceId || undefined,
        });

  const flowsHref = buildHref("/flows", {
    workspace_id: activeWorkspaceId || undefined,
  });

  const runsHref = buildHref("/runs", {
    workspace_id: activeWorkspaceId || undefined,
  });

  const overviewHref = buildHref("/", {
    workspace_id: activeWorkspaceId || undefined,
  });

  const allCommandsHref = buildHref("/commands", {
    workspace_id: activeWorkspaceId || undefined,
  });

  const hasDisplayLimit = matchingCommands.length > displayedCount;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

          <div className="mt-5">
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Commands
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-400">
              Vue de la file d’exécution BOSAI pour suivre les commands, leur statut,
              leur liaison au flow et leur détail opérationnel.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <HeroActionCard
              href={flowsHref}
              title="Ouvrir Flows"
              description="Lire les chaînes liées aux commands et remonter aux flows."
            />
            <HeroActionCard
              href={runsHref}
              title="Voir Runs"
              description="Comparer l’activité commands avec les runs observés."
            />
            <div className="sm:col-span-2">
              <HeroActionCard
                href={overviewHref}
                title="Retour Overview"
                description="Revenir au cockpit principal et aux signaux prioritaires."
                tone="primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className={sectionLabelClassName()}>Queue summary</div>

          <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Commands visibles
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            Lecture rapide de la file actuelle selon les filtres actifs.
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SignalMiniStat
              label="Queued"
              value={String(queuedCommandsAll.length)}
              toneClass="text-amber-300"
            />
            <SignalMiniStat
              label="Running"
              value={String(runningCommandsAll.length)}
              toneClass="text-sky-300"
            />
            <SignalMiniStat
              label="Failed"
              value={String(failedCommandsAll.length)}
              toneClass="text-red-300"
            />
            <SignalMiniStat
              label="Done"
              value={String(doneCommandsAll.length)}
              toneClass="text-emerald-300"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className={compactCardClassName()}>
              <div className={metaLabelClassName()}>Workspace scope</div>
              <div className="mt-2 break-all text-sm text-zinc-100">
                {activeWorkspaceId || "all"}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={metaLabelClassName()}>Matching records</div>
              <div className="mt-2 text-sm text-zinc-100">
                {matchingCommands.length}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={metaLabelClassName()}>Displayed</div>
              <div className="mt-2 text-sm text-zinc-100">
                {displayedCount}
                {hasDisplayLimit ? ` / ${matchingCommands.length}` : ""}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3.5">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-400">
              {failedCommandsAll.length > 0 || retryCommandsAll.length > 0
                ? "Priorité : ouvrir les commands en échec ou en retry."
                : runningCommandsAll.length > 0 || queuedCommandsAll.length > 0
                  ? "Priorité : suivre la file active et les commands en cours."
                  : "La file visible est principalement stable ou terminée."}
            </div>
          </div>
        </div>
      </section>

      {hasFlowFilters ? (
        <section className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-5 md:p-6">
          <div className="mb-4 text-lg font-medium text-emerald-200">
            Filtré depuis Flows
          </div>

          <div className="flex flex-wrap gap-3">
            {flowId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                flow_id: {flowId}
              </span>
            ) : null}

            {rootEventId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                root_event_id: {rootEventId}
              </span>
            ) : null}

            {sourceEventId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                source_event_id: {sourceEventId}
              </span>
            ) : null}

            {activeWorkspaceId ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200">
                workspace_id: {activeWorkspaceId}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
              Retour aux flows
            </Link>

            <Link href={allCommandsHref} className={actionLinkClassName("primary")}>
              Voir toutes les commands
            </Link>
          </div>
        </section>
      ) : null}

      <CommandsFilters
        initialFilters={commandFilters}
        preservedParams={{
          flow_id: flowId,
          root_event_id: rootEventId,
          source_event_id: sourceEventId,
          from,
        }}
      />

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <StatCard
          label="Queued"
          value={queuedCommandsAll.length}
          toneClass="text-amber-300"
        />
        <StatCard
          label="Running"
          value={runningCommandsAll.length}
          toneClass="text-sky-300"
        />
        <StatCard
          label="Retry"
          value={retryCommandsAll.length}
          toneClass="text-violet-300"
        />
        <StatCard
          label="Failed"
          value={failedCommandsAll.length}
          toneClass="text-red-300"
        />
        <StatCard
          label="Done"
          value={doneCommandsAll.length}
          toneClass="text-emerald-300"
        />
      </section>

      {fetchFailed ? (
        <EmptyStatePanel
          title="Lecture Commands indisponible"
          description="Le Dashboard n’a pas pu charger la surface Commands. La vue est protégée, mais il faut vérifier la lecture API côté worker / helper."
        />
      ) : matchingCommands.length === 0 ? (
        <EmptyStatePanel
          title="Aucune command visible"
          description="Le Dashboard n’a remonté aucune command sur la vue actuelle."
        />
      ) : (
        <div className="space-y-8">
          <SectionBlock
            title="Needs attention"
            description="Commands à surveiller en priorité : en file, en cours, en retry ou en échec."
            count={needsAttentionAll.length}
            countTone="warning"
          >
            {needsAttentionCommands.length === 0 ? (
              <EmptyStatePanel
                title="Aucune command active"
                description="Aucune command en file, en cours, en retry ou en échec n’est visible pour le moment."
              />
            ) : (
              <div className="space-y-4">
                {needsAttentionCommands.map((command) => (
                  <CommandCard
                    key={String(command.id)}
                    command={command}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Completed commands"
            description="Historique des commands terminées avec succès, triées de la plus récente à la plus ancienne."
            count={completedAll.length}
            countTone="success"
          >
            {completedCommands.length === 0 ? (
              <EmptyStatePanel
                title="Aucune command terminée"
                description="Aucune command terminée avec succès n’est visible sur cette vue pour le moment."
              />
            ) : (
              <div className="space-y-4">
                {completedCommands.map((command) => (
                  <CommandCard
                    key={String(command.id)}
                    command={command}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            )}
          </SectionBlock>

          {otherAll.length > 0 ? (
            <SectionBlock
              title="Other commands"
              description="Commands visibles avec un statut non standard ou non classé."
              count={otherAll.length}
              countTone="muted"
            >
              {otherCommands.length === 0 ? (
                <EmptyStatePanel
                  title="Aucune command additionnelle affichée"
                  description="Des commands non standard existent, mais elles ne sont pas affichées dans la limite actuelle."
                />
              ) : (
                <div className="space-y-4">
                  {otherCommands.map((command) => (
                    <CommandCard
                      key={String(command.id)}
                      command={command}
                      activeWorkspaceId={activeWorkspaceId}
                    />
                  ))}
                </div>
              )}
            </SectionBlock>
          ) : null}
        </div>
      )}
    </div>
  );
}
