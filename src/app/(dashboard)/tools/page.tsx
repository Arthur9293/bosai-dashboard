import Link from "next/link";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import { fetchTools, type ToolItem } from "../../../lib/api";

const fallbackTools: ToolItem[] = [
  {
    id: "http_exec",
    name: "http_exec",
    description: "Exécution HTTP contrôlée avec garde-fous BOSAI.",
    status: "active",
    category: "Execution",
    tool_key: "http_exec",
    tool_mode: "Mode live",
    enabled: true,
  },
  {
    id: "decision_router",
    name: "decision_router",
    description: "Routage décisionnel des flows BOSAI.",
    status: "active",
    category: "Decision",
    tool_key: "decision_router",
    tool_mode: "Mode live",
    enabled: true,
  },
  {
    id: "incident_router",
    name: "incident_router",
    description: "Création et orientation des incidents.",
    status: "active",
    category: "Incident",
    tool_key: "incident_router",
    tool_mode: "Mode live",
    enabled: true,
  },
  {
    id: "retry_router",
    name: "retry_router",
    description: "Gestion des retries et réinjection dans le pipeline.",
    status: "active",
    category: "Recovery",
    tool_key: "retry_router",
    tool_mode: "Mode live",
    enabled: true,
  },
  {
    id: "complete_flow_demo",
    name: "complete_flow_demo",
    description: "Terminaison propre d’un flow BOSAI.",
    status: "active",
    category: "Flow",
    tool_key: "complete_flow_demo",
    tool_mode: "Mode live",
    enabled: true,
  },
  {
    id: "event_engine",
    name: "event_engine",
    description: "Transformation Event → Command.",
    status: "active",
    category: "Orchestration",
    tool_key: "event_engine",
    tool_mode: "Mode live",
    enabled: true,
  },
];

function toText(value: unknown, fallback = ""): string {
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

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "oui", "enabled", "active"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "non", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function getToolId(tool: ToolItem): string {
  return (
    toText(tool.id, "") ||
    toText(tool.tool_key, "") ||
    toText(tool.name, "").toLowerCase().replace(/\s+/g, "_")
  );
}

function getToolName(tool: ToolItem): string {
  return toText(tool.name, "") || toText(tool.tool_key, "") || getToolId(tool) || "Unknown tool";
}

function getToolDescription(tool: ToolItem): string {
  return toText(tool.description, "") || "No description";
}

function getToolStatus(tool: ToolItem): string {
  return toText(tool.status, "unknown");
}

function getToolCategory(tool: ToolItem): string {
  const direct = toText(tool.category, "");
  if (direct) return direct;

  const id = getToolId(tool).toLowerCase();

  if (id.includes("incident")) return "Incident";
  if (id.includes("decision")) return "Decision";
  if (id.includes("retry")) return "Recovery";
  if (id.includes("http")) return "Execution";
  if (id.includes("event")) return "Orchestration";
  if (id.includes("flow")) return "Flow";

  return "General";
}

function getToolMode(tool: ToolItem): string {
  return toText(tool.tool_mode, "") || "Mode live";
}

function isToolEnabled(tool: ToolItem): boolean {
  if (tool.enabled !== undefined) {
    return toBoolean(tool.enabled, false);
  }

  return !["disabled", "inactive"].includes(getToolStatus(tool).toLowerCase());
}

function tone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (s === "active") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "paused") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "disabled") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function categoryTone(category: string): string {
  const c = category.trim().toLowerCase();

  if (c === "incident") {
    return "bg-rose-500/10 text-rose-200 border border-rose-500/20";
  }

  if (c === "decision") {
    return "bg-violet-500/10 text-violet-200 border border-violet-500/20";
  }

  if (c === "recovery") {
    return "bg-amber-500/10 text-amber-200 border border-amber-500/20";
  }

  if (c === "execution") {
    return "bg-sky-500/10 text-sky-200 border border-sky-500/20";
  }

  if (c === "orchestration") {
    return "bg-zinc-500/10 text-zinc-200 border border-zinc-500/20";
  }

  if (c === "flow") {
    return "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function enabledTone(enabled: boolean): string {
  if (enabled) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function mergeTools(primary: ToolItem[], fallback: ToolItem[]): ToolItem[] {
  const map = new Map<string, ToolItem>();

  for (const item of fallback) {
    const key = getToolId(item).toLowerCase();
    if (key) map.set(key, item);
  }

  for (const item of primary) {
    const key = getToolId(item).toLowerCase();
    if (!key) continue;

    const existing = map.get(key);
    map.set(key, {
      ...existing,
      ...item,
    });
  }

  return Array.from(map.values());
}

export default async function ToolsPage() {
  let fetchedTools: ToolItem[] = [];
  let registrySource = "Fallback registry";

  try {
    const data = await fetchTools();
    if (data?.tools?.length) {
      fetchedTools = data.tools;
      registrySource = "Dynamic registry";
    }
  } catch {}

  const tools = mergeTools(fetchedTools, fallbackTools);

  const totalTools = tools.length;
  const activeTools = tools.filter(
    (tool) => getToolStatus(tool).toLowerCase() === "active"
  ).length;
  const pausedTools = tools.filter(
    (tool) => getToolStatus(tool).toLowerCase() === "paused"
  ).length;
  const disabledTools = tools.filter(
    (tool) => getToolStatus(tool).toLowerCase() === "disabled"
  ).length;
  const enabledTools = tools.filter((tool) => isToolEnabled(tool)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capabilities"
        title="Tools"
        description="Inventaire des capacités BOSAI exposées dans le cockpit. Cette vue affiche leur état, leur catégorie et leur niveau de disponibilité."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard>
          <div className="text-sm text-zinc-400">Total tools</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {totalTools}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Active</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
            {activeTools}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Paused</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-300">
            {pausedTools}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Disabled</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-rose-300">
            {disabledTools}
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const toolId = getToolId(tool);
          const toolName = getToolName(tool);
          const description = getToolDescription(tool);
          const status = getToolStatus(tool);
          const category = getToolCategory(tool);
          const mode = getToolMode(tool);
          const enabled = isToolEnabled(tool);

          return (
            <Link
              key={toolId}
              href={`/tools/${encodeURIComponent(toolId)}`}
              className="block"
            >
              <DashboardCard
                rightSlot={
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                      status
                    )}`}
                  >
                    {status.toUpperCase()}
                  </span>
                }
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {toolName}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${categoryTone(
                        category
                      )}`}
                    >
                      {category}
                    </span>

                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                      {mode}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${enabledTone(
                        enabled
                      )}`}
                    >
                      {enabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Tool key
                      </div>
                      <div className="mt-1 break-all text-zinc-200">
                        {toText(tool.tool_key, toolId)}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        ID
                      </div>
                      <div className="mt-1 break-all text-zinc-200">
                        {toolId}
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 text-sm font-medium text-zinc-300">
                    Ouvrir le détail →
                  </div>
                </div>
              </DashboardCard>
            </Link>
          );
        })}
      </section>

      <DashboardCard
        title="Registry status"
        subtitle="Cette page lit le registre dynamique si l’API expose `/tools`. En absence de données, elle bascule sur un fallback statique pour ne pas casser le cockpit."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Source
            </div>
            <div className="mt-1 text-zinc-200">{registrySource}</div>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Enabled tools
            </div>
            <div className="mt-1 text-zinc-200">{enabledTools}</div>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Next step
            </div>
            <div className="mt-1 text-zinc-200">Tools detail page</div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
