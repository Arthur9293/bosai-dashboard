import Link from "next/link";
import {
  fetchCommands,
  fetchFlows,
  fetchIncidents,
  type CommandItem,
  type FlowDetail,
  type IncidentItem,
} from "@/lib/api";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type FlowStatus = "running" | "failed" | "retry" | "success" | "unknown";
type ReadingMode = "enriched" | "registry-only";

type FlowCard = {
  key: string;
  detailId: string;
  title: string;
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
  workspaceId: string;
  status: FlowStatus;
  steps: number;
  rootCapability: string;
  terminalCapability: string;
  durationMs: number;
  lastActivityTs: number;
  hasIncident: boolean;
  incidentCount: number;
  readingMode: ReadingMode;
  isPartial: boolean;
};

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function formatDate(ts?: number): string {
  if (!ts || Number.isNaN(ts)) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function decodeSearchParam(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return "";

  try {
    return decodeURIComponent(first);
  } catch {
    return first;
  }
}

function cardClassName(isActive: boolean) {
  const base =
    "rounded-[28px] border bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition";
  const inactive =
    "border-white/10 hover:border-white/15 hover:bg-white/[0.05]";
  const active =
    "border-emerald-500/35 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_0_40px_rgba(16,185,129,0.08)]";

  return `${base} ${isActive ? active : inactive}`;
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" | "active" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "active") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function badgeTone(status: FlowStatus | "partial") {
  if (status === "success") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (status === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (status === "retry") {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (status === "partial") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getCommandStatusKind(
  status?: string
): "done" | "running" | "failed" | "retry" | "other" {
  const s = toText(status).toLowerCase();

  if (["done", "success", "completed", "processed"].includes(s)) return "done";
  if (["running", "processing", "queued", "pending", "queue"].includes(s)) {
    return "running";
  }
  if (["retry", "retriable"].includes(s)) return "retry";
  if (["error", "failed", "dead", "blocked"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatus(commands: CommandItem[]): FlowStatus {
  const kinds = commands.map((cmd) => getCommandStatusKind(cmd.status));

  if (kinds.includes("running")) return "running";
  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("retry")) return "retry";

  if (
    kinds.length > 0 &&
    kinds.every((kind) => kind === "done" || kind === "other")
  ) {
    return "success";
  }

  return "unknown";
}

function getRegistryStatus(flow: FlowDetail): FlowStatus {
  const stats = flow.stats || {};
  const running =
    toNumber(stats.running, 0) + toNumber((stats as Record<string, number>)?.queued, 0) >
    0;
  const failed =
    toNumber(stats.error, 0) + toNumber(stats.dead, 0) > 0;
  const retry = toNumber(stats.retry, 0) > 0;
  const success = toNumber(stats.done, 0) > 0 && !running && !failed && !retry;

  if (running) return "running";
  if (failed) return "failed";
  if (retry) return "retry";
  if (success) return "success";

  return "unknown";
}

function getCommandActivityTs(cmd: CommandItem): number {
  return Math.max(
    toTs(cmd.finished_at),
    toTs(cmd.updated_at),
    toTs(cmd.started_at),
    toTs(cmd.created_at)
  );
}

function getCommandStartTs(cmd: CommandItem): number {
  return Math.max(toTs(cmd.started_at), toTs(cmd.created_at));
}

function buildExecutionOrder(commands: CommandItem[]): CommandItem[] {
  const byId = new Map<string, CommandItem>();
  const childrenMap = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    if (!cmd.id) continue;
    byId.set(cmd.id, cmd);
    childrenMap.set(cmd.id, []);
  }

  const roots: CommandItem[] = [];

  for (const cmd of commands) {
    const parentId = toText(cmd.parent_command_id);

    if (parentId && byId.has(parentId)) {
      childrenMap.get(parentId)?.push(cmd);
    } else {
      roots.push(cmd);
    }
  }

  const sortByActivityAsc = (a: CommandItem, b: CommandItem) =>
    getCommandActivityTs(a) - getCommandActivityTs(b);

  roots.sort(sortByActivityAsc);
  childrenMap.forEach((children) => children.sort(sortByActivityAsc));

  const ordered: CommandItem[] = [];
  const visited = new Set<string>();

  function walk(cmd: CommandItem) {
    if (!cmd.id || visited.has(cmd.id)) return;
    visited.add(cmd.id);
    ordered.push(cmd);

    for (const child of childrenMap.get(cmd.id) ?? []) {
      walk(child);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  const leftovers = commands
    .filter((cmd) => cmd.id && !visited.has(cmd.id))
    .sort(sortByActivityAsc);

  for (const cmd of leftovers) {
    walk(cmd);
  }

  return ordered;
}

function getTerminalCommand(commands: CommandItem[]): CommandItem | null {
  if (commands.length === 0) return null;

  const referencedAsParent = new Set(
    commands.map((cmd) => toText(cmd.parent_command_id)).filter(Boolean)
  );

  const leafCandidates = commands.filter(
    (cmd) => !referencedAsParent.has(toText(cmd.id))
  );

  const source = leafCandidates.length > 0 ? leafCandidates : commands;

  return [...source].sort(
    (a, b) => getCommandActivityTs(b) - getCommandActivityTs(a)
  )[0] || null;
}

function getFlowGroupKey(cmd: CommandItem): string {
  if (toText(cmd.flow_id)) return `flow:${toText(cmd.flow_id)}`;
  if (toText(cmd.root_event_id)) return `root:${toText(cmd.root_event_id)}`;
  if (toText(cmd.source_event_id)) return `event:${toText(cmd.source_event_id)}`;
  return "";
}

function incidentMatchesCard(incident: IncidentItem, card: FlowCard): boolean {
  const incidentFlowId = toText(incident.flow_id);
  const incidentRootEventId = toText(incident.root_event_id);
  const incidentSourceRecordId = toText(incident.source_record_id);

  return (
    (card.flowId && incidentFlowId === card.flowId) ||
    (card.rootEventId && incidentRootEventId === card.rootEventId) ||
    (card.sourceRecordId && incidentSourceRecordId === card.sourceRecordId)
  );
}

function buildEnrichedFlowCards(
  commands: CommandItem[],
  incidents: IncidentItem[]
): FlowCard[] {
  const groups = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const key = getFlowGroupKey(cmd);
    if (!key) continue;

    const bucket = groups.get(key) ?? [];
    bucket.push(cmd);
    groups.set(key, bucket);
  }

  const cards: FlowCard[] = [];

  for (const [key, group] of groups.entries()) {
    const ordered = buildExecutionOrder(group);
    const rootCommand = ordered[0] || null;
    const terminalCommand = getTerminalCommand(ordered);

    const flowId = toText(ordered.find((cmd) => cmd.flow_id)?.flow_id);
    const rootEventId = toText(
      ordered.find((cmd) => cmd.root_event_id)?.root_event_id
    );
    const sourceRecordId = toText(
      ordered.find((cmd) => cmd.source_event_id)?.source_event_id
    );
    const workspaceId =
      toText(ordered.find((cmd) => cmd.workspace_id)?.workspace_id) || "production";

    const validStarts = ordered
      .map((cmd) => getCommandStartTs(cmd))
      .filter((ts) => ts > 0);

    const earliestStartTs =
      validStarts.length > 0 ? Math.min(...validStarts) : 0;
    const lastActivityTs = Math.max(
      ...ordered.map((cmd) => getCommandActivityTs(cmd)),
      0
    );

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const detailId = flowId || rootEventId || sourceRecordId || key;
    const title = flowId || rootEventId || sourceRecordId || "Flow";

    const incidentCount = incidents.filter((incident) =>
      incidentMatchesCard(incident, {
        key,
        detailId,
        title,
        flowId,
        rootEventId,
        sourceRecordId,
        workspaceId,
        status: "unknown",
        steps: ordered.length,
        rootCapability: "",
        terminalCapability: "",
        durationMs,
        lastActivityTs,
        hasIncident: false,
        incidentCount: 0,
        readingMode: "enriched",
        isPartial: false,
      })
    ).length;

    cards.push({
      key,
      detailId,
      title,
      flowId,
      rootEventId,
      sourceRecordId,
      workspaceId,
      status: computeFlowStatus(ordered),
      steps: ordered.length,
      rootCapability: toText(rootCommand?.capability, "Non disponible"),
      terminalCapability: toText(
        terminalCommand?.capability,
        "Non disponible"
      ),
      durationMs,
      lastActivityTs,
      hasIncident: incidentCount > 0,
      incidentCount,
      readingMode: "enriched",
      isPartial: false,
    });
  }

  return cards;
}

function buildRegistryFlowCards(
  flows: FlowDetail[],
  incidents: IncidentItem[],
  existingIds: Set<string>
): FlowCard[] {
  const cards: FlowCard[] = [];

  for (const flow of flows) {
    const flowId = toText(flow.flow_id);
    const rootEventId = toText(flow.root_event_id);
    const sourceRecordId = toText(flow.source_record_id || flow.source_event_id);
    const key = `registry:${sourceRecordId || flowId || rootEventId || toText(flow.id)}`;

    const uniqueIds = [flowId, rootEventId, sourceRecordId].filter(Boolean);

    if (uniqueIds.some((value) => existingIds.has(value))) {
      continue;
    }

    const detailId = sourceRecordId || flowId || rootEventId || toText(flow.id);
    const title = flowId || rootEventId || sourceRecordId || "Flow";

    const card: FlowCard = {
      key,
      detailId,
      title,
      flowId,
      rootEventId,
      sourceRecordId,
      workspaceId: toText(flow.workspace_id, "production"),
      status: getRegistryStatus(flow),
      steps: toNumber(flow.count, 0),
      rootCapability: toText(
        (flow as Record<string, unknown>).root_capability,
        "Registre uniquement"
      ),
      terminalCapability: toText(
        (flow as Record<string, unknown>).terminal_capability,
        "Registre uniquement"
      ),
      durationMs: 0,
      lastActivityTs: Math.max(
        toTs((flow as Record<string, unknown>).last_activity_at as string | number),
        toTs((flow as Record<string, unknown>).updated_at as string | number),
        toTs((flow as Record<string, unknown>).created_at as string | number)
      ),
      hasIncident: false,
      incidentCount: 0,
      readingMode:
        flow.reading_mode === "registry-only" ? "registry-only" : "enriched",
      isPartial: Boolean(flow.is_partial) || flow.reading_mode === "registry-only",
    };

    const incidentCount = incidents.filter((incident) =>
      incidentMatchesCard(incident, card)
    ).length;

    cards.push({
      ...card,
      hasIncident: incidentCount > 0,
      incidentCount,
    });
  }

  return cards;
}

function buildIncidentOnlyCards(
  incidents: IncidentItem[],
  existingIds: Set<string>
): FlowCard[] {
  const groups = new Map<string, IncidentItem[]>();

  for (const incident of incidents) {
    const flowId = toText(incident.flow_id);
    const rootEventId = toText(incident.root_event_id);
    const sourceRecordId = toText(incident.source_record_id || incident.id);

    const keys = [flowId, rootEventId, sourceRecordId].filter(Boolean);
    if (keys.some((value) => existingIds.has(value))) {
      continue;
    }

    const groupKey = `incident:${flowId || rootEventId || sourceRecordId}`;
    const bucket = groups.get(groupKey) ?? [];
    bucket.push(incident);
    groups.set(groupKey, bucket);
  }

  const cards: FlowCard[] = [];

  for (const [key, group] of groups.entries()) {
    const latest =
      [...group].sort(
        (a, b) =>
          Math.max(
            toTs(b.updated_at),
            toTs(b.resolved_at),
            toTs(b.created_at),
            toTs(b.opened_at)
          ) -
          Math.max(
            toTs(a.updated_at),
            toTs(a.resolved_at),
            toTs(a.created_at),
            toTs(a.opened_at)
          )
      )[0] || null;

    if (!latest) continue;

    const flowId = toText(latest.flow_id);
    const rootEventId = toText(latest.root_event_id);
    const sourceRecordId = toText(latest.source_record_id || latest.id);

    const status =
      group.some((incident) =>
        ["open", "opened", "active", "failed", "escalated"].includes(
          toText(incident.status).toLowerCase()
        )
      )
        ? "failed"
        : group.every((incident) =>
            ["resolved", "closed", "done"].includes(
              toText(incident.status).toLowerCase()
            )
          )
        ? "success"
        : "unknown";

    cards.push({
      key,
      detailId: sourceRecordId || flowId || rootEventId,
      title: flowId || rootEventId || sourceRecordId || "Flow",
      flowId,
      rootEventId,
      sourceRecordId,
      workspaceId: toText(latest.workspace_id, "production"),
      status,
      steps: 0,
      rootCapability: "Registre uniquement",
      terminalCapability: "Registre uniquement",
      durationMs: 0,
      lastActivityTs: Math.max(
        toTs(latest.updated_at),
        toTs(latest.resolved_at),
        toTs(latest.created_at),
        toTs(latest.opened_at)
      ),
      hasIncident: true,
      incidentCount: group.length,
      readingMode: "registry-only",
      isPartial: true,
    });
  }

  return cards;
}

function getStatusPriority(status: FlowStatus): number {
  if (status === "running") return 0;
  if (status === "failed") return 1;
  if (status === "retry") return 2;
  if (status === "success") return 3;
  return 4;
}

function sortFlowCards(cards: FlowCard[]): FlowCard[] {
  return [...cards].sort((a, b) => {
    const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;
    return b.lastActivityTs - a.lastActivityTs;
  });
}

function buildIncidentsHref(flow: FlowCard): string {
  const params = new URLSearchParams();

  if (flow.flowId) params.set("flow_id", flow.flowId);
  if (flow.rootEventId) params.set("root_event_id", flow.rootEventId);
  if (flow.sourceRecordId) params.set("source_record_id", flow.sourceRecordId);
  params.set("from", "flows");

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

function buildSelectHref(flow: FlowCard): string {
  const params = new URLSearchParams();
  params.set("selected", flow.detailId);
  return `/flows?${params.toString()}`;
}

function buildDetailHref(flow: FlowCard): string {
  return `/flows/${encodeURIComponent(flow.detailId)}`;
}

function isNeedsAttention(flow: FlowCard): boolean {
  return (
    flow.hasIncident ||
    flow.status === "running" ||
    flow.status === "failed" ||
    flow.status === "retry"
  );
}

function displayReadingMode(flow: FlowCard): string {
  return flow.readingMode === "registry-only" ? "Registre uniquement" : "Enrichie";
}

function FlowListCard({
  flow,
  activeKey,
}: {
  flow: FlowCard;
  activeKey: string;
}) {
  const isActive = flow.key === activeKey;

  return (
    <article className={cardClassName(isActive)}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-[0.22em] text-white/40">
            BOSAI FLOW
          </div>

          <h3 className="break-words text-3xl font-semibold tracking-tight text-white">
            {flow.title}
          </h3>

          <div className="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
            <div>
              Lecture :{" "}
              <span className="text-zinc-100">{displayReadingMode(flow)}</span>
            </div>
            <div>
              Activité :{" "}
              <span className="text-zinc-100">{formatDate(flow.lastActivityTs)}</span>
            </div>
            <div>
              Workspace :{" "}
              <span className="text-zinc-100">{flow.workspaceId || "—"}</span>
            </div>
            <div>
              Durée :{" "}
              <span className="text-zinc-100">{formatDuration(flow.durationMs)}</span>
            </div>
            <div className="break-all">
              Root :{" "}
              <span className="text-zinc-100">{flow.rootEventId || "—"}</span>
            </div>
            <div className="break-all">
              Flow : <span className="text-zinc-100">{flow.flowId || "—"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                flow.status
              )}`}
            >
              {flow.status.toUpperCase()}
            </span>

            {flow.isPartial ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                  "partial"
                )}`}
              >
                PARTIAL
              </span>
            ) : null}

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                flow.hasIncident
                  ? badgeTone("failed")
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              {flow.incidentCount > 0
                ? `${flow.incidentCount} incident${flow.incidentCount > 1 ? "s" : ""}`
                : "Aucun incident"}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
            <div>
              Étapes : <span className="text-zinc-100">{flow.steps || 0}</span>
            </div>
            <div>
              Racine :{" "}
              <span className="text-zinc-100">{flow.rootCapability}</span>
            </div>
            <div className="md:col-span-2">
              Terminale :{" "}
              <span className="text-zinc-100">{flow.terminalCapability}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Link
            href={buildSelectHref(flow)}
            className={actionLinkClassName(isActive ? "active" : "default")}
          >
            {isActive ? "Flow actif" : "Sélectionner"}
          </Link>

          {flow.hasIncident ? (
            <Link
              href={buildIncidentsHref(flow)}
              className={actionLinkClassName("danger")}
            >
              Voir les incidents
            </Link>
          ) : null}

          <Link href={buildDetailHref(flow)} className={actionLinkClassName()}>
            Voir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  title,
  description,
  flows,
  activeKey,
}: {
  title: string;
  description: string;
  flows: FlowCard[];
  activeKey: string;
}) {
  if (flows.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.28em] text-white/40">
          {title}
        </div>
        <p className="max-w-4xl text-lg leading-8 text-zinc-300">
          {description}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {flows.map((flow) => (
          <FlowListCard key={flow.key} flow={flow} activeKey={activeKey} />
        ))}
      </div>
    </section>
  );
}

export default async function FlowsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const selected = decodeSearchParam(resolvedSearchParams.selected);

  let commands: CommandItem[] = [];
  let incidents: IncidentItem[] = [];
  let flows: FlowDetail[] = [];

  try {
    const data = await fetchCommands(400);
    commands = Array.isArray(data.commands) ? data.commands : [];
  } catch {
    commands = [];
  }

  try {
    const data = await fetchIncidents(300);
    incidents = Array.isArray(data.incidents) ? data.incidents : [];
  } catch {
    incidents = [];
  }

  try {
    const data = await fetchFlows();
    flows = Array.isArray(data.flows) ? data.flows : [];
  } catch {
    flows = [];
  }

  const enrichedCards = sortFlowCards(buildEnrichedFlowCards(commands, incidents));

  const existingIds = new Set<string>();
  for (const card of enrichedCards) {
    [card.flowId, card.rootEventId, card.sourceRecordId]
      .filter(Boolean)
      .forEach((value) => existingIds.add(value));
  }

  const registryCards = sortFlowCards(
    buildRegistryFlowCards(flows, incidents, existingIds)
  );

  for (const card of registryCards) {
    [card.flowId, card.rootEventId, card.sourceRecordId]
      .filter(Boolean)
      .forEach((value) => existingIds.add(value));
  }

  const incidentOnlyCards = sortFlowCards(
    buildIncidentOnlyCards(incidents, existingIds)
  );

  const registrySectionCards = sortFlowCards([
    ...registryCards,
    ...incidentOnlyCards,
  ]);

  const allCards = sortFlowCards([...enrichedCards, ...registrySectionCards]);

  const needsAttentionCards = sortFlowCards(
    allCards.filter((flow) => isNeedsAttention(flow))
  );

  const stableEnrichedCards = sortFlowCards(
    enrichedCards.filter((flow) => !isNeedsAttention(flow))
  );

  const activeFlow =
    allCards.find(
      (flow) =>
        [flow.detailId, flow.flowId, flow.rootEventId, flow.sourceRecordId, flow.key]
          .filter(Boolean)
          .includes(selected)
    ) ||
    needsAttentionCards[0] ||
    allCards[0] ||
    null;

  const activeKey = activeFlow?.key || "";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-10 px-4 py-6 sm:px-6 lg:px-8">
      <section className="space-y-4 border-b border-white/10 pb-8">
        <div className="text-sm text-zinc-400">BOSAI Control Plane</div>

        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
          Flows
        </h1>

        <p className="max-w-5xl text-xl leading-9 text-zinc-300">
          Vue de pilotage BOSAI pour suivre les flows enrichis et les flows présents
          uniquement dans le registre.
        </p>
      </section>

      <SectionBlock
        title="Needs attention"
        description="Flows prioritaires à surveiller maintenant : incidents actifs, échecs, retries ou activité en cours."
        flows={needsAttentionCards}
        activeKey={activeKey}
      />

      <SectionBlock
        title="Flows enrichis"
        description="Flows avec lecture causale détaillée disponible : structure, étapes, graphe et navigation complète."
        flows={stableEnrichedCards}
        activeKey={activeKey}
      />

      <SectionBlock
        title="Flows registre uniquement"
        description="Flows présents dans le registre BOSAI mais sans lecture causale détaillée disponible pour le moment."
        flows={registrySectionCards}
        activeKey={activeKey}
      />

      {allCards.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-zinc-400">
          Aucun flow disponible pour le moment.
        </section>
      ) : null}
    </div>
  );
}
