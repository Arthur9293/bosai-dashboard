import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
  SectionCountPill,
  EmptyStatePanel,
} from "@/components/dashboard/ControlPlaneShell";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
import {
  appendWorkspaceIdToHref,
  resolveWorkspaceContext,
  workspaceMatchesOrUnscoped,
} from "@/lib/workspace";

type SearchParams = {
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_record_id?: string | string[];
  from?: string | string[];
  workspace_id?: string | string[];
  workspaceId?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function chipClassName(): string {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName(): string {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function safeUpper(text: string): string {
  return text.trim() ? text.trim().toUpperCase() : "—";
}

function getIncidentTitle(incident: IncidentItem): string {
  return (
    incident.title || incident.name || incident.error_id || "Untitled incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem): string {
  return (incident.status || incident.statut_incident || "").trim();
}

function getIncidentSeverityRaw(incident: IncidentItem): string {
  return (incident.severity || "").trim();
}

function getIncidentWorkspaceId(incident: IncidentItem): string {
  return incident.workspace_id || incident.workspace || "";
}

function getIncidentStatusNormalized(incident: IncidentItem): string {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = (incident.sla_status || "").trim().toLowerCase();
  const hasResolvedAt = Boolean(incident.resolved_at);

  if (hasResolvedAt) return "resolved";

  if (!raw) {
    if (sla === "breached") return "open";
    return "open";
  }

  if (["open", "opened", "new", "active", "en cours"].includes(raw)) {
    return "open";
  }

  if (["escalated", "escalade", "escaladé"].includes(raw)) {
    return "escalated";
  }

  if (["resolved", "closed", "done", "résolu", "resolve"].includes(raw)) {
    return "resolved";
  }

  return raw;
}

function getIncidentStatusLabel(incident: IncidentItem): string {
  const normalized = getIncidentStatusNormalized(incident);

  if (normalized === "open") return "OPEN";
  if (normalized === "escalated") return "ESCALATED";
  if (normalized === "resolved") return "RESOLVED";

  const raw = getIncidentStatusRaw(incident);
  return raw ? raw.toUpperCase() : "OPEN";
}

function getIncidentSeverityNormalized(incident: IncidentItem): string {
  const raw = getIncidentSeverityRaw(incident).toLowerCase();

  if (!raw) {
    if ((incident.sla_status || "").toLowerCase() === "breached") {
      return "critical";
    }
    return "unknown";
  }

  if (["critical", "critique"].includes(raw)) return "critical";
  if (["high", "élevé", "eleve"].includes(raw)) return "high";
  if (["warning", "warn", "medium", "moyen"].includes(raw)) return "medium";
  if (["low", "faible"].includes(raw)) return "low";

  return raw;
}

function getIncidentSeverityLabel(incident: IncidentItem): string {
  const normalized = getIncidentSeverityNormalized(incident);

  if (normalized === "critical") return "CRITICAL";
  if (normalized === "high") return "HIGH";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "low") return "LOW";

  const raw = getIncidentSeverityRaw(incident);
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

function getDecisionStatus(incident: IncidentItem): string {
  return toText(incident.decision_status, "");
}

function getDecisionReason(incident: IncidentItem): string {
  return toText(incident.decision_reason, "");
}

function getNextAction(incident: IncidentItem): string {
  return toText(incident.next_action, "");
}

function getPriorityScore(incident: IncidentItem): number {
  return toNumber(incident.priority_score, 0);
}

function getSlaLabel(incident: IncidentItem): string {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "RESOLVED";

  const sla = (incident.sla_status || "").trim();
  if (sla) return sla.toUpperCase();

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "BREACHED";
  }

  return "—";
}

function getOpenedAt(incident: IncidentItem): string | undefined {
  return incident.opened_at || incident.created_at;
}

function getUpdatedAt(incident: IncidentItem): string | undefined {
  return incident.updated_at || incident.created_at;
}

function getResolvedAt(incident: IncidentItem): string | undefined {
  if (incident.resolved_at) return incident.resolved_at;

  if (getIncidentStatusNormalized(incident) === "resolved") {
    return incident.updated_at || incident.created_at;
  }

  return undefined;
}

function getWorkspace(incident: IncidentItem): string {
  return incident.workspace_id || incident.workspace || "—";
}

function getRunRecord(incident: IncidentItem): string {
  return incident.run_record_id || incident.linked_run || incident.run_id || "—";
}

function getCommandRecord(incident: IncidentItem): string {
  return incident.command_id || incident.linked_command || "—";
}

function getFlowId(incident: IncidentItem): string {
  return toTextOrEmpty(incident.flow_id);
}

function getRootEventId(incident: IncidentItem): string {
  return toTextOrEmpty(incident.root_event_id);
}

function getSourceRecordId(incident: IncidentItem): string {
  return toTextOrEmpty(
    (incident as Record<string, unknown>).source_record_id
  );
}

function getCategory(incident: IncidentItem): string {
  return incident.category || "—";
}

function getReason(incident: IncidentItem): string {
  return incident.reason || "—";
}

function getSuggestedAction(incident: IncidentItem): string {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated") return "Review escalated incident";
  if (severity === "critical") return "Prioritize immediate review";
  if ((incident.sla_status || "").toLowerCase() === "breached") {
    return "Review SLA breach";
  }
  if (status === "resolved") return "Verify final resolution state";

  return "Monitor flow and resolution";
}

function getSummaryLine(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);

  return `${safeUpper(status)} · ${safeUpper(severity)} · ${workspace} · ${category}`;
}

function getActivePriority(incident: IncidentItem): number {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated" && severity === "critical") return 0;
  if (status === "escalated") return 1;
  if (severity === "critical") return 2;
  if (severity === "high") return 3;
  if (status === "open") return 4;
  return 5;
}

function getIncidentTimestampForSort(incident: IncidentItem): number {
  return new Date(
    getUpdatedAt(incident) || getOpenedAt(incident) || getResolvedAt(incident) || 0
  ).getTime();
}

function sortActiveIncidents(items: IncidentItem[]): IncidentItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = getActivePriority(a) - getActivePriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return getIncidentTimestampForSort(b) - getIncidentTimestampForSort(a);
  });
}

