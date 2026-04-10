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
    tool_mode: "live",
    enabled: true,
  },
  {
    id: "decision_router",
    name: "decision_router",
    description: "Routage décisionnel des flows BOSAI.",
    status: "active",
    category: "Decision",
    tool_key: "decision_router",
    tool_mode: "live",
    enabled: true,
  },
  {
    id: "incident_router",
    name: "incident_router",
    description: "Création et orientation des incidents.",
    status: "active",
    category: "Incident",
    tool_key: "incident_router",
    tool_mode: "live",
    enabled: true,
  },
  {
    id: "retry_router",
    name: "retry_router",
    description: "Gestion des retries et réinjection dans le pipeline.",
    status: "active",
    category: "Recovery",
    tool_key: "retry_router",
    tool_mode: "live",
    enabled: true,
  },
  {
    id: "complete_flow_demo",
    name: "complete_flow_demo",
    description: "Terminaison propre d’un flow BOSAI.",
    status: "active",
    category: "Flow",
    tool_key: "complete_flow_demo",
    tool_mode: "live",
    enabled: true,
  },
  {
    id: "event_engine",
    name: "event_engine",
    description: "Transformation Event → Command.",
    status: "active",
    category: "Orchestration",
    tool_key: "event_engine",
    tool_mode: "live",
    enabled: true,
  },
];

function statCardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
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

function getToolName(tool: ToolItem): string {
  return toText(tool.name, "") || toText(tool.id, "Unknown tool");
}

function getToolDescription(tool: ToolItem): string {
  return toText(tool.description, "No description");
}

function getToolCategory(tool: ToolItem): string {
  return toText(tool.category, "Uncategorized");
}

function getToolMode(tool: ToolItem): string {
  return toText(tool.tool_mode, "—");
}

function getToolKey(tool: ToolItem): string {
  return toText(tool.tool_key, tool.id || "—");
}

function isEnabled(tool: ToolItem): boolean {
  if (typeof tool.enabled === "boolean") return tool.enabled;

  const status = toText(tool.status, "").toLowerCase();
  if (["active", "enabled", "live"].includes(status)) return true;
  if (["disabled", "inactive", "off"].includes(status)) return false;

  return false;
}

function getToolStatusNormalized(tool: ToolItem): string {
  const raw = toText(tool.status, "").toLowerCase();

  if (raw === "active" || raw === "enabled" || raw === "live") return "active";
  if (raw === "paused" || raw === "pause") return "paused";
  if (raw === "disabled" || raw === "inactive" || raw === "off") return "disabled";

  if (typeof tool.enabled === "boolean") {
    return tool.enabled ? "active" : "disabled";
  }

  return raw || "unknown";
}

function getToolStatusLabel(tool: ToolItem): string {
  const normalized = getToolStatusNormalized(tool);

  if (normalized === "active") return "ACTIVE";
  if (normalized === "paused") return "PAUSED";
  if (normalized === "disabled") return "DISABLED";

  return normalized ? normalized.toUpperCase() : "UNKNOWN";
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

function enabledTone(enabled: boolean): string {
  return enabled
    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
    : "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function sortTools(items: ToolItem[]): ToolItem[] {
  return [...items].sort((a, b) => {
    const statusPriority = (tool: ToolItem): number => {
      const status = getToolStatusNormalized(tool);
      if (status === "active") return 0;
      if (status === "paused") return 1;
      if (status === "disabled") return 2;
      return 3;
    };

    const diff = statusPriority(a) - statusPriority(b);
    if (diff !== 0) return diff;

    return getToolName(a).localeCompare(getToolName(b), "fr", {
      sensitivity: "base",
    });
  });
}

export default async function ToolsPage() {
  let tools: ToolItem[] = fallbackTools;
  let usingFallback = true;

  try {
    const data = await fetchTools();
    if (data?.tools?.length) {
      tools = data.tools;
      usingFallback = false;
    }
  } catch {
    tools = fallbackTools;
    usingFallback = true;
  }

  const visibleTools = sortTools(tools);

  const activeCount = visibleTools.filter(
    (tool) => getToolStatusNormalized(tool) === "active"
  ).length;

  const pausedCount = visibleTools.filter(
    (tool) => getToolStatusNormalized(tool) === "paused"
  ).length;

  const disabledCount = visibleTools.filter(
    (tool) => getToolStatusNormalized(tool) === "disabled"
  ).length;

  const enabledCount = visibleTools.filter((tool) => isEnabled(tool)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capabilities"
        title="Tools"
        description="Inventaire des capacités BOSAI exposées dans le cockpit. Cette vue affiche leur état, leur catégorie et leur niveau de disponibilité."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={statCardClassName()}>
          <div className="text-sm text-zinc-400">Total tools</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {visibleTools.length}
          </div>
        </div>

        <div className={statCardClassName()}>
          <div className="text-sm text-zinc-400">Active</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
            {activeCount}
          </div>
        </div>

        <div className={statCardClassName()}>
          <div className="text-sm text-zinc-400">Paused</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-300">
            {pausedCount}
          </div>
        </div>

        <div className={statCardClassName()}>
          <div className="text-sm text-zinc-400">Disabled</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-red-300">
            {disabledCount}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleTools.map((tool) => {
          const normalizedStatus = getToolStatusNormalized(tool);
          const enabled = isEnabled(tool);

          return (
            <DashboardCard
              key={tool.id}
              rightSlot={
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                    normalizedStatus
                  )}`}
                >
                  {getToolStatusLabel(tool)}
                </span>
              }
            >
              <div className="space-y-4">
                <div>
                  <div className="text-lg font-semibold text-white">
                    {getToolName(tool)}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {getToolDescription(tool)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                    {getToolCategory(tool)}
                  </span>

                  <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                    Mode {getToolMode(tool)}
                  </span>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${enabledTone(
                      enabled
                    )}`}
                  >
                    {enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400">
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                    <div className={metaLabelClassName()}>Tool key</div>
                    <div className="mt-1 break-all text-zinc-200">
                      {getToolKey(tool)}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                    <div className={metaLabelClassName()}>ID</div>
                    <div className="mt-1 break-all text-zinc-200">
                      {toText(tool.id)}
                    </div>
                  </div>
                </div>
              </div>
            </DashboardCard>
          );
        })}
      </section>

      <DashboardCard>
        <div className="space-y-4">
          <div>
            <div className={sectionLabelClassName()}>Tool registry</div>
            <div className="mt-2 text-xl font-semibold text-white">
              Registry status
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Cette page lit le registre dynamique si l’API expose `/tools`. En
              absence de données, elle bascule sur un fallback statique pour ne pas
              casser le cockpit.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className={metaLabelClassName()}>Source</div>
              <div className="mt-1 text-zinc-200">
                {usingFallback ? "Fallback registry" : "Worker API"}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className={metaLabelClassName()}>Enabled tools</div>
              <div className="mt-1 text-zinc-200">{enabledCount}</div>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className={metaLabelClassName()}>Next step</div>
              <div className="mt-1 text-zinc-200">Tools detail page</div>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
