import Link from "next/link";
import type { ReactNode } from "react";
import {
  fetchCommands,
  type CommandItem,
  type CommandsResponse,
} from "@/lib/api";
import { CommandsFilters } from "./commands-filters";

type PageProps = {
  searchParams?: Promise<{
    flow_id?: string | string[];
    root_event_id?: string | string[];
    source_event_id?: string | string[];
    from?: string | string[];
    bucket?: string | string[];
    capability?: string | string[];
    workspace_id?: string | string[];
    period_key?: string | string[];
    limit?: string | string[];
  }>;
};

type CommandFilters = {
  bucket: string;
  capability: string;
  workspace_id: string;
  period_key: string;
  limit: number;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function emptyStateClassName() {
  return "rounded-[28px] border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.22em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
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

function tone(status?: string): string {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["running", "processing"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["ignored"].includes(normalized)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function humanStatusLabel(status?: string): string {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "Succès";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
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
    toTextOrEmpty(input.workspaceId) ||
    toTextOrEmpty(result.workspace_id) ||
    toTextOrEmpty(result.workspaceId) ||
    "—"
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.flow_id) ||
    toTextOrEmpty(input.flow_id) ||
    toTextOrEmpty(input.flowId) ||
    toTextOrEmpty(result.flow_id) ||
    toTextOrEmpty(result.flowId) ||
    ""
  );
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.root_event_id) ||
    toTextOrEmpty(input.root_event_id) ||
    toTextOrEmpty(input.rootEventId) ||
    toTextOrEmpty(result.root_event_id) ||
    toTextOrEmpty(result.rootEventId) ||
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
    toTextOrEmpty(input.sourceEventId) ||
    toTextOrEmpty(input.event_id) ||
    toTextOrEmpty(input.eventId) ||
    toTextOrEmpty(result.source_event_id) ||
    toTextOrEmpty(result.sourceEventId) ||
    toTextOrEmpty(result.event_id) ||
    toTextOrEmpty(result.eventId) ||
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
    toTextOrEmpty(input.runRecordId) ||
    toTextOrEmpty(input.run_id) ||
    toTextOrEmpty(input.runId) ||
    toTextOrEmpty(result.run_record_id) ||
    toTextOrEmpty(result.runRecordId) ||
    toTextOrEmpty(result.run_id) ||
    toTextOrEmpty(result.runId) ||
    "—"
  );
}

function getCommandParentId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.parent_command_id) ||
    toTextOrEmpty(input.parent_command_id) ||
    toTextOrEmpty(input.parentCommandId) ||
    toTextOrEmpty(result.parent_command_id) ||
    toTextOrEmpty(result.parentCommandId) ||
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

function getBackToFlowsHref(filters: {
  flowId: string;
  rootEventId: string;
  sourceEventId: string;
}) {
  if (filters.flowId) {
    return `/flows/${encodeURIComponent(filters.flowId)}`;
  }

  if (filters.rootEventId) {
    return `/flows/${encodeURIComponent(filters.rootEventId)}`;
  }

  if (filters.sourceEventId) {
    return `/flows/${encodeURIComponent(filters.sourceEventId)}`;
  }

  return "/flows";
}

function getCommandStatusBucket(command: CommandItem) {
  const normalized = getCommandStatus(command).toLowerCase();

  if (["queued", "pending", "new"].includes(normalized)) return "queued";
  if (["running", "processing"].includes(normalized)) return "running";
  if (["retry", "retriable"].includes(normalized)) return "retry";
  if (["error", "failed", "dead", "blocked"].includes(normalized)) return "failed";
  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "done";
  }

  return "other";
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
  return new Date(
    getCommandFinishedAt(command) ||
      getCommandStartedAt(command) ||
      getCommandCreatedAt(command) ||
      0
  ).getTime();
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
  const bucket = firstParam(searchParams?.bucket).trim().toLowerCase();
  const capability = firstParam(searchParams?.capability).trim().toLowerCase();
  const workspaceId = firstParam(searchParams?.workspace_id).trim().toLowerCase();
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
    const capability = getCommandCapability(command).toLowerCase();
    if (!capability.includes(filters.capability)) return false;
  }

  if (filters.workspace_id) {
    const workspace = getCommandWorkspace(command).toLowerCase();
    if (!workspace.includes(filters.workspace_id)) return false;
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
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className={sectionLabelClassName()}>{title}</div>
          <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
            {count}
          </span>
        </div>
        <p className="max-w-3xl text-base text-zinc-400">{description}</p>
      </div>

      {children}
    </section>
  );
}

