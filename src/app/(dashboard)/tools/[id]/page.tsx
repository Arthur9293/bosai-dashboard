import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../components/ui/page-header";
import { DashboardCard } from "../../../../components/ui/dashboard-card";
import { fetchTools, type ToolItem } from "@/lib/api";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

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

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-sky-500/20 bg-sky-500/12 text-sky-300 hover:bg-sky-500/18`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
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
  return toText(tool.description, "") || "Aucune description disponible.";
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

function getToolKey(tool: ToolItem): string {
  return toText(tool.tool_key, "") || getToolId(tool);
}

function getToolMode(tool: ToolItem): string {
  return toText(tool.tool_mode, "") || "Mode live";
}

function isToolEnabled(tool: ToolItem): boolean {
  if (tool.enabled !== undefined) return toBoolean(tool.enabled, false);
  return !["disabled", "inactive"].includes(getToolStatus(tool).toLowerCase());
}

function getStatusChipTone(tool: ToolItem):
  | "default"
  | "success"
  | "warning"
  | "danger" {
  const status = getToolStatus(tool).toLowerCase();

  if (status === "active") return "success";
  if (status === "paused") return "warning";
  if (status === "disabled") return "danger";

  return "default";
}

function getCategoryChipTone(tool: ToolItem):
  | "default"
  | "info"
  | "warning"
  | "danger"
  | "violet"
  | "success" {
  const category = getToolCategory(tool).toLowerCase();

  if (category === "execution") return "info";
  if (category === "decision") return "violet";
  if (category === "incident") return "danger";
  if (category === "recovery") return "warning";
  if (category === "flow") return "success";
  if (category === "orchestration") return "default";

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

function findTool(registry: ToolItem[], rawId: string): ToolItem | null {
  const target = decodeURIComponent(rawId).trim().toLowerCase();
  if (!target) return null;

  return (
    registry.find((tool) => {
      const candidates = [
        getToolId(tool),
        getToolKey(tool),
        getToolName(tool),
      ]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      return candidates.includes(target);
    }) || null
  );
}

function getSuggestedSurface(tool: ToolItem): { href: string; label: string } | null {
  const id = getToolId(tool).toLowerCase();
  const category = getToolCategory(tool).toLowerCase();

  if (id.includes("incident") || category === "incident") {
    return { href: "/incidents", label: "Ouvrir les incidents" };
  }

  if (id.includes("event") || category === "orchestration") {
    return { href: "/events", label: "Ouvrir les events" };
  }

  if (id.includes("retry") || category === "recovery") {
    return { href: "/commands", label: "Ouvrir les commands" };
  }

  if (id.includes("http") || category === "execution") {
    return { href: "/commands", label: "Voir les commands HTTP" };
  }

  if (id.includes("decision") || id.includes("flow") || category === "flow") {
    return { href: "/flows", label: "Ouvrir les flows" };
  }

  return { href: "/tools", label: "Retour au registre tools" };
}

function sortRelatedTools(registry: ToolItem[], current: ToolItem): ToolItem[] {
  const currentId = getToolId(current).toLowerCase();
  const currentCategory = getToolCategory(current).toLowerCase();

  return [...registry]
    .filter((item) => getToolId(item).toLowerCase() !== currentId)
    .filter((item) => getToolCategory(item).toLowerCase() === currentCategory)
    .sort((a, b) => getToolName(a).localeCompare(getToolName(b)))
    .slice(0, 3);
}

function MetaCard({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-zinc-200 ${breakAll ? "break-all" : ""}`}>
        {value || "—"}
      </div>
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

