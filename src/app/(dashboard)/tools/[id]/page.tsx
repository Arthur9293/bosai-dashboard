import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../components/ui/page-header";
import { DashboardCard } from "../../../../components/ui/dashboard-card";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
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
  return toText(tool.id, "");
}

function getToolName(tool: ToolItem): string {
  return (
    toText(tool.name, "") ||
    toText(tool.tool_key, "") ||
    toText(tool.id, "") ||
    "Unknown tool"
  );
}

function getToolDescription(tool: ToolItem): string {
  return (
    toText(tool.description, "") ||
    "Aucune description disponible pour cette capacité."
  );
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

function getToolKey(tool: ToolItem): string {
  return toText(tool.tool_key, "") || getToolId(tool) || getToolName(tool);
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
    const key = getToolId(item) || getToolKey(item) || getToolName(item);
    if (key) map.set(key.toLowerCase(), item);
  }

  for (const item of primary) {
    const key = getToolId(item) || getToolKey(item) || getToolName(item);
    if (!key) continue;

    const existing = map.get(key.toLowerCase());
    map.set(key.toLowerCase(), {
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
      const candidates = [getToolId(tool), getToolKey(tool), getToolName(tool)]
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
    return { href: "/incidents", label: "Ouvrir Incidents" };
  }

  if (id.includes("event") || category === "orchestration") {
    return { href: "/events", label: "Ouvrir Events" };
  }

  if (id.includes("retry")) {
    return { href: "/commands", label: "Ouvrir Commands" };
  }

  if (id.includes("http")) {
    return { href: "/commands", label: "Voir les commands HTTP" };
  }

  if (id.includes("decision") || id.includes("flow") || category === "flow") {
    return { href: "/flows", label: "Ouvrir Flows" };
  }

  return { href: "/", label: "Retour au cockpit" };
}

function sortRelatedTools(items: ToolItem[], current: ToolItem): ToolItem[] {
  const currentId = getToolId(current);

  return [...items]
    .filter((item) => getToolId(item) !== currentId)
    .filter(
      (item) =>
        getToolCategory(item).toLowerCase() === getToolCategory(current).toLowerCase()
    )
    .sort((a, b) => getToolName(a).localeCompare(getToolName(b)))
    .slice(0, 3);
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
  const status = getToolStatus(tool);
  const enabled = isToolEnabled(tool);
  const category = getToolCategory(tool);
  const toolKey = getToolKey(tool);
  const mode = getToolMode(tool);
  const suggestedSurface = getSuggestedSurface(tool);
  const relatedTools = sortRelatedTools(registry, tool);
  const activeCount = registry.filter(
    (item) => getToolStatus(item).toLowerCase() === "active"
  ).length;
  const categoryCount = registry.filter(
    (item) => getToolCategory(item).toLowerCase() === category.toLowerCase()
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capabilities"
        title={name}
        description={description}
        badges={[
          { label: category, tone: getCategoryChipTone(category) === "info" ? "info" : "muted" },
          { label: mode, tone: "muted" },
          { label: registrySource, tone: "muted" },
        ]}
        actions={
          <>
            <Link href="/tools" className={actionLinkClassName("soft")}>
              Retour Tools
            </Link>

            {suggestedSurface ? (
              <Link
                href={suggestedSurface.href}
                className={actionLinkClassName("primary")}
              >
                {suggestedSurface.label}
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Status"
          value={getToolStatusLabel(tool)}
          tone={
            getToolStatus(tool).toLowerCase() === "active"
              ? "text-emerald-300"
              : getToolStatus(tool).toLowerCase() === "paused"
                ? "text-amber-300"
                : getToolStatus(tool).toLowerCase() === "disabled"
                  ? "text-rose-300"
                  : "text-zinc-300"
          }
        />
        <StatCard
          label="Enabled"
          value={enabled ? "Yes" : "No"}
          tone={enabled ? "text-emerald-300" : "text-zinc-300"}
        />
        <StatCard label="Same category" value={categoryCount} />
        <StatCard
          label="Registry active"
          value={activeCount}
          helper="Tools actifs visibles"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Tool identity"
          subtitle="Lecture produit et technique de la capacité sélectionnée."
          rightSlot={
            <DashboardStatusBadge
              kind={getToolStatusKind(tool)}
              label={getToolStatusLabel(tool)}
            />
          }
        >
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={toneChipClassName(getCategoryChipTone(category))}>
              {category}
            </span>
            <span className={toneChipClassName("default")}>{mode}</span>
            <span className={toneChipClassName(enabled ? "success" : "danger")}>
              {enabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaCard label="Name" value={name} />
            <MetaCard label="Category" value={category} />
            <MetaCard label="Tool key" value={toolKey} breakAll />
            <MetaCard label="ID" value={getToolId(tool) || "—"} breakAll />
            <MetaCard label="Status" value={getToolStatusLabel(tool)} />
            <MetaCard label="Mode" value={mode} />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Description</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">{description}</div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Registry status"
          subtitle="Source et lecture cockpit du registre tools."
        >
          <div className="space-y-3">
            <InfoRow label="Source" value={registrySource} />
            <InfoRow label="Category" value={category} />
            <InfoRow label="Active tools" value={activeCount} />
            <InfoRow label="Same category" value={categoryCount} />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              {registrySource === "Dynamic registry"
                ? "Le registre dynamique alimente déjà cette page détail."
                : "Cette page détail fonctionne encore sur fallback statique tant que l’API ne fournit pas le registre complet."}
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard
          title="Suggested cockpit surface"
          subtitle="Surface la plus logique pour poursuivre la lecture opérationnelle."
        >
          {suggestedSurface ? (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Suggested route</div>
                <div className="mt-2 text-zinc-200">{suggestedSurface.href}</div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={suggestedSurface.href}
                  className={actionLinkClassName("primary")}
                >
                  {suggestedSurface.label}
                </Link>

                <Link href="/tools" className={actionLinkClassName("soft")}>
                  Retour à la liste tools
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
              Aucune surface cockpit suggérée.
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Related tools"
          subtitle="Autres capacités de la même catégorie."
        >
          {relatedTools.length === 0 ? (
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
              Aucun autre tool dans cette catégorie.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedTools.map((item) => (
                <Link
                  key={getToolId(item) || getToolKey(item)}
                  href={`/tools/${encodeURIComponent(getToolId(item) || getToolKey(item))}`}
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

                    <DashboardStatusBadge
                      kind={getToolStatusKind(item)}
                      label={getToolStatusLabel(item)}
                      compact
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardCard>
      </section>

      <section>
        <DashboardCard
          title="Navigation"
          subtitle="Liens utiles sans sortir du cockpit."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link href="/tools" className={actionLinkClassName("soft")}>
              Retour Tools
            </Link>

            <Link href="/tools" className={actionLinkClassName("default")}>
              Voir tous les tools
            </Link>

            {suggestedSurface ? (
              <Link
                href={suggestedSurface.href}
                className={actionLinkClassName("primary")}
              >
                {suggestedSurface.label}
              </Link>
            ) : (
              <span className={actionLinkClassName("default", true)}>
                Surface indisponible
              </span>
            )}
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