function CommandCard({ command }: { command: CommandItem }) {
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

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>BOSAI Command</div>

          <div className="space-y-3">
            <Link
              href={`/commands/${encodeURIComponent(id)}`}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {title}
            </Link>

            <div className="text-sm text-zinc-400">{getCommandSummaryLine(command)}</div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                  status
                )}`}
              >
                {humanStatusLabel(status).toUpperCase()}
              </span>

              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                {cleanCapabilityLabel(capability)}
              </span>

              {toolKey ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                  TOOL {toolKey}
                </span>
              ) : null}

              {toolMode ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                  MODE {toolMode}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              Workspace: <span className="text-zinc-300">{workspace}</span>
            </div>
            <div>
              Run: <span className="text-zinc-300">{runId}</span>
            </div>
            <div className="hidden md:block">
              Parent: <span className="text-zinc-300">{parentId || "—"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <div className={metaLabelClassName()}>ID</div>
            <div className="mt-1 break-all text-zinc-200">{id}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Created</div>
            <div className="mt-1 text-zinc-200">
              {formatDate(getCommandCreatedAt(command))}
            </div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Finished</div>
            <div className="mt-1 text-zinc-200">
              {formatDate(getCommandFinishedAt(command))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-1 break-all text-zinc-200">{flowId || "—"}</div>
          </div>

          <div className="hidden md:block">
            <div className={metaLabelClassName()}>Root event</div>
            <div className="mt-1 break-all text-zinc-200">{rootEventId || "—"}</div>
          </div>

          <div className="hidden md:block">
            <div className={metaLabelClassName()}>Source event</div>
            <div className="mt-1 break-all text-zinc-200">{sourceEventId || "—"}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Error</div>
            <div className="mt-1 break-all text-zinc-200">{errorText || "—"}</div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href={`/commands/${encodeURIComponent(id)}`}
            className={actionLinkClassName("primary")}
          >
            Ouvrir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function CommandsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const flowId = firstParam(resolvedSearchParams.flow_id).trim();
  const rootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const sourceEventId = firstParam(resolvedSearchParams.source_event_id).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  const commandFilters = parseCommandFilters(resolvedSearchParams);

  let data: CommandsResponse | null = null;

  try {
    data = await fetchCommands(300);
  } catch {
    data = null;
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

  const visibleCommands = flowVisibleCommands
    .filter((command) => commandMatchesCommandFilters(command, commandFilters))
    .slice(0, commandFilters.limit);

  const queuedCommands = visibleCommands.filter(
    (item) => getCommandStatusBucket(item) === "queued"
  );

  const runningCommands = visibleCommands.filter(
    (item) => getCommandStatusBucket(item) === "running"
  );

  const retryCommands = visibleCommands.filter(
    (item) => getCommandStatusBucket(item) === "retry"
  );

  const failedCommands = visibleCommands.filter(
    (item) => getCommandStatusBucket(item) === "failed"
  );

  const doneCommands = visibleCommands.filter(
    (item) => getCommandStatusBucket(item) === "done"
  );

  const needsAttentionCommands = sortCommands(
    visibleCommands.filter((item) =>
      ["queued", "running", "retry", "failed"].includes(getCommandStatusBucket(item))
    )
  );

  const completedCommands = sortDoneCommands(doneCommands);

  const backToFlowsHref =
    from === "flows" || from === "flow_detail"
      ? getBackToFlowsHref({ flowId, rootEventId, sourceEventId })
      : "/flows";

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Commands
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Vue de la file d’exécution BOSAI. Cette page permet de suivre les
            commands, leur statut, leur liaison au flow, et leur détail.
          </p>
        </div>
      </section>

      {hasFlowFilters ? (
        <section className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 md:p-6">
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
          </div>

          <div className="mt-5 space-y-3">
            <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
              Retour aux flows
            </Link>

            <Link href="/commands" className={actionLinkClassName("primary")}>
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
          value={queuedCommands.length}
          toneClass="text-amber-300"
        />
        <StatCard
          label="Running"
          value={runningCommands.length}
          toneClass="text-sky-300"
        />
        <StatCard
          label="Retry"
          value={retryCommands.length}
          toneClass="text-violet-300"
        />
        <StatCard
          label="Failed"
          value={failedCommands.length}
          toneClass="text-red-300"
        />
        <StatCard
          label="Done"
          value={doneCommands.length}
          toneClass="text-emerald-300"
        />
      </section>

      {visibleCommands.length === 0 ? (
        <section className={emptyStateClassName()}>
          Aucune command visible pour le moment.
        </section>
      ) : (
        <div className="space-y-8">
          <SectionBlock
            title="Needs attention"
            description="Commands à surveiller en priorité : en file, en cours, en retry ou en échec."
            count={needsAttentionCommands.length}
          >
            {needsAttentionCommands.length === 0 ? (
              <div className={emptyStateClassName()}>Aucune command active.</div>
            ) : (
              <div className="space-y-4">
                {needsAttentionCommands.map((command) => (
                  <CommandCard key={String(command.id)} command={command} />
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Completed commands"
            description="Historique des commands terminées avec succès, triées de la plus récente à la plus ancienne."
            count={completedCommands.length}
          >
            {completedCommands.length === 0 ? (
              <div className={emptyStateClassName()}>
                Aucune command terminée.
              </div>
            ) : (
              <div className="space-y-4">
                {completedCommands.map((command) => (
                  <CommandCard key={String(command.id)} command={command} />
                ))}
              </div>
            )}
          </SectionBlock>
        </div>
      )}
    </div>
  );
}