function StatCard({
  label,
  value,
  tone = "text-white",
  helper,
}: {
  label: string;
  value: string | number;
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

export default async function ToolDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let fetchedTools: ToolItem[] = [];
  let registrySource = "Fallback registry";

  try {
    const data = await fetchTools();
    if (Array.isArray(data?.tools) && data.tools.length > 0) {
      fetchedTools = data.tools;
      registrySource = "Dynamic registry";
    }
  } catch {
    fetchedTools = [];
    registrySource = "Fallback registry";
  }

  const registry = mergeTools(fetchedTools, fallbackTools);
  const tool = findTool(registry, id);

  if (!tool) {
    notFound();
  }

  const name = getToolName(tool);
  const description = getToolDescription(tool);
  const status = getToolStatus(tool).toUpperCase();
  const enabled = isToolEnabled(tool) ? "Yes" : "No";
  const category = getToolCategory(tool);
  const toolKey = getToolKey(tool);
  const mode = getToolMode(tool);
  const suggestedSurface = getSuggestedSurface(tool);
  const relatedTools = sortRelatedTools(registry, tool);
  const activeCount = registry.filter(
    (item) => getToolStatus(item).toLowerCase() === "active"
  ).length;
  const sameCategoryCount = registry.filter(
    (item) =>
      getToolCategory(item).toLowerCase() === getToolCategory(tool).toLowerCase() &&
      getToolId(item).toLowerCase() !== getToolId(tool).toLowerCase()
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capabilities"
        title={name}
        description={description}
      />

      <section className="flex flex-wrap gap-2">
        <span className={toneChipClassName(getStatusChipTone(tool))}>
          {status}
        </span>

        <span className={toneChipClassName(getCategoryChipTone(tool))}>
          {category.toUpperCase()}
        </span>

        <span className={toneChipClassName(isToolEnabled(tool) ? "success" : "danger")}>
          {isToolEnabled(tool) ? "ENABLED" : "DISABLED"}
        </span>

        <span className={toneChipClassName("default")}>
          {mode}
        </span>

        <span className={toneChipClassName("default")}>
          {registrySource}
        </span>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Status"
          value={status}
          tone={
            status === "ACTIVE"
              ? "text-emerald-300"
              : status === "PAUSED"
                ? "text-amber-300"
                : "text-rose-300"
          }
        />
        <StatCard
          label="Enabled"
          value={enabled}
          tone={enabled === "Yes" ? "text-emerald-300" : "text-zinc-300"}
        />
        <StatCard
          label="Same category"
          value={sameCategoryCount}
        />
        <StatCard
          label="Registry active"
          value={activeCount}
          helper="Tools actifs visibles"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Tool identity"
          subtitle="Lecture produit et technique du tool sélectionné."
        >
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaCard label="Name" value={name} />
            <MetaCard label="Category" value={category} />
            <MetaCard label="Status" value={status} />
            <MetaCard label="Enabled" value={enabled} />
            <MetaCard label="Mode" value={mode} />
            <MetaCard label="Registry source" value={registrySource} />
            <MetaCard label="Tool key" value={toolKey} breakAll />
            <MetaCard label="ID" value={getToolId(tool)} breakAll />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Description</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              {description}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Registry status"
          subtitle="Lecture du registre tools."
        >
          <div className="space-y-3">
            <InfoRow label="Source" value={registrySource} />
            <InfoRow label="Category" value={category} />
            <InfoRow label="Active tools" value={activeCount} />
            <InfoRow label="Same category" value={sameCategoryCount} />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              Cette page détail lit le registre tools sans casser le cockpit,
              avec fallback statique si l’API n’expose rien.
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard
          title="Suggested cockpit surface"
          subtitle="Surface la plus logique pour continuer la lecture."
        >
          <div className="space-y-4">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Suggested route</div>
              <div className="mt-2 break-all text-zinc-200">
                {suggestedSurface?.href || "—"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {suggestedSurface ? (
                <Link href={suggestedSurface.href} className={actionLinkClassName("primary")}>
                  {suggestedSurface.label}
                </Link>
              ) : (
                <span className={actionLinkClassName("primary", true)}>
                  Surface indisponible
                </span>
              )}

              <Link href="/tools" className={actionLinkClassName("soft")}>
                Retour Tools
              </Link>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Related tools"
          subtitle="Autres tools de la même catégorie."
        >
          {relatedTools.length === 0 ? (
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
              Aucun autre tool dans cette catégorie.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedTools.map((item) => {
                const itemId = getToolId(item);

                return (
                  <Link
                    key={itemId}
                    href={`/tools/${encodeURIComponent(itemId)}`}
                    className="block rounded-[20px] border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-words text-base font-semibold text-white">
                          {getToolName(item)}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-zinc-400">
                          {getToolDescription(item)}
                        </div>
                      </div>

                      <span className={toneChipClassName(getStatusChipTone(item))}>
                        {getToolStatus(item).toUpperCase()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </section>

      <section>
        <DashboardCard
          title="Navigation"
          subtitle="Liens utiles sans quitter le cockpit."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link href="/tools" className={actionLinkClassName("soft")}>
              Retour à la liste tools
            </Link>

            <Link href="/tools" className={actionLinkClassName("default")}>
              Voir tous les tools
            </Link>

            {suggestedSurface ? (
              <Link href={suggestedSurface.href} className={actionLinkClassName("primary")}>
                {suggestedSurface.label}
              </Link>
            ) : (
              <span className={actionLinkClassName("primary", true)}>
                Surface cockpit indisponible
              </span>
            )}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
