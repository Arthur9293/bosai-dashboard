import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

type FlowView =
  | "all"
  | "attention"
  | "running"
  | "success"
  | "registry"
  | "partial";

type FlowStatus =
  | "failed"
  | "retry"
  | "running"
  | "queued"
  | "success"
  | "partial"
  | "unknown";

type CommandItem = {
  id: string;
  capability: string;
  status: FlowStatus;
  workspaceId: string;
  flowId: string;
  rootEventId: string;
  parentCommandId: string;
  stepIndex: number;
  createdAt: string;
  updatedAt: string;
  endedAt: string;
};

type IncidentItem = {
  id: string;
  status: "open" | "resolved" | "unknown";
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  workspaceId: string;
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
  createdAt: string;
  updatedAt: string;
};

type FlowGroup = {
  key: string;
  displayName: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
  sourceRecordId: string;
  commands: CommandItem[];
  incidents: IncidentItem[];
  status: FlowStatus;
  registryOnly: boolean;
  partial: boolean;
  createdAt: string;
  updatedAt: string;
  capabilities: string[];
};

type FetchResult<T> = {
  ok: boolean;
  data: T | null;
  error?: string;
};

const WORKER_BASE_URL = stripTrailingSlash(
  process.env.BOSAI_WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    process.env.WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    "",
);