function sortResolvedIncidents(items: IncidentItem[]): IncidentItem[] {
  return [...items].sort((a, b) => {
    const aTs = new Date(
      getResolvedAt(a) || getUpdatedAt(a) || getOpenedAt(a) || 0
    ).getTime();
    const bTs = new Date(
      getResolvedAt(b) || getUpdatedAt(b) || getOpenedAt(b) || 0
    ).getTime();

    return bTs - aTs;
  });
}

function isLegacyNoiseIncident(incident: IncidentItem): boolean {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = getCategory(incident).trim().toLowerCase();
  const reason = getReason(incident).trim().toLowerCase();
  const errorId = (incident.error_id || "").trim();
  const resolutionNote = (incident.resolution_note || "").trim();
  const lastAction = (incident.last_action || "").trim();
  const flowId = getFlowId(incident);
  const rootEventId = getRootEventId(incident);
  const sourceRecordId = getSourceRecordId(incident);
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);

  const isGenericTitle = title === "incident" || title === "untitled incident";
  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";
  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const hasNoLinking =
    flowId === "" &&
    rootEventId === "" &&
    sourceRecordId === "" &&
    (commandRecord === "" || commandRecord === "—") &&
    (runRecord === "" || runRecord === "—");

  const hasStrongBusinessSignal =
    errorId !== "" ||
    resolutionNote !== "" ||
    lastAction !== "" ||
    category === "http_failure" ||
    reason === "http_5xx_exhausted" ||
    reason === "http_status_error" ||
    reason === "forbidden_host" ||
    !hasNoLinking;

  return (
    isGenericTitle &&
    isGenericCategory &&
    isGenericReason &&
    !hasStrongBusinessSignal
  );
}

