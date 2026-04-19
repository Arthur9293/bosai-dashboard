import Link from "next/link";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
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

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function toneChipClassName(
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
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

function getToolStatusLabel(tool: ToolItem): string {
  const status = getToolStatus(tool).toLowerCase();

  if (status === "active") return "ACTIVE";
  if (status === "paused") return "PAUSED";
  if (status === "disabled") return "DISABLED";

  return status ? status.toUpperCase() : "UNKNOWN";
}

function getToolStatusKind(tool: ToolItem): DashboardStatusKind {
  const status = getToolStatus(tool).toLowerCase();

  if (status === "active") return "success";
  if (status === "paused") return "retry";
  if (status === "disabled") return "failed";
  return "unknown";
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

function getCategoryChipTone(category: string):
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet" {
  const c = category.trim().toLowerCase();

  if (c === "incident") return "danger";
  if (c === "decision") return "violet";
  if (c === "recovery") return "warning";
  if (c === "execution") return "info";
  if (c === "orchestration") return "default";
  if (c === "flow") return "success";

  return "default";
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

function sortTools(items: ToolItem[]): ToolItem[] {
  const priority = (tool: ToolItem): number => {
    const status = getToolStatus(tool).toLowerCase();

    if (status === "paused") return 0;
    if (status === "disabled") return 1;
    if (status === "active") return 2;
    return 3;
  };

  return [...items].sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;

    return getToolName(a).localeCompare(getToolName(b));
  });
}

function getQuickRead(params: {
  total: number;
  active: number;
  paused: number;
  disabled: number;
  enabled: number;
}): string {
  const { total, active, paused, disabled, enabled } = params;

  if (disabled > 0) {
    return "Priorité : vérifier les tools désactivés avant d’étendre le registre opérationnel.";
  }

  if (paused > 0) {
    return "Certains tools sont en pause. Le registre reste lisible mais demande une revue de disponibilité.";
  }

  if (active > 0 && total > 0) {
    return "Le registre tools visible paraît globalement stable et majoritairement actif.";
  }

  if (enabled > 0) {
    return "Des tools sont visibles et activés, sans signal critique dominant.";
  }

  return "Aucun tool significatif n’est visible pour le moment.";
}

function StatCard({
  label,
  value,
  tone = "text-white",
  helper,
}: {
  label: string;
  value: number;
  tone?: string;
  helper?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-zinc-300">{helper}</div> : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolItem }) {
  const toolId = getToolId(tool);
  const toolName = getToolName(tool);
  const description = getToolDescription(tool);
  const status = getToolStatus(tool);
  const category = getToolCategory(tool);
  const mode = getToolMode(tool);
  const enabled = isToolEnabled(tool);
  const detailHref = `/tools/${encodeURIComponent(toolId)}`;

  return (
    <DashboardCard
      rightSlot={
        <DashboardStatusBadge
          kind={getToolStatusKind(tool)}
          label={getToolStatusLabel(tool)}
        />
      }
    >
      <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
        BOSAI Tool
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={toneChipClassName(getCategoryChipTone(category))}>
          {category}
        </span>

        <span className={toneChipClassName("default")}>{mode}</span>

        <span className={toneChipClassName(enabled ? "success" : "danger")}>
          {enabled ? "ENABLED" : "DISABLED"}
        </span>
      </div>

      <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {toolName}
      </div>

      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
          <div className={metaLabelClassName()}>Tool key</div>
          <div className="mt-2 break-all text-zinc-200">
            {toText(tool.tool_key, toolId)}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
          <div className={metaLabelClassName()}>ID</div>
          <div className="mt-2 break-all text-zinc-200">{toolId}</div>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <Link href={detailHref} className={actionLinkClassName("primary")}>
          Ouvrir le détail
        </Link>
      </div>
    </DashboardCard>
  );
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

  const tools = sortTools(mergeTools(fetchedTools, fallbackTools));

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

  const attentionTools = tools.filter((tool) => {
    const status = getToolStatus(tool).toLowerCase();
    return status === "paused" || status === "disabled";
  });

  const activeToolItems = tools.filter(
    (tool) => getToolStatus(tool).toLowerCase() === "active"
  );

  const quickRead = getQuickRead({
    total: totalTools,
    active: activeTools,
    paused: pausedTools,
    disabled: disabledTools,
    enabled: enabledTools,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capabilities"
        title="Tools"
        description="Inventaire des capacités BOSAI exposées dans le cockpit avec lecture du registre, de l’état et de la disponibilité opérationnelle."
        badges={[
          { label: "Dynamic registry", tone: "info" },
          { label: "Capability inventory", tone: "muted" },
          { label: registrySource, tone: "muted" },
        ]}
        actions={
          <>
            <Link href="/policies" className={actionLinkClassName("soft")}>
              Ouvrir Policies
            </Link>
            <Link href="/commands" className={actionLinkClassName("default")}>
              Voir Commands
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total tools" value={totalTools} />
        <StatCard label="Active" value={activeTools} tone="text-emerald-300" />
        <StatCard label="Paused" value={pausedTools} tone="text-amber-300" />
        <StatCard label="Disabled" value={disabledTools} tone="text-rose-300" />
        <StatCard
          label="Enabled"
          value={enabledTools}
          tone="text-sky-300"
          helper="Tools activés"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Tools posture"
          subtitle="Lecture rapide du registre tools visible."
        >
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              {quickRead}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Registry status"
          subtitle="État de la source utilisée pour cette page."
        >
          <div className="space-y-3">
            <InfoRow label="Source" value={registrySource} />
            <InfoRow label="Enabled tools" value={enabledTools} />
            <InfoRow label="Loaded tools" value={totalTools} />
            <InfoRow label="Next step" value="Tools detail page" />
          </div>
        </DashboardCard>
      </section>

      {tools.length === 0 ? (
        <DashboardCard
          title="Aucun tool visible"
          subtitle="Le cockpit n’a remonté aucun tool sur la source actuelle."
        >
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            Aucun tool visible pour le moment.
          </div>
        </DashboardCard>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                Needs attention
              </div>
              <span className={toneChipClassName("warning")}>
                {attentionTools.length} visible(s)
              </span>
            </div>

            {attentionTools.length === 0 ? (
              <DashboardCard
                title="Aucun tool prioritaire"
                subtitle="Aucun tool paused ou disabled n’est visible."
              >
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  Le registre visible paraît stable.
                </div>
              </DashboardCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {attentionTools.map((tool) => (
                  <ToolCard key={getToolId(tool)} tool={tool} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                Active tools
              </div>
              <span className={toneChipClassName("success")}>
                {activeToolItems.length} visible(s)
              </span>
            </div>

            {activeToolItems.length === 0 ? (
              <DashboardCard
                title="Aucun tool actif"
                subtitle="Aucun tool actif n’est visible sur cette vue."
              >
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  Le registre ne montre actuellement aucun tool actif.
                </div>
              </DashboardCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {activeToolItems.map((tool) => (
                  <ToolCard key={getToolId(tool)} tool={tool} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
