import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchCommands,
  fetchIncidents,
  type CommandItem,
  type IncidentItem,
} from "@/lib/api";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GraphCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
};

type OrderedStep = {
  command: CommandItem;
  stepNumber: number;
};

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }
  return "";
}

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function getCommandActivityTs(cmd: CommandItem): number {
  return Math.max(
    toTs(cmd.finished_at),
    toTs(cmd.updated_at),
    toTs(cmd.started_at),
    toTs(cmd.created_at)
  );
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "other" {
  const s = (status || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (["running", "queued", "pending", "retry"].includes(s)) return "running";
  if (["error", "failed", "dead"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatus(
  commands: CommandItem[]
): "success" | "running" | "failed" | "unknown" {
  const kinds = commands.map((cmd) => getStatusKind(cmd.status));

  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("running")) return "running";
  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function badgeTone(status: string) {
  const s = status.toLowerCase();

  if (s === "success") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function severityTone(value?: string) {
  const s = (value || "").toLowerCase();

  if (["critical", "high"].includes(s)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["medium", "warning"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["low", "info"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function neutralTone() {
  return "bg-white/5 text-zinc-300 border border-white/10";
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function getIncidentSortTs(incident: IncidentItem): number {
  return Math.max(
    toTs(incident.updated_at),
    toTs(incident.opened_at),
    toTs(incident.created_at),
    toTs(incident.resolved_at)
  );
}

function statCard(
  label: string,
  value: string | number,
  valueClassName = "text-white"
) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-2 text-xl font-semibold break-all ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function toGraphCommand(cmd: CommandItem): GraphCommand {
  return {
    id: String(cmd.id),
    capability: text(cmd.capability) || undefined,
    status: text(cmd.status) || undefined,
    parent_command_id: text(cmd.parent_command_id) || undefined,
    flow_id: text(cmd.flow_id) || undefined,
  };
}

function buildExecutionOrder(commands: CommandItem[]): OrderedStep[] {
  const byId = new Map<string, CommandItem>();
  const childrenMap = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const id = String(cmd.id);
    byId.set(id, cmd);
    childrenMap.set(id, []);
  }

  const roots: CommandItem[] = [];

  for (const cmd of commands) {
    const parentId = text(cmd.parent_command_id);

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
    const id = String(cmd.id);
    if (visited.has(id)) return;

    visited.add(id);
    ordered.push(cmd);

    const children = childrenMap.get(id) ?? [];
    for (const child of children) {
      walk(child);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  const leftovers = commands
    .filter((cmd) => !visited.has(String(cmd.id)))
    .sort(sortByActivityAsc);

  for (const cmd of leftovers) {
    walk(cmd);
  }

  return ordered.map((command, index) => ({
    command,
    stepNumber: index + 1,
  }));
}

function getTerminalCommand(commands: CommandItem[]): CommandItem | null {
  if (commands.length === 0) return null;

  const parentIds = new Set(
    commands.map((cmd) => text(cmd.parent_command_id)).filter(Boolean)
  );

  const leafCandidates = commands.filter(
    (cmd) => !parentIds.has(String(cmd.id))
  );

  const source = leafCandidates.length > 0 ? leafCandidates : commands;

  return [...source].sort(
    (a, b) => getCommandActivityTs(b) - getCommandActivityTs(a)
  )[0] ?? null;
}

function getRootIds(commands: CommandItem[]): Set<string> {
  const ids = new Set(commands.map((cmd) => String(cmd.id)));

  return new Set(
    commands
      .filter((cmd) => {
        const parentId = text(cmd.parent_command_id);
        return !parentId || !ids.has(parentId);
      })
      .map((cmd) => String(cmd.id))
  );
}

function getTerminalIds(commands: CommandItem[]): Set<string> {
  const referencedAsParent = new Set(
    commands.map((cmd) => text(cmd.parent_command_id)).filter(Boolean)
  );

  return new Set(
    commands
      .filter((cmd) => !referencedAsParent.has(String(cmd.id)))
      .map((cmd) => String(cmd.id))
  );
}

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;
  const requestedId = decodeURIComponent(id);

  let allCommands: CommandItem[] = [];

  try {
    const data = await fetchCommands();
    allCommands = Array.isArray(data?.commands) ? data.commands : [];
  } catch {
    allCommands = [];
  }

  const byFlowId = allCommands.filter(
    (cmd) => text(cmd.flow_id) === requestedId
  );

  const byRootEventId = allCommands.filter(
    (cmd) => text(cmd.root_event_id) === requestedId
  );

  const matchedCommands = byFlowId.length > 0 ? byFlowId : byRootEventId;

  if (matchedCommands.length === 0) {
    notFound();
  }

  const orderedSteps = buildExecutionOrder(matchedCommands);
  const causalCommands = orderedSteps.map((step) => step.command);

  const effectiveFlowId = text(causalCommands[0]?.flow_id) || requestedId;

  const rootEventId =
    causalCommands.map((cmd) => text(cmd.root_event_id)).find(Boolean) || "—";

  const workspaceId =
    causalCommands.map((cmd) => text(cmd.workspace_id)).find(Boolean) ||
    "production";

  const flowStatus = computeFlowStatus(causalCommands);

  const doneCount = causalCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "done"
  ).length;

  const runningCount = causalCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "running"
  ).length;

  const failedCount = causalCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "failed"
  ).length;

  const terminalCommand = getTerminalCommand(causalCommands);
  const lastActivityTs = Math.max(...causalCommands.map(getCommandActivityTs), 0);
  const graphCommands = causalCommands.map(toGraphCommand);
  const rootIds = getRootIds(causalCommands);
  const terminalIds = getTerminalIds(causalCommands);

  let linkedIncident: IncidentItem | null = null;

  try {
    const data = await fetchIncidents();
    const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

    const candidates = incidents
      .filter((incident) => {
        const incidentFlowId = text(incident.flow_id);
        const incidentRootId = text(incident.root_event_id);

        return (
          incidentFlowId === effectiveFlowId ||
          (rootEventId !== "—" && incidentRootId === rootEventId)
        );
      })
      .sort((a, b) => getIncidentSortTs(b) - getIncidentSortTs(a));

    linkedIncident = candidates[0] ?? null;
  } catch {
    linkedIncident = null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4">
      <div className="space-y-2">
        <Link
          href="/flows"
          className="inline-flex text-sm text-white/60 transition hover:text-white"
        >
          ← Retour aux flows
        </Link>

        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          Flow
        </div>

        <h1 className="break-all text-4xl font-semibold tracking-tight text-white">
          {effectiveFlowId}
        </h1>

        <p className="text-white/55">Vue détaillée du flow BOSAI.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
            flowStatus
          )}`}
        >
          {flowStatus.toUpperCase()}
        </span>

        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
          {causalCommands.length} steps
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCard("Commands", causalCommands.length)}
        {statCard("Done", doneCount, "text-emerald-300")}
        {statCard("Running/Queued", runningCount, "text-sky-300")}
        {statCard("Failed", failedCount, "text-rose-300")}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Flow identity
        </div>

        <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            Flow key:{" "}
            <span className="text-zinc-200 break-all">{effectiveFlowId}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="text-zinc-200 break-all">{rootEventId}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspaceId}</span>
          </div>
          <div>
            Last step:{" "}
            <span className="text-zinc-200">
              {text(terminalCommand?.capability) || "—"}
            </span>
          </div>
          <div>
            Last activity:{" "}
            <span className="text-zinc-200">
              {formatDate(lastActivityTs || null)}
            </span>
          </div>
          <div>
            Last status:{" "}
            <span className="text-zinc-200">{flowStatus.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Execution graph
        </div>

        <FlowGraphClient commands={graphCommands} />
      </div>

      {linkedIncident ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
            Incident linkage
          </div>

          <div className="text-lg font-semibold text-white">
            {text(linkedIncident.title) ||
              text(linkedIncident.name) ||
              "Incident"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                text(linkedIncident.status) || "unknown"
              )}`}
            >
              {(text(linkedIncident.status) || "UNKNOWN").toUpperCase()}
            </span>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${severityTone(
                text(linkedIncident.severity) || "unknown"
              )}`}
            >
              {(text(linkedIncident.severity) || "NO SEVERITY").toUpperCase()}
            </span>

            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
              SLA {(text(linkedIncident.sla_status) || "—").toUpperCase()}
            </span>
          </div>

          <div className="mt-4 text-sm text-white/70 space-y-1">
            <div>
              Flow:{" "}
              <span className="text-zinc-200 break-all">
                {text(linkedIncident.flow_id) || "—"}
              </span>
            </div>
            <div>
              Root:{" "}
              <span className="text-zinc-200 break-all">
                {text(linkedIncident.root_event_id) || "—"}
              </span>
            </div>
            <div>
              Updated:{" "}
              <span className="text-zinc-200">
                {formatDate(linkedIncident.updated_at)}
              </span>
            </div>
          </div>

          {text(linkedIncident.id) ? (
            <div className="mt-4">
              <Link
                href={`/incidents/${encodeURIComponent(text(linkedIncident.id))}`}
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Ouvrir l’incident
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Execution timeline
        </div>

        <div className="space-y-3">
          {orderedSteps.map(({ command: step, stepNumber }) => {
            const stepId = String(step.id);
            const isRoot = rootIds.has(stepId);
            const isTerminal = terminalIds.has(stepId);

            return (
              <div
                key={stepId}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-white">
                    {text(step.capability) || "Unknown capability"}
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${badgeTone(
                      getStatusKind(step.status) === "done"
                        ? "success"
                        : getStatusKind(step.status) === "running"
                        ? "running"
                        : getStatusKind(step.status) === "failed"
                        ? "failed"
                        : "unknown"
                    )}`}
                  >
                    {(text(step.status) || "UNKNOWN").toUpperCase()}
                  </span>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${neutralTone()}`}
                  >
                    STEP {stepNumber}
                  </span>

                  {isRoot ? (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${neutralTone()}`}
                    >
                      ROOT
                    </span>
                  ) : null}

                  {isTerminal ? (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${neutralTone()}`}
                    >
                      TERMINAL
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 text-sm text-white/65 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    ID: <span className="text-zinc-200 break-all">{step.id}</span>
                  </div>
                  <div>
                    Parent:{" "}
                    <span className="text-zinc-200 break-all">
                      {text(step.parent_command_id) || "—"}
                    </span>
                  </div>
                  <div>
                    Worker:{" "}
                    <span className="text-zinc-200">
                      {text(step.worker) || "—"}
                    </span>
                  </div>
                  <div>
                    Started:{" "}
                    <span className="text-zinc-200">
                      {formatDate(step.started_at)}
                    </span>
                  </div>
                  <div>
                    Finished:{" "}
                    <span className="text-zinc-200">
                      {formatDate(step.finished_at)}
                    </span>
                  </div>
                  <div>
                    Flow:{" "}
                    <span className="text-zinc-200 break-all">
                      {text(step.flow_id) || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