function incidentMatchesFilters(
  incident: IncidentItem,
  filters: {
    flowId: string;
    rootEventId: string;
    sourceRecordId: string;
  }
): boolean {
  const filterValues = [filters.flowId, filters.rootEventId, filters.sourceRecordId]
    .map((value) => value.trim())
    .filter(Boolean);

  if (filterValues.length === 0) return true;

  const incidentValues = [
    getFlowId(incident),
    getRootEventId(incident),
    getSourceRecordId(incident),
    getCommandRecord(incident),
    getRunRecord(incident),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  return filterValues.some((filterValue) => incidentValues.includes(filterValue));
}

function getBestFlowTargetFromIncident(incident: IncidentItem): string {
  return (
    getFlowId(incident) ||
    getSourceRecordId(incident) ||
    getRootEventId(incident) ||
    ""
  );
}

function getBestFlowTargetFromFilters(filters: {
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
}): string {
  return filters.flowId || filters.sourceRecordId || filters.rootEventId || "";
}

function getBackToFlowsHref(
  filters: {
    flowId: string;
    rootEventId: string;
    sourceRecordId: string;
  },
  activeWorkspaceId?: string
): string {
  const target = getBestFlowTargetFromFilters(filters);
  const baseHref = target ? `/flows/${encodeURIComponent(target)}` : "/flows";
  return appendWorkspaceIdToHref(baseHref, activeWorkspaceId);
}

function getIncidentStatusBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const status = getIncidentStatusNormalized(incident);

  if (status === "resolved") return "success";
  if (status === "escalated") return "retry";
  if (status === "open") return "running";
  return "unknown";
}

function getIncidentSeverityBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const severity = getIncidentSeverityNormalized(incident);

  if (severity === "critical") return "failed";
  if (severity === "high") return "failed";
  if (severity === "medium") return "retry";
  if (severity === "low") return "success";
  return "unknown";
}

function getIncidentSlaBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const resolvedLike =
    Boolean(incident.resolved_at) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "success";

  const sla = (incident.sla_status || "").toLowerCase();

  if (sla === "breached") return "failed";
  if (sla === "warning") return "retry";
  if (sla === "ok") return "success";

  if (
    typeof incident.sla_remaining_minutes === "number" &&
    incident.sla_remaining_minutes < 0
  ) {
    return "failed";
  }

  return "unknown";
}

function getDecisionBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const decision = getDecisionStatus(incident).toLowerCase();

  if (["escalate", "escalated"].includes(decision)) return "incident";
  if (["resolve", "resolved"].includes(decision)) return "success";
  if (["retry", "retriable"].includes(decision)) return "retry";
  if (decision) return "queued";
  return "unknown";
}

function getIncidentHref(
  incident: IncidentItem,
  activeWorkspaceId?: string
): string {
  return appendWorkspaceIdToHref(
    `/incidents/${encodeURIComponent(incident.id)}`,
    activeWorkspaceId || getIncidentWorkspaceId(incident)
  );
}

function getFlowHref(
  incident: IncidentItem,
  activeWorkspaceId?: string
): string {
  const flowTarget = getBestFlowTargetFromIncident(incident);
  return flowTarget
    ? appendWorkspaceIdToHref(
        `/flows/${encodeURIComponent(flowTarget)}`,
        activeWorkspaceId || getIncidentWorkspaceId(incident)
      )
    : "";
}