export default async function FlowsPage({
  searchParams,
}: {
  searchParams?: Promise<RawSearchParams> | RawSearchParams;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const workspaceId = readSearchParam(params.workspace_id);
  const rawView = readSearchParam(params.view) || "all";
  const view = normalizeView(rawView);
  const query = readSearchParam(params.q).trim();

  const [commandsResult, incidentsResult] = await Promise.all([
    fetchJson("/commands", workspaceId ? { workspace_id: workspaceId } : {}),
    fetchJson("/incidents", workspaceId ? { workspace_id: workspaceId } : {}),
  ]);

  const commands = normalizeCommandList(commandsResult.data);
  const incidents = normalizeIncidentList(incidentsResult.data);

  const flows = buildFlows(commands, incidents);
  const filteredFlows = flows
    .filter((flow) => matchesView(flow, view))
    .filter((flow) => matchesQuery(flow, query));

  const needsAttention = filteredFlows.filter((flow) =>
    ["failed", "retry", "running", "partial"].includes(flow.status),
  );
  const healthyFlows = filteredFlows.filter(
    (flow) =>
      !flow.registryOnly &&
      !["failed", "retry", "running", "partial"].includes(flow.status),
  );
  const registryOnlyFlows = filteredFlows.filter((flow) => flow.registryOnly);

  const pageError = derivePageError(commandsResult, incidentsResult);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="space-y-5 p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                Surface principale · Workspace-aware
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                  Flows
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
                  Lecture unifiée des exécutions BOSAI. Cette surface regroupe
                  les flows actifs, les flows à surveiller et les lectures
                  partielles issues du registre, sans casser la baseline
                  workspace/shell validée.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={buildHref("/workspace", {
                  workspace_id: workspaceId || undefined,
                })}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
              >
                <span className="block leading-none text-zinc-700">
                  Retour au hub
                </span>
              </Link>
              <Link
                href={buildHref("/overview", {
                  workspace_id: workspaceId || undefined,
                })}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
              >
                <span className="block leading-none text-zinc-700">
                  Overview
                </span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Flows visibles"
              value={String(filteredFlows.length)}
              hint={workspaceId ? `Workspace: ${workspaceId}` : "Tous workspaces"}
            />
            <StatCard
              label="Needs attention"
              value={String(
                filteredFlows.filter((flow) =>
                  ["failed", "retry", "running", "partial"].includes(flow.status),
                ).length,
              )}
              hint="Running, retry, failed, partial"
            />
            <StatCard
              label="Registry-only"
              value={String(
                filteredFlows.filter((flow) => flow.registryOnly).length,
              )}
              hint="Lecture partielle assumée"
            />
            <StatCard
              label="Flows réussis"
              value={String(
                filteredFlows.filter((flow) => flow.status === "success").length,
              )}
              hint="Chaînes terminées proprement"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
        <div className="space-y-5 p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-950">
                Lecture & navigation
              </h2>
              <p className="text-sm text-zinc-600">
                Filtrage simple, safe et cohérent desktop/mobile. Aucun
                changement de logique shell.
              </p>
            </div>

            <form
              method="GET"
              className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"
            >
              {workspaceId ? (
                <input type="hidden" name="workspace_id" value={workspaceId} />
              ) : null}
              {view && view !== "all" ? (
                <input type="hidden" name="view" value={view} />
              ) : null}
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Rechercher un flow, une capability, un ID…"
                className="min-w-0 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 sm:min-w-[320px]"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Appliquer
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterPill
              href={buildHref(
                "/flows",
                mergeParams({ workspace_id: workspaceId, q: query }),
              )}
              active={view === "all"}
            >
              Tous
            </FilterPill>
            <FilterPill
              href={buildHref(
                "/flows",
                mergeParams({
                  workspace_id: workspaceId,
                  q: query,
                  view: "attention",
                }),
              )}
              active={view === "attention"}
            >
              Attention
            </FilterPill>
            <FilterPill
              href={buildHref(
                "/flows",
                mergeParams({
                  workspace_id: workspaceId,
                  q: query,
                  view: "running",
                }),
              )}
              active={view === "running"}
            >
              Running
            </FilterPill>
            <FilterPill
              href={buildHref(
                "/flows",
                mergeParams({
                  workspace_id: workspaceId,
                  q: query,
                  view: "success",
                }),
              )}
              active={view === "success"}
            >
              Success
            </FilterPill>
            <FilterPill
              href={buildHref(
                "/flows",
                mergeParams({
                  workspace_id: workspaceId,
                  q: query,
                  view: "registry",
                }),
              )}
              active={view === "registry"}
            >
              Registry-only
            </FilterPill>
            <FilterPill
              href={buildHref(
                "/flows",
                mergeParams({
                  workspace_id: workspaceId,
                  q: query,
                  view: "partial",
                }),
              )}
              active={view === "partial"}
            >
              Partial
            </FilterPill>
          </div>

          {pageError ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium">Lecture partielle détectée</div>
              <div className="mt-1 opacity-90">{pageError}</div>
            </div>
          ) : null}
        </div>
      </section>

      {filteredFlows.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="text-lg font-semibold text-zinc-950">
              Aucun flow visible
            </div>
            <p className="text-sm leading-6 text-zinc-600">
              Aucun élément ne correspond à la vue actuelle. Le shell et la
              logique workspace restent intacts ; ici la page remonte simplement
              un état vide propre et lisible.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Link
                href={buildHref(
                  "/flows",
                  workspaceId ? { workspace_id: workspaceId } : {},
                )}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
              >
                <span className="block leading-none text-zinc-700">
                  Réinitialiser les filtres
                </span>
              </Link>
              <Link
                href={buildHref(
                  "/commands",
                  workspaceId ? { workspace_id: workspaceId } : {},
                )}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
              >
                <span className="block leading-none text-zinc-700">
                  Voir les commandes
                </span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {needsAttention.length > 0 ? (
        <FlowSection
          title="Needs attention"
          subtitle="Flows à surveiller en priorité. Cette section remonte ce qui mérite une lecture immédiate sans réécrire la logique métier."
          flows={needsAttention}
          activeWorkspaceId={workspaceId}
        />
      ) : null}

      {healthyFlows.length > 0 ? (
        <FlowSection
          title="Flows actifs / récents"
          subtitle="Flows enrichis lisibles proprement, avec une hiérarchie plus cohérente avec le shell et le workspace hub."
          flows={healthyFlows}
          activeWorkspaceId={workspaceId}
        />
      ) : null}

      {registryOnlyFlows.length > 0 ? (
        <FlowSection
          title="Registry-only / partiels"
          subtitle="Lecture assumée quand le graphe causal complet n’est pas disponible. On garde l’information visible sans inventer une causalité absente."
          flows={registryOnlyFlows}
          activeWorkspaceId={workspaceId}
        />
      ) : null}
    </div>
  );
}

function FlowSection({
  title,
  subtitle,
  flows,
  activeWorkspaceId,
}: {
  title: string;
  subtitle: string;
  flows: FlowGroup[];
  activeWorkspaceId: string;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-[22px] border border-white/10 bg-zinc-950/70 px-4 py-4 shadow-sm backdrop-blur sm:px-5">
        <h2 className="text-base font-semibold text-white sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-300">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {flows.map((flow) => (
          <FlowCard key={flow.key} flow={flow} activeWorkspaceId={activeWorkspaceId} />
        ))}
      </div>
    </section>
  );
}

