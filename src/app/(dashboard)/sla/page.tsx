import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { fetchSla, type SlaItem } from "@/lib/api";
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

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type FlexibleSlaResponse = {
  incidents?: SlaItem[];
  items?: SlaItem[];
  results?: SlaItem[];
  records?: SlaItem[];
  data?: unknown;
  stats?: Record<string, unknown>;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName() {
  return "rounded-[18px] border border-white/10 bg-black/20 px-4 py-4";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
) {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/25 bg-rose-500/12 text-rose-200 hover:bg-rose-500/18`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function chipClassName() {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200";
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

function toNumber(value: unknown, fallback = Number.NaN): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function statValue(value?: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = String(value || "").trim();
    if (text) {
      search.set(key, text);
    }
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function safeResolveSlaWorkspaceId(args: {
  searchParams: SearchParams;
  cookieValues: Record<string, string | undefined>;
}): string {
  try {
    return resolveWorkspaceContext(args).activeWorkspaceId || "";
  } catch {
    return "";
  }
}

function extractSlaItems(payload: unknown): SlaItem[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is SlaItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item)
    );
  }

  if (typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.incidents,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is SlaItem =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      );
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;

      for (const key of ["incidents", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner.filter(
            (item): item is SlaItem =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item)
          );
        }
      }
    }
  }

  return [];
}

function extractSlaStats(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const raw = payload as Record<string, unknown>;

  if (raw.stats && typeof raw.stats === "object" && !Array.isArray(raw.stats)) {
    return raw.stats as Record<string, unknown>;
  }

  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    const nested = raw.data as Record<string, unknown>;
    if (
      nested.stats &&
      typeof nested.stats === "object" &&
      !Array.isArray(nested.stats)
    ) {
      return nested.stats as Record<string, unknown>;
    }
  }

  return {};
}

function getItemRecord(item: SlaItem): Record<string, unknown> {
  return item as Record<string, unknown>;
}

function getSlaTitle(item: SlaItem): string {
  const record = getItemRecord(item);

  return (
    toTextOrEmpty(record.title) ||
    toTextOrEmpty(record.name) ||
    toTextOrEmpty(record.category) ||
    toTextOrEmpty(record.reason) ||
    (toTextOrEmpty(record.id) ? `SLA ${toTextOrEmpty(record.id)}` : "SLA item")
  );
}

function getSlaStatusNormalized(item: SlaItem): string {
  const record = getItemRecord(item);
  const raw = toText(record.sla_status, "").toLowerCase();

  if (["ok"].includes(raw)) return "ok";
  if (["warning", "warn"].includes(raw)) return "warning";
  if (["breached", "breach"].includes(raw)) return "breached";
  if (["escalated", "escalade", "escaladé"].includes(raw)) return "escalated";

  return "unknown";
}

function getSlaStatusLabel(item: SlaItem): string {
  const normalized = getSlaStatusNormalized(item);

  if (normalized === "ok") return "OK";
  if (normalized === "warning") return "WARNING";
  if (normalized === "breached") return "BREACHED";
  if (normalized === "escalated") return "ESCALATED";

  return "UNKNOWN";
}

function getSlaTone(item: SlaItem): string {
  const status = getSlaStatusNormalized(item);

  if (status === "ok") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (status === "escalated") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getRemainingMinutes(item: SlaItem): string {
  const record = getItemRecord(item);
  const primary = toNumber(record.sla_remaining_minutes);
  const fallback = toNumber(record.remaining_minutes);
  const value = Number.isFinite(primary) ? primary : fallback;

  return Number.isFinite(value) ? `${value} min` : "—";
}

function getRemainingMinutesValue(item: SlaItem): number | null {
  const record = getItemRecord(item);
  const primary = toNumber(record.sla_remaining_minutes);
  const fallback = toNumber(record.remaining_minutes);
  const value = Number.isFinite(primary) ? primary : fallback;

  return Number.isFinite(value) ? value : null;
}

function getLastCheck(item: SlaItem): string {
  const record = getItemRecord(item);

  return (
    toTextOrEmpty(record.last_sla_check) ||
    toTextOrEmpty(record.updated_at) ||
    toTextOrEmpty(record.created_at) ||
    ""
  );
}

function getWorkspaceScope(item: SlaItem): string {
  const record = getItemRecord(item);

  return (
    toTextOrEmpty(record.workspace_id) ||
    toTextOrEmpty(record.workspaceId) ||
    toTextOrEmpty(record.workspace) ||
    ""
  );
}

function getWorkspace(item: SlaItem): string {
  return getWorkspaceScope(item) || "—";
}

function getFlowTarget(item: SlaItem): string {
  const record = getItemRecord(item);

  return (
    toTextOrEmpty(record.flow_id) ||
    toTextOrEmpty(record.root_event_id) ||
    toTextOrEmpty(record.source_record_id) ||
    toTextOrEmpty(record.source_event_id) ||
    ""
  );
}

function getCommandTarget(item: SlaItem): string {
  const record = getItemRecord(item);

  return (
    toTextOrEmpty(record.linked_command) ||
    toTextOrEmpty(record.command_id) ||
    ""
  );
}

function getIncidentTarget(item: SlaItem): string {
  return toTextOrEmpty(getItemRecord(item).id);
}

function getEventTarget(item: SlaItem): string {
  const record = getItemRecord(item);
  const sourceRecordId = toTextOrEmpty(record.source_record_id);
  if (sourceRecordId && isRecordIdLike(sourceRecordId)) return sourceRecordId;

  const rootEventId = toTextOrEmpty(record.root_event_id);
  if (rootEventId && isRecordIdLike(rootEventId)) return rootEventId;

  return "";
}

function getRunTarget(item: SlaItem): string {
  const record = getItemRecord(item);

  return (
    toTextOrEmpty(record.run_record_id) ||
    toTextOrEmpty(record.linked_run) ||
    toTextOrEmpty(record.run_id) ||
    "—"
  );
}

function getSlaCategory(item: SlaItem): string {
  return toText(getItemRecord(item).category, "—");
}

function getSlaReason(item: SlaItem): string {
  return toText(getItemRecord(item).reason, "—");
}

function getSlaLatestTs(item: SlaItem): number {
  const ts = new Date(getLastCheck(item) || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function getEscalationQueued(item: SlaItem): boolean {
  const record = getItemRecord(item);
  const raw = record.escalation_queued;

  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    return ["true", "1", "yes", "oui"].includes(normalized);
  }

  return false;
}

function getAttentionPriority(item: SlaItem): number {
  const status = getSlaStatusNormalized(item);

  if (status === "escalated") return 0;
  if (status === "breached") return 1;
  if (getEscalationQueued(item)) return 2;
  if (status === "warning") return 3;
  if (status === "unknown") return 4;
  return 5;
}

function sortAttentionItems(items: SlaItem[]): SlaItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = getAttentionPriority(a) - getAttentionPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return getSlaLatestTs(b) - getSlaLatestTs(a);
  });
}

function sortStableItems(items: SlaItem[]): SlaItem[] {
  return [...items].sort((a, b) => getSlaLatestTs(b) - getSlaLatestTs(a));
}

function getStatusBadgeKind(item: SlaItem): DashboardStatusKind {
  const status = getSlaStatusNormalized(item);

  if (status === "ok") return "success";
  if (status === "warning") return "queued";
  if (status === "breached" || status === "escalated") return "failed";
  return "unknown";
}

function getStatusTextTone(item: SlaItem): string {
  const status = getSlaStatusNormalized(item);

  if (status === "ok") return "text-emerald-300";
  if (status === "warning") return "text-amber-300";
  if (status === "breached") return "text-red-300";
  if (status === "escalated") return "text-rose-300";
  return "text-zinc-300";
}

function getQuickRead(params: {
  breached: number;
  escalated: number;
  queued: number;
  warning: number;
  ok: number;
  total: number;
}): string {
  const { breached, escalated, queued, warning, ok, total } = params;

  if (escalated > 0) {
    return "Priorité immédiate : ouvrir les signaux escaladés, puis remonter au flow et à la command liés.";
  }

  if (breached > 0) {
    return "Priorité : traiter les SLA breached avant que la file d’escalade ne grossisse.";
  }

  if (queued > 0 || warning > 0) {
    return "Lecture bleue : la surveillance reste active, avec des signaux à suivre avant rupture.";
  }

  if (ok > 0 && total > 0) {
    return "La vue SLA visible paraît principalement stable sur le périmètre actuel.";
  }

  return "Aucun signal SLA significatif n’est visible pour le moment.";
}

function getFlowHref(item: SlaItem, activeWorkspaceId: string): string {
  const target = getFlowTarget(item);
  if (!target) return "";

  return appendWorkspaceIdToHref(
    `/flows/${encodeURIComponent(target)}`,
    activeWorkspaceId || getWorkspaceScope(item)
  );
}

function getCommandHref(item: SlaItem, activeWorkspaceId: string): string {
  const target = getCommandTarget(item);
  if (!target) return "";

  const record = getItemRecord(item);

  return buildHref(`/commands/${encodeURIComponent(target)}`, {
    workspace_id: activeWorkspaceId || getWorkspaceScope(item) || undefined,
    flow_id: toTextOrEmpty(record.flow_id) || undefined,
    root_event_id: toTextOrEmpty(record.root_event_id) || undefined,
    source_event_id:
      toTextOrEmpty(record.source_record_id) ||
      toTextOrEmpty(record.source_event_id) ||
      undefined,
    from: "sla",
  });
}

function getIncidentHref(item: SlaItem, activeWorkspaceId: string): string {
  const target = getIncidentTarget(item);
  if (!target) return "";

  const record = getItemRecord(item);

  return buildHref(`/incidents/${encodeURIComponent(target)}`, {
    workspace_id: activeWorkspaceId || getWorkspaceScope(item) || undefined,
    flow_id: toTextOrEmpty(record.flow_id) || undefined,
    root_event_id: toTextOrEmpty(record.root_event_id) || undefined,
    source_record_id:
      toTextOrEmpty(record.source_record_id) ||
      toTextOrEmpty(record.source_event_id) ||
      undefined,
    command_id: getCommandTarget(item) || undefined,
    from: "sla",
  });
}

function getEventHref(item: SlaItem, activeWorkspaceId: string): string {
  const target = getEventTarget(item);
  if (!target) return "";

  const record = getItemRecord(item);

  return buildHref(`/events/${encodeURIComponent(target)}`, {
    workspace_id: activeWorkspaceId || getWorkspaceScope(item) || undefined,
    flow_id: toTextOrEmpty(record.flow_id) || undefined,
    root_event_id: toTextOrEmpty(record.root_event_id) || undefined,
    source_event_id:
      toTextOrEmpty(record.source_record_id) ||
      toTextOrEmpty(record.source_event_id) ||
      undefined,
    from: "sla",
  });
}

function SlaMiniStat({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: number | string;
  toneClass: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function SlaListCard({
  item,
  activeWorkspaceId,
}: {
  item: SlaItem;
  activeWorkspaceId: string;
}) {
  const id = String(getItemRecord(item).id || "");
  const title = getSlaTitle(item);
  const flowTarget = getFlowTarget(item);
  const commandTarget = getCommandTarget(item);
  const incidentTarget = getIncidentTarget(item);

  const flowHref = getFlowHref(item, activeWorkspaceId);
  const commandHref = getCommandHref(item, activeWorkspaceId);
  const incidentHref = getIncidentHref(item, activeWorkspaceId);
  const eventHref = getEventHref(item, activeWorkspaceId);

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            BOSAI SLA
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                {incidentHref ? (
                  <Link
                    href={incidentHref}
                    className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
                  >
                    {title}
                  </Link>
                ) : (
                  <div className="block break-words text-xl font-semibold tracking-tight text-white">
                    {title}
                  </div>
                )}

                <div className={`mt-2 text-sm font-medium ${getStatusTextTone(item)}`}>
                  {getSlaStatusLabel(item)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSlaTone(
                    item
                  )}`}
                >
                  {getSlaStatusLabel(item)}
                </span>

                {getEscalationQueued(item) ? (
                  <DashboardStatusBadge kind="queued" label="QUEUE ACTIVE" />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={chipClassName()}>
                Workspace · {activeWorkspaceId || getWorkspace(item)}
              </span>
              <span className={chipClassName()}>
                Remaining · {getRemainingMinutes(item)}
              </span>
              <span className={chipClassName()}>
                Run · {getRunTarget(item)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Last check</div>
            <div className="mt-2 text-zinc-100">{formatDate(getLastCheck(item))}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Remaining</div>
            <div className="mt-2 text-zinc-100">{getRemainingMinutes(item)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Category</div>
            <div className="mt-2 text-zinc-100">{getSlaCategory(item)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Reason</div>
            <div className="mt-2 break-words text-zinc-100">{getSlaReason(item)}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-2 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-2 break-all text-zinc-100">{flowTarget || "—"}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Command</div>
            <div className="mt-2 break-all text-zinc-100">{commandTarget || "—"}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Run</div>
            <div className="mt-2 break-all text-zinc-100">{getRunTarget(item)}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Record ID</div>
            <div className="mt-2 break-all text-zinc-100">{id || "—"}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Incident target</div>
            <div className="mt-2 break-all text-zinc-100">{incidentTarget || "—"}</div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          {incidentHref ? (
            <Link href={incidentHref} className={actionLinkClassName("danger")}>
              Ouvrir l’incident lié
            </Link>
          ) : (
            <span className={actionLinkClassName("danger", true)}>
              Ouvrir l’incident lié
            </span>
          )}

          {flowHref ? (
            <Link href={flowHref} className={actionLinkClassName("primary")}>
              Ouvrir le flow lié
            </Link>
          ) : (
            <span className={actionLinkClassName("primary", true)}>
              Ouvrir le flow lié
            </span>
          )}

          {commandHref ? (
            <Link href={commandHref} className={actionLinkClassName("soft")}>
              Ouvrir la command liée
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir la command liée
            </span>
          )}

          {eventHref ? (
            <Link href={eventHref} className={actionLinkClassName("soft")}>
              Ouvrir l’event lié
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir l’event lié
            </span>
          )}
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

export default async function SlaPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const cookieStore = await cookies();

  const fallbackWorkspaceId = safeResolveSlaWorkspaceId({
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

  const activeWorkspaceId =
    firstParam(resolvedSearchParams.workspace_id).trim() ||
    firstParam(resolvedSearchParams.workspaceId).trim() ||
    fallbackWorkspaceId ||
    "";

  let rawPayload: unknown = null;
  let fetchFailed = false;

  try {
    rawPayload = await fetchSla({
      limit: 200,
      workspaceId: activeWorkspaceId || undefined,
    });
  } catch {
    rawPayload = null;
    fetchFailed = true;
  }

  const rawItems = extractSlaItems(rawPayload);
  const rawStats = extractSlaStats(rawPayload);

  const items = rawItems.filter((item) =>
    workspaceMatchesOrUnscoped(getWorkspaceScope(item), activeWorkspaceId)
  );

  const okItems = items.filter((item) => getSlaStatusNormalized(item) === "ok");
  const warningItems = items.filter(
    (item) => getSlaStatusNormalized(item) === "warning"
  );
  const breachedItems = items.filter(
    (item) => getSlaStatusNormalized(item) === "breached"
  );
  const escalatedItems = items.filter(
    (item) => getSlaStatusNormalized(item) === "escalated"
  );
  const unknownItems = items.filter(
    (item) => getSlaStatusNormalized(item) === "unknown"
  );
  const queuedItems = items.filter((item) => getEscalationQueued(item));

  const okCount = statValue(toNumber(rawStats.ok, Number.NaN)) || okItems.length;
  const warningCount =
    statValue(toNumber(rawStats.warning, Number.NaN)) || warningItems.length;
  const breachedCount =
    statValue(toNumber(rawStats.breached, Number.NaN)) || breachedItems.length;
  const escalatedCount =
    statValue(toNumber(rawStats.escalated, Number.NaN)) || escalatedItems.length;
  const queuedCount =
    statValue(toNumber(rawStats.escalation_queued, Number.NaN)) || queuedItems.length;
  const unknownCount =
    statValue(toNumber(rawStats.unknown, Number.NaN)) || unknownItems.length;

  const attentionItems = sortAttentionItems(
    items.filter((item) => {
      const status = getSlaStatusNormalized(item);
      return (
        status === "warning" ||
        status === "breached" ||
        status === "escalated" ||
        status === "unknown" ||
        getEscalationQueued(item)
      );
    })
  );

  const stableItems = sortStableItems(
    items.filter((item) => getSlaStatusNormalized(item) === "ok")
  );

  const focusItem = attentionItems[0] ?? stableItems[0] ?? items[0] ?? null;

  const latestCheck =
    [...items].sort((a, b) => getSlaLatestTs(b) - getSlaLatestTs(a))[0] ?? null;

  const mostCritical =
    attentionItems.find((item) => getSlaStatusNormalized(item) === "escalated") ||
    attentionItems.find((item) => getSlaStatusNormalized(item) === "breached") ||
    attentionItems.find((item) => getEscalationQueued(item)) ||
    attentionItems[0] ||
    null;

  const quickRead = getQuickRead({
    breached: breachedCount,
    escalated: escalatedCount,
    queued: queuedCount,
    warning: warningCount,
    ok: okCount,
    total: items.length,
  });

  const focusRemaining = focusItem ? getRemainingMinutesValue(focusItem) : null;

  const flowsHref = appendWorkspaceIdToHref("/flows", activeWorkspaceId);
  const commandsHref = appendWorkspaceIdToHref("/commands", activeWorkspaceId);
  const incidentsHref = appendWorkspaceIdToHref("/incidents", activeWorkspaceId);

  const criticalFlowHref = mostCritical
    ? getFlowHref(mostCritical, activeWorkspaceId)
    : "";

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="SLA"
      description="Vue SLA du cockpit BOSAI avec lecture des signaux OK, Warning, Breached, Escalated et de la file de surveillance."
      badges={[
        { label: "SLA machine", tone: "muted" },
        { label: "Blue queue aware", tone: "info" },
        { label: "Flow-linked", tone: "warning" },
        { label: `Workspace ${activeWorkspaceId || "all"}`, tone: "muted" },
      ]}
      metrics={[
        { label: "OK", value: okCount, toneClass: "text-emerald-300" },
        { label: "Warning", value: warningCount, toneClass: "text-amber-300" },
        { label: "Breached", value: breachedCount, toneClass: "text-red-300" },
        { label: "Escalated", value: escalatedCount, toneClass: "text-rose-300" },
      ]}
      actions={
        <>
          <Link href={flowsHref} className={actionLinkClassName("soft")}>
            Ouvrir Flows
          </Link>

          <Link href={commandsHref} className={actionLinkClassName("soft")}>
            Voir Commands
          </Link>

          <Link href={incidentsHref} className={actionLinkClassName("danger")}>
            Voir Incidents
          </Link>
        </>
      }
      aside={
        <>
          <SidePanelCard title="Lecture SLA">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={queuedCount > 0 ? "queued" : "success"}
                  label={queuedCount > 0 ? "QUEUE ACTIVE" : "QUEUE STABLE"}
                />
                <DashboardStatusBadge
                  kind={escalatedCount > 0 || breachedCount > 0 ? "failed" : "success"}
                  label={
                    escalatedCount > 0 || breachedCount > 0
                      ? "ATTENTION REQUISE"
                      : "STABLE"
                  }
                />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Workspace :{" "}
                  <span className="text-white/90">{activeWorkspaceId || "all"}</span>
                </div>
                <div>
                  Latest check :{" "}
                  <span className="text-white/90">
                    {formatDate(latestCheck ? getLastCheck(latestCheck) : "")}
                  </span>
                </div>
                <div>
                  Queue : <span className="text-sky-300">{queuedCount}</span>
                </div>
                <div>
                  Critical :{" "}
                  <span className="text-white/90">
                    {breachedCount + escalatedCount}
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Quick read
                </div>
                <div className="mt-2 text-sm leading-6 text-white/70">
                  {quickRead}
                </div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Signal actif">
            {focusItem ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Titre
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-white">
                    {getSlaTitle(focusItem)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSlaTone(
                      focusItem
                    )}`}
                  >
                    {getSlaStatusLabel(focusItem)}
                  </span>
                  {getEscalationQueued(focusItem) ? (
                    <DashboardStatusBadge kind="queued" label="QUEUE ACTIVE" />
                  ) : null}
                </div>

                <div className="space-y-2 text-sm leading-6 text-white/65">
                  <div>
                    Workspace :{" "}
                    <span className="text-white/90">
                      {activeWorkspaceId || getWorkspace(focusItem)}
                    </span>
                  </div>
                  <div>
                    Remaining :{" "}
                    <span className="text-white/90">
                      {getRemainingMinutes(focusItem)}
                    </span>
                  </div>
                  <div>
                    Flow :{" "}
                    <span className="break-all text-white/90">
                      {getFlowTarget(focusItem) || "—"}
                    </span>
                  </div>
                </div>

                {criticalFlowHref ? (
                  <Link
                    href={criticalFlowHref}
                    className={actionLinkClassName("primary")}
                  >
                    Ouvrir le flow critique
                  </Link>
                ) : (
                  <span className={actionLinkClassName("primary", true)}>
                    Ouvrir le flow critique
                  </span>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/55">Aucun signal SLA visible.</div>
            )}
          </SidePanelCard>
        </>
      }
    >
      {fetchFailed ? (
        <EmptyStatePanel
          title="Lecture SLA indisponible"
          description="Le Dashboard n’a pas pu charger la surface SLA. La vue est protégée, mais il faut vérifier la lecture API côté worker / helper."
        />
      ) : items.length === 0 ? (
        <EmptyStatePanel
          title="Aucun signal SLA visible"
          description="Le Dashboard n’a remonté aucun signal SLA sur la source actuelle."
        />
      ) : (
        <>
          <SectionCard
            title="SLA posture"
            description="Lecture rapide de la pression SLA visible sur le cockpit."
            action={<SectionCountPill value={items.length} tone="info" />}
          >
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
              <SlaMiniStat label="OK" value={okCount} toneClass="text-emerald-300" />
              <SlaMiniStat
                label="Warning"
                value={warningCount}
                toneClass="text-amber-300"
              />
              <SlaMiniStat
                label="Breached"
                value={breachedCount}
                toneClass="text-red-300"
              />
              <SlaMiniStat
                label="Escalated"
                value={escalatedCount}
                toneClass="text-rose-300"
              />
              <SlaMiniStat
                label="Queued"
                value={queuedCount}
                toneClass="text-sky-300"
              />
              <SlaMiniStat
                label="Unknown"
                value={unknownCount}
                toneClass="text-zinc-300"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Latest check</div>
                <div className="mt-2 text-zinc-100">
                  {formatDate(latestCheck ? getLastCheck(latestCheck) : "")}
                </div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Critical signals</div>
                <div className="mt-2 text-zinc-100">{breachedCount + escalatedCount}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Queue active</div>
                <div className="mt-2 text-sky-300">{queuedCount}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Focus remaining</div>
                <div className="mt-2 text-zinc-100">
                  {focusRemaining === null ? "—" : `${focusRemaining} min`}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
              <div className={metaLabelClassName()}>Quick read</div>
              <div className="mt-2 text-sm leading-6 text-zinc-300">{quickRead}</div>
            </div>
          </SectionCard>

          <SectionBlock
            title="Needs attention"
            description="Signaux SLA à surveiller en priorité : warning, breached, escalated ou queue active."
            count={attentionItems.length}
            countTone="warning"
            tone="attention"
          >
            {attentionItems.length === 0 ? (
              <EmptyStatePanel
                title="Aucun signal prioritaire"
                description="Aucun signal warning, breached, escalated ou queue active n’est visible."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                {attentionItems.map((item) => (
                  <SlaListCard
                    key={String(getItemRecord(item).id || getFlowTarget(item) || Math.random())}
                    item={item}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Stable signals"
            description="Signaux SLA stables ou résiduels, triés du plus récent au plus ancien."
            count={stableItems.length}
            countTone="success"
            tone="neutral"
          >
            {stableItems.length === 0 ? (
              <EmptyStatePanel
                title="Aucun signal stable"
                description="Aucun signal SLA stable n’est visible sur cette vue."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                {stableItems.map((item) => (
                  <SlaListCard
                    key={String(getItemRecord(item).id || getFlowTarget(item) || Math.random())}
                    item={item}
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