function getCommandHref(
  incident: IncidentItem,
  activeWorkspaceId?: string
): string {
  const commandRecord = getCommandRecord(incident);
  return commandRecord && commandRecord !== "—"
    ? appendWorkspaceIdToHref(
        `/commands/${encodeURIComponent(commandRecord)}`,
        activeWorkspaceId || getIncidentWorkspaceId(incident)
      )
    : "";
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "break-all" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function IncidentListCard({
  incident,
  activeWorkspaceId,
}: {
  incident: IncidentItem;
  activeWorkspaceId?: string;
}) {
  const title = getIncidentTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const slaLabel = getSlaLabel(incident);
  const decisionStatus = getDecisionStatus(incident);
  const flowTarget = getBestFlowTargetFromIncident(incident);
  const commandRecord = getCommandRecord(incident);
  const rootEventId = getRootEventId(incident);
  const runRecord = getRunRecord(incident);
  const suggestedAction = getSuggestedAction(incident);
  const flowHref = getFlowHref(incident, activeWorkspaceId);
  const commandHref = getCommandHref(incident, activeWorkspaceId);

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            BOSAI Incident
          </div>

          <div className="space-y-3">
            <Link
              href={getIncidentHref(incident, activeWorkspaceId)}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {title}
            </Link>

            <div className="text-sm text-zinc-400">{getSummaryLine(incident)}</div>

            <div className="flex flex-wrap items-center gap-2">
              <DashboardStatusBadge
                kind={getIncidentStatusBadgeKind(incident)}
                label={statusLabel}
              />

              <DashboardStatusBadge
                kind={getIncidentSeverityBadgeKind(incident)}
                label={severityLabel}
              />

              <DashboardStatusBadge
                kind={getIncidentSlaBadgeKind(incident)}
                label={`SLA ${slaLabel}`}
              />

              {decisionStatus ? (
                <DashboardStatusBadge
                  kind={getDecisionBadgeKind(incident)}
                  label={`DECISION ${decisionStatus.toUpperCase()}`}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Opened</div>
            <div className="mt-2 text-zinc-100">{formatDate(getOpenedAt(incident))}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Updated</div>
            <div className="mt-2 text-zinc-100">{formatDate(getUpdatedAt(incident))}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Workspace</div>
            <div className="mt-2 text-zinc-100">{getWorkspace(incident)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Category</div>
            <div className="mt-2 text-zinc-100">{getCategory(incident)}</div>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Flow"
            value={
              flowTarget && flowHref ? (
                <Link
                  href={flowHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowTarget}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <MetaItem label="Root event" value={toText(rootEventId)} breakAll />
          <MetaItem label="Run record" value={toText(runRecord)} breakAll />

          <MetaItem
            label="Command"
            value={
              commandRecord !== "—" && commandHref ? (
                <Link
                  href={commandHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {commandRecord}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <MetaItem label="Reason" value={getReason(incident)} breakAll />
          <MetaItem label="Resolved" value={formatDate(getResolvedAt(incident))} />

          <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Action suggested</div>
            <div className="mt-1 text-zinc-200">{suggestedAction}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-3 space-y-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div>
              <span className={metaLabelClassName()}>Decision</span>
              <div className="mt-1 text-purple-300">{decisionStatus || "—"}</div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Decision reason</span>
              <div className="mt-1 text-zinc-300">
                {getDecisionReason(incident) || "—"}
              </div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Next action</span>
              <div className="mt-1 text-zinc-300">{getNextAction(incident) || "—"}</div>
            </div>

            <div>
              <span className={metaLabelClassName()}>Priority score</span>
              <div className="mt-1 text-zinc-300">{getPriorityScore(incident)}</div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          <Link
            href={getIncidentHref(incident, activeWorkspaceId)}
            className={actionLinkClassName("primary")}
          >
            Ouvrir le détail
          </Link>

          {flowHref ? (
            <Link href={flowHref} className={actionLinkClassName("soft")}>
              Ouvrir le flow lié
            </Link>
          ) : null}

          {commandHref ? (
            <Link href={commandHref} className={actionLinkClassName("soft")}>
              Ouvrir la command liée
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  title,
  description,
  count,
  countTone = "default",
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  count: number;
  countTone?: "default" | "info" | "success" | "warning" | "danger" | "muted";
  tone?: "default" | "attention" | "neutral";
  children: ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      tone={tone}
      action={<SectionCountPill value={count} tone={countTone} />}
    >
      {children}
    </SectionCard>
  );
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const cookieStore = await cookies();

  const workspace = resolveWorkspaceContext({
    searchParams: resolvedSearchParams,
    cookieValues: {
      bosai_active_workspace_id:
        cookieStore.get("bosai_active_workspace_id")?.value,
      bosai_workspace_id: cookieStore.get("bosai_workspace_id")?.value,
      workspace_id: cookieStore.get("workspace_id")?.value,
      bosai_allowed_workspace_ids:
        cookieStore.get("bosai_allowed_workspace_ids")?.value,
      allowed_workspace_ids:
        cookieStore.get("allowed_workspace_ids")?.value,
    },
  });

  const activeWorkspaceId = workspace.activeWorkspaceId || "";

  const flowId = firstParam(resolvedSearchParams.flow_id).trim();
  const rootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const sourceRecordId = firstParam(
    resolvedSearchParams.source_record_id
  ).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  let data: IncidentsResponse | null = null;

  try {
    data = await fetchIncidents({
      workspaceId: activeWorkspaceId || undefined,
    });
  } catch {
    data = null;
  }

  const incidentsUnfiltered: IncidentItem[] = Array.isArray(data?.incidents)
    ? data.incidents
    : [];

  const workspaceScoped = incidentsUnfiltered.filter((item) =>
    workspaceMatchesOrUnscoped(getIncidentWorkspaceId(item), activeWorkspaceId)
  );

  const cleanNormalized = workspaceScoped.filter(
    (item) => !isLegacyNoiseIncident(item)
  );

  const hasFilters = Boolean(flowId || rootEventId || sourceRecordId);

  const visibleIncidents = hasFilters
    ? cleanNormalized.filter((incident) =>
        incidentMatchesFilters(incident, {
          flowId,
          rootEventId,
          sourceRecordId,
        })
      )
    : cleanNormalized;

  const openIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "open"
  );
  const escalatedIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "escalated"
  );
  const resolvedIncidents = visibleIncidents.filter(
    (item) => getIncidentStatusNormalized(item) === "resolved"
  );
  const criticalIncidents = visibleIncidents.filter(
    (item) => getIncidentSeverityNormalized(item) === "critical"
  );

  const activeIncidents = sortActiveIncidents([
    ...openIncidents,
    ...escalatedIncidents,
  ]);

  const sortedResolvedIncidents = sortResolvedIncidents(resolvedIncidents);

  const backToFlowsHref =
    from === "flows" || from === "flow_detail"
      ? getBackToFlowsHref({ flowId, rootEventId, sourceRecordId }, activeWorkspaceId)
      : appendWorkspaceIdToHref("/flows", activeWorkspaceId);

  const commandsHref = appendWorkspaceIdToHref("/commands", activeWorkspaceId);
  const allIncidentsHref = appendWorkspaceIdToHref("/incidents", activeWorkspaceId);

  const focusIncident =
    activeIncidents[0] ?? sortedResolvedIncidents[0] ?? visibleIncidents[0] ?? null;

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="Incidents"
      description="Vue orientée impact métier pour suivre les incidents ouverts, escaladés et résolus, avec navigation directe vers les flows BOSAI associés."
      badges={[
        { label: "Needs Attention", tone: "warning" },
        { label: "Impact métier", tone: "danger" },
        { label: "Flow-linked", tone: "info" },
      ]}
      metrics={[
        { label: "Open", value: openIncidents.length, toneClass: "text-sky-300" },
        {
          label: "Escalated",
          value: escalatedIncidents.length,
          toneClass: "text-amber-300",
        },
        {
          label: "Critical",
          value: criticalIncidents.length,
          toneClass: "text-red-300",
        },
        {
          label: "Resolved",
          value: resolvedIncidents.length,
          toneClass: "text-emerald-300",
        },
      ]}
      actions={
        <>
          {hasFilters ? (
            <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
              Retour au flow
            </Link>
          ) : (
            <Link
              href={appendWorkspaceIdToHref("/flows", activeWorkspaceId)}
              className={actionLinkClassName("soft")}
            >
              Ouvrir Flows
            </Link>
          )}

          <Link href={commandsHref} className={actionLinkClassName("primary")}>
            Voir Commands
          </Link>
        </>
      }
      aside={
        <>
          <SidePanelCard title="Lecture opérationnelle">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge kind="running" label="OPEN" />
                <DashboardStatusBadge kind="retry" label="ESCALATED" />
                <DashboardStatusBadge kind="failed" label="CRITICAL" />
                <DashboardStatusBadge kind="success" label="RESOLVED" />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <p>
                  <span className="text-white/90">Needs Attention</span> regroupe
                  les incidents à traiter en priorité.
                </p>
                <p>
                  <span className="text-white/90">Critical</span> met l’accent sur
                  le niveau de sévérité métier.
                </p>
                <p>
                  <span className="text-white/90">SLA</span> aide à repérer les
                  risques de breach ou d’escalade.
                </p>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Incident actif">
            {focusIncident ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Titre
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-white">
                    {getIncidentTitle(focusIncident)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DashboardStatusBadge
                    kind={getIncidentStatusBadgeKind(focusIncident)}
                    label={getIncidentStatusLabel(focusIncident)}
                  />
                  <DashboardStatusBadge
                    kind={getIncidentSeverityBadgeKind(focusIncident)}
                    label={getIncidentSeverityLabel(focusIncident)}
                  />
                  <DashboardStatusBadge
                    kind={getIncidentSlaBadgeKind(focusIncident)}
                    label={`SLA ${getSlaLabel(focusIncident)}`}
                  />
                </div>

                <div className="space-y-2 text-sm leading-6 text-white/65">
                  <div>
                    Workspace :{" "}
                    <span className="text-white/90">
                      {getWorkspace(focusIncident)}
                    </span>
                  </div>
                  <div>
                    Flow :{" "}
                    <span className="break-all text-white/90">
                      {compactTechnicalId(
                        getBestFlowTargetFromIncident(focusIncident)
                      )}
                    </span>
                  </div>
                  <div>
                    Activité :{" "}
                    <span className="text-white/90">
                      {formatDate(
                        getUpdatedAt(focusIncident) || getOpenedAt(focusIncident)
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={getIncidentHref(focusIncident, activeWorkspaceId)}
                    className={actionLinkClassName("primary")}
                  >
                    Ouvrir le détail
                  </Link>

                  {getFlowHref(focusIncident, activeWorkspaceId) ? (
                    <Link
                      href={getFlowHref(focusIncident, activeWorkspaceId)}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir le flow lié
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/55">Aucun incident sélectionné.</div>
            )}
          </SidePanelCard>
        </>
      }
    >
      {hasFilters ? (
        <SectionCard
          title="Filtré depuis Flows"
          description="Cette vue est limitée au contexte du flow sélectionné."
          tone="attention"
          action={<SectionCountPill value={visibleIncidents.length} tone="warning" />}
        >
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {flowId ? <span className={chipClassName()}>flow_id: {flowId}</span> : null}
              {rootEventId ? (
                <span className={chipClassName()}>root_event_id: {rootEventId}</span>
              ) : null}
              {sourceRecordId ? (
                <span className={chipClassName()}>
                  source_record_id: {sourceRecordId}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={backToFlowsHref} className={actionLinkClassName("soft")}>
                Retour aux flows
              </Link>

              <Link href={allIncidentsHref} className={actionLinkClassName("primary")}>
                Voir tous les incidents
              </Link>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {visibleIncidents.length === 0 ? (
        <EmptyStatePanel
          title="Aucun incident visible"
          description="Le Dashboard n’a remonté aucun incident sur la vue actuelle."
        />
      ) : (
        <>
          <SectionBlock
            title="Needs Attention"
            description="Incidents à surveiller en priorité : ouverts, escaladés, critiques ou encore non résolus."
            count={activeIncidents.length}
            countTone="warning"
            tone="attention"
          >
            {activeIncidents.length === 0 ? (
              <EmptyStatePanel
                title="Aucun incident actif"
                description="Aucun incident ouvert ou escaladé n’est visible pour le moment."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                {activeIncidents.map((incident) => (
                  <IncidentListCard
                    key={incident.id}
                    incident={incident}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Resolved incidents"
            description="Historique des incidents déjà résolus, triés du plus récent au plus ancien."
            count={sortedResolvedIncidents.length}
            countTone="success"
            tone="neutral"
          >
            {sortedResolvedIncidents.length === 0 ? (
              <EmptyStatePanel
                title="Aucun incident résolu"
                description="Aucun incident résolu n’est visible sur cette vue pour le moment."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                {sortedResolvedIncidents.map((incident) => (
                  <IncidentListCard
                    key={incident.id}
                    incident={incident}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            )}
          </SectionBlock>
        </>
      )}
    </ControlPlaneShell>
  );
}