function FlowCard({
  flow,
  activeWorkspaceId,
}: {
  flow: FlowGroup;
  activeWorkspaceId: string;
}) {
  const scopedWorkspaceId = activeWorkspaceId || flow.workspaceId || "";

  const commandsHref = flow.flowId
    ? buildHref("/commands", {
        workspace_id: scopedWorkspaceId || undefined,
        flow_id: flow.flowId,
        from: "flows",
      })
    : buildHref("/commands", {
        workspace_id: scopedWorkspaceId || undefined,
        root_event_id: flow.rootEventId || undefined,
        source_event_id: flow.sourceRecordId || undefined,
        from: "flows",
      });

  const incidentsHref = flow.flowId
    ? buildHref("/incidents", {
        workspace_id: scopedWorkspaceId || undefined,
        flow_id: flow.flowId,
      })
    : buildHref("/incidents", {
        workspace_id: scopedWorkspaceId || undefined,
        root_event_id: flow.rootEventId || undefined,
        source_record_id: flow.sourceRecordId || undefined,
      });

  const eventsHref = flow.rootEventId
    ? buildHref("/events", {
        workspace_id: scopedWorkspaceId || undefined,
        root_event_id: flow.rootEventId,
      })
    : "";

  return (
    <article className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={flow.status} />
              {flow.registryOnly ? <SoftBadge>Registry-only</SoftBadge> : null}
              {flow.partial ? <SoftBadge>Partial</SoftBadge> : null}
            </div>

            <div className="space-y-1">
              <h3 className="truncate text-lg font-semibold text-zinc-950">
                {flow.displayName}
              </h3>
              <p className="text-sm text-zinc-600">
                {flow.workspaceId
                  ? `Workspace ${flow.workspaceId}`
                  : "Workspace non remonté"}
                {flow.capabilities.length > 0
                  ? ` · ${flow.capabilities.slice(0, 3).join(" · ")}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-right">
            <MiniMetric label="Cmd" value={String(flow.commands.length)} />
            <MiniMetric label="Inc" value={String(flow.incidents.length)} />
            <MiniMetric label="Maj" value={formatCompactTime(flow.updatedAt)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <IdentityRow label="Flow ID" value={flow.flowId} />
          <IdentityRow label="Root event" value={flow.rootEventId} />
          <IdentityRow label="Source record" value={flow.sourceRecordId} />
          <IdentityRow
            label="Timeline"
            value={formatTimeline(flow.createdAt, flow.updatedAt)}
          />
        </div>

        {flow.capabilities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {flow.capabilities.map((capability) => (
              <span
                key={capability}
                className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
              >
                {capability}
              </span>
            ))}
          </div>
        ) : null}

        {flow.commands.length > 0 ? (
          <div className="space-y-3 rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="text-sm font-medium text-zinc-900">
              Execution timeline
            </div>
            <div className="flex flex-wrap gap-2">
              {flow.commands
                .slice()
                .sort((a, b) => a.stepIndex - b.stepIndex)
                .slice(0, 8)
                .map((command) => (
                  <div
                    key={command.id}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700"
                  >
                    <span className="font-medium">#{command.stepIndex}</span>
                    <span className="truncate">
                      {command.capability || "unknown"}
                    </span>
                    <span className="opacity-70">·</span>
                    <span>{statusLabel(command.status)}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-0.5">
          <LinkButton href={commandsHref}>Voir les commandes</LinkButton>
          <LinkButton href={incidentsHref}>Voir les incidents</LinkButton>

          {eventsHref ? (
            <LinkButton href={eventsHref}>Voir les événements</LinkButton>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        {value}
      </div>
      <div className="mt-1 text-sm text-zinc-600">{hint}</div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

function IdentityRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 truncate text-sm text-zinc-900">{value || "—"}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: FlowStatus }) {
  const map: Record<FlowStatus, string> = {
    failed: "border-red-200 bg-red-50 text-red-700",
    retry: "border-amber-200 bg-amber-50 text-amber-700",
    running: "border-sky-200 bg-sky-50 text-sky-700",
    queued: "border-zinc-200 bg-zinc-50 text-zinc-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    partial: "border-violet-200 bg-violet-50 text-violet-700",
    unknown: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${map[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function SoftBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition",
        active
          ? "border-zinc-900 bg-zinc-900 hover:bg-zinc-800"
          : "border-zinc-200 bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      <span
        className={[
          "block leading-none",
          active ? "text-white" : "text-zinc-700",
        ].join(" ")}
      >
        {children}
      </span>
    </Link>
  );
}

function LinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[34px] items-center justify-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
    >
      <span className="block leading-none text-zinc-700">{children}</span>
    </Link>
  );
}

async function fetchJson(
  path: string,
  params: Record<string, string | undefined>,
): Promise<FetchResult<unknown>> {
  if (!WORKER_BASE_URL) {
    return {
      ok: false,
      data: null,
      error:
        "WORKER_BASE_URL manquante. La page reste rendue, mais les données distantes ne peuvent pas être récupérées.",
    };
  }

  const url = buildWorkerUrl(path, params);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        error: `Lecture distante en erreur (${response.status}) sur ${path}.`,
      };
    }

    const text = await response.text();

    try {
      return {
        ok: true,
        data: text ? JSON.parse(text) : null,
      };
    } catch {
      return {
        ok: false,
        data: null,
        error: `Réponse non JSON sur ${path}.`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : `Erreur réseau sur ${path}.`,
    };
  }
}

function normalizeCommandList(input: unknown): CommandItem[] {
  return extractArray(input)
    .map((raw) => normalizeCommand(raw))
    .filter((item): item is CommandItem => Boolean(item && item.id));
}

function normalizeIncidentList(input: unknown): IncidentItem[] {
  return extractArray(input)
    .map((raw) => normalizeIncident(raw))
    .filter((item): item is IncidentItem => Boolean(item && item.id));
}

function normalizeCommand(raw: any): CommandItem | null {
  const id = asString(raw?.id || pickValue(raw, ["Command_ID", "ID", "Id"]));
  if (!id) return null;

  const capability = asString(
    pickValue(raw, [
      "capability",
      "Capability",
      "Tool_Key",
      "Tool Mode",
      "Tool_Mode",
      "Name",
    ]),
  );

  const status = normalizeFlowStatus(
    asString(
      pickValue(raw, ["status", "Status_select", "Status", "state", "State"]),
    ),
  );

  const workspaceId = asString(
    pickValue(raw, ["workspace_id", "Workspace_ID", "workspaceId", "WorkspaceId"]),
  );

  const flowId = asString(
    pickValue(raw, ["flow_id", "Flow_ID", "flowId", "FlowId"]),
  );
  const rootEventId = asString(
    pickValue(raw, ["root_event_id", "Root_Event_ID", "rootEventId", "RootEventId"]),
  );
  const parentCommandId = asString(
    pickValue(raw, [
      "parent_command_id",
      "Parent_Command_ID",
      "parentCommandId",
      "ParentCommandId",
    ]),
  );

  const stepIndex = asInt(
    pickValue(raw, ["step_index", "Step_Index", "stepIndex", "StepIndex"]),
  );

  const createdAt = firstDateLike(raw, [
    "created_at",
    "Created_At",
    "createdAt",
    "CreatedAt",
  ]);
  const updatedAt = firstDateLike(raw, [
    "updated_at",
    "Updated_At",
    "updatedAt",
    "UpdatedAt",
    "started_at",
    "Started_At",
  ]);
  const endedAt = firstDateLike(raw, [
    "ended_at",
    "Ended_At",
    "endedAt",
    "EndedAt",
  ]);

  return {
    id,
    capability,
    status,
    workspaceId,
    flowId,
    rootEventId,
    parentCommandId,
    stepIndex,
    createdAt,
    updatedAt,
    endedAt,
  };
}

function normalizeIncident(raw: any): IncidentItem | null {
  const id = asString(raw?.id || pickValue(raw, ["Incident_ID", "ID", "Id"]));
  if (!id) return null;

  const statusRaw = asString(
    pickValue(raw, ["status", "Status_select", "Status", "state", "State"]),
  ).toLowerCase();

  const severityRaw = asString(
    pickValue(raw, ["severity", "Severity", "Urgence IA", "Urgence_IA"]),
  ).toLowerCase();

  const status: IncidentItem["status"] =
    statusRaw.includes("resolve") || statusRaw.includes("closed")
      ? "resolved"
      : statusRaw
        ? "open"
        : "unknown";

  const severity: IncidentItem["severity"] = severityRaw.includes("crit")
    ? "critical"
    : severityRaw.includes("high") || severityRaw.includes("élev")
      ? "high"
      : severityRaw.includes("medium") || severityRaw.includes("moy")
        ? "medium"
        : severityRaw.includes("low") || severityRaw.includes("faib")
          ? "low"
          : "unknown";

  return {
    id,
    status,
    severity,
    workspaceId: asString(
      pickValue(raw, ["workspace_id", "Workspace_ID", "workspaceId", "WorkspaceId"]),
    ),
    flowId: asString(
      pickValue(raw, ["flow_id", "Flow_ID", "flowId", "FlowId"]),
    ),
    rootEventId: asString(
      pickValue(raw, ["root_event_id", "Root_Event_ID", "rootEventId", "RootEventId"]),
    ),
    sourceRecordId: asString(
      pickValue(raw, [
        "source_record_id",
        "Source_Record_ID",
        "sourceRecordId",
        "SourceRecordId",
      ]),
    ),
    createdAt: firstDateLike(raw, [
      "created_at",
      "Created_At",
      "createdAt",
      "CreatedAt",
    ]),
    updatedAt: firstDateLike(raw, [
      "updated_at",
      "Updated_At",
      "updatedAt",
      "UpdatedAt",
    ]),
  };
}

function buildFlows(
  commands: CommandItem[],
  incidents: IncidentItem[],
): FlowGroup[] {
  const map = new Map<string, FlowGroup>();

  for (const command of commands) {
    const key = command.flowId
      ? `flow:${command.flowId}`
      : command.rootEventId
        ? `root:${command.rootEventId}`
        : `cmd:${command.id}`;

    const existing = map.get(key) || createEmptyGroup(key);

    existing.flowId ||= command.flowId;
    existing.rootEventId ||= command.rootEventId;
    existing.workspaceId ||= command.workspaceId;
    existing.createdAt = earliestDate(existing.createdAt, command.createdAt);
    existing.updatedAt = latestDate(
      existing.updatedAt,
      command.endedAt || command.updatedAt || command.createdAt,
    );
    existing.commands.push(command);

    map.set(key, existing);
  }

  for (const incident of incidents) {
    const key = incident.flowId
      ? `flow:${incident.flowId}`
      : incident.rootEventId
        ? `root:${incident.rootEventId}`
        : incident.sourceRecordId
          ? `source:${incident.sourceRecordId}`
          : `incident:${incident.id}`;

    const existing = map.get(key) || createEmptyGroup(key);

    existing.flowId ||= incident.flowId;
    existing.rootEventId ||= incident.rootEventId;
    existing.workspaceId ||= incident.workspaceId;
    existing.sourceRecordId ||= incident.sourceRecordId;
    existing.createdAt = earliestDate(existing.createdAt, incident.createdAt);
    existing.updatedAt = latestDate(
      existing.updatedAt,
      incident.updatedAt || incident.createdAt,
    );
    existing.incidents.push(incident);

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((group) => finalizeFlowGroup(group))
    .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
}

function finalizeFlowGroup(group: FlowGroup): FlowGroup {
  const capabilities = Array.from(
    new Set(group.commands.map((command) => command.capability).filter(Boolean)),
  );

  const registryOnly = group.commands.length === 0 && group.incidents.length > 0;

  const commandStatuses = new Set(
    group.commands.map((command) => command.status),
  );
  const hasOpenIncident = group.incidents.some(
    (incident) => incident.status === "open",
  );
  const hasCriticalIncident = group.incidents.some(
    (incident) =>
      incident.severity === "critical" || incident.severity === "high",
  );

  let status: FlowStatus = "unknown";

  if (
    commandStatuses.has("failed") ||
    (registryOnly && hasOpenIncident && hasCriticalIncident)
  ) {
    status = "failed";
  } else if (commandStatuses.has("retry")) {
    status = "retry";
  } else if (commandStatuses.has("running")) {
    status = "running";
  } else if (registryOnly && group.incidents.length > 0) {
    status = "partial";
  } else if (commandStatuses.has("queued")) {
    status = "queued";
  } else if (
    group.commands.length > 0 &&
    Array.from(commandStatuses).every((value) => value === "success")
  ) {
    status = "success";
  }

  const partial =
    registryOnly ||
    (!group.flowId && !!group.rootEventId) ||
    (!group.flowId && !group.rootEventId && group.incidents.length > 0);

  const displayName = group.flowId
    ? group.flowId
    : group.rootEventId
      ? `root:${group.rootEventId}`
      : group.sourceRecordId
        ? `registry:${group.sourceRecordId}`
        : group.key;

  return {
    ...group,
    displayName,
    capabilities,
    registryOnly,
    partial,
    status,
  };
}

function createEmptyGroup(key: string): FlowGroup {
  return {
    key,
    displayName: key,
    flowId: "",
    rootEventId: "",
    workspaceId: "",
    sourceRecordId: "",
    commands: [],
    incidents: [],
    status: "unknown",
    registryOnly: false,
    partial: false,
    createdAt: "",
    updatedAt: "",
    capabilities: [],
  };
}

function matchesView(flow: FlowGroup, view: FlowView): boolean {
  switch (view) {
    case "attention":
      return ["failed", "retry", "running", "partial"].includes(flow.status);
    case "running":
      return flow.status === "running";
    case "success":
      return flow.status === "success";
    case "registry":
      return flow.registryOnly;
    case "partial":
      return flow.partial;
    case "all":
    default:
      return true;
  }
}

function matchesQuery(flow: FlowGroup, query: string): boolean {
  if (!query) return true;

  const haystack = [
    flow.displayName,
    flow.flowId,
    flow.rootEventId,
    flow.sourceRecordId,
    flow.workspaceId,
    flow.status,
    ...flow.capabilities,
    ...flow.commands.map((command) => command.id),
    ...flow.commands.map((command) => command.capability),
    ...flow.incidents.map((incident) => incident.id),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function derivePageError(
  commandsResult: FetchResult<unknown>,
  incidentsResult: FetchResult<unknown>,
): string {
  const errors = [commandsResult.error, incidentsResult.error].filter(
    Boolean,
  ) as string[];

  if (errors.length === 0) return "";
  return errors.join(" ");
}

function statusLabel(status: FlowStatus): string {
  switch (status) {
    case "failed":
      return "Failed";
    case "retry":
      return "Retry";
    case "running":
      return "Running";
    case "queued":
      return "Queued";
    case "success":
      return "Success";
    case "partial":
      return "Partial";
    case "unknown":
    default:
      return "Unknown";
  }
}

function normalizeFlowStatus(input: string): FlowStatus {
  const value = input.toLowerCase();

  if (
    value.includes("error") ||
    value.includes("fail") ||
    value.includes("dead") ||
    value.includes("block")
  ) {
    return "failed";
  }

  if (value.includes("retry")) {
    return "retry";
  }

  if (value.includes("running") || value.includes("progress")) {
    return "running";
  }

  if (value.includes("queue") || value.includes("pending")) {
    return "queued";
  }

  if (
    value.includes("done") ||
    value.includes("success") ||
    value.includes("complete") ||
    value.includes("resolved")
  ) {
    return "success";
  }

  return "unknown";
}

function normalizeView(input: string): FlowView {
  const value = input.trim().toLowerCase();
  if (
    value === "all" ||
    value === "attention" ||
    value === "running" ||
    value === "success" ||
    value === "registry" ||
    value === "partial"
  ) {
    return value;
  }
  return "all";
}

function extractArray(input: unknown): any[] {
  if (Array.isArray(input)) return input;

  const containerCandidates = [
    input,
    (input as any)?.data,
    (input as any)?.result,
    (input as any)?.payload,
  ];

  for (const candidate of containerCandidates) {
    if (Array.isArray(candidate)) return candidate;
    if (!candidate || typeof candidate !== "object") continue;

    for (const key of ["items", "commands", "incidents", "records", "rows"]) {
      if (Array.isArray((candidate as any)[key])) {
        return (candidate as any)[key];
      }
    }
  }

  return [];
}

function pickValue(raw: any, keys: string[]): unknown {
  const fields = raw?.fields ?? {};

  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== "") {
      return raw[key];
    }
    if (
      fields?.[key] !== undefined &&
      fields?.[key] !== null &&
      fields?.[key] !== ""
    ) {
      return fields[key];
    }
  }

  return undefined;
}

function firstDateLike(raw: any, keys: string[]): string {
  const value = pickValue(raw, keys);
  return asString(value);
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asInt(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildWorkerUrl(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(`${WORKER_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildHref(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function mergeParams(
  input: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const output: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value) output[key] = value;
  }
  return output;
}

function earliestDate(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return toMillis(a) <= toMillis(b) ? a : b;
}

function latestDate(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return toMillis(a) >= toMillis(b) ? a : b;
}

function toMillis(value: string): number {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function formatCompactTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimeline(createdAt: string, updatedAt: string): string {
  const created = formatCompactTime(createdAt);
  const updated = formatCompactTime(updatedAt);

  if (created === "—" && updated === "—") return "—";
  if (created === "—") return `Maj ${updated}`;
  if (updated === "—") return `Créé ${created}`;
  return `${created} → ${updated}`;
}
