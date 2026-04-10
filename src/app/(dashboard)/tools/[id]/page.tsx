import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function softPanelClassName(): string {
  return "rounded-[20px] border border-white/10 bg-black/20 p-4";
}

function emptyStateClassName(): string {
  return "rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
): string {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
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

  const status = getToolStatus(tool).toLowerCase();
  return !["disabled", "inactive"].includes(status);
}

function statusTone(status?: string): string {
  const s = (status || "").trim().toLowerCase();

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
  if (enabled) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
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

  if (id.includes("retry")) {
    return { href: "/commands", label: "Ouvrir les commands" };
  }

  if (id.includes("http")) {
    return { href: "/commands", label: "Voir les commands HTTP" };
  }

  if (id.includes("decision") || id.includes("flow") || category === "flow") {
    return { href: "/flows", label: "Ouvrir les flows" };
  }

  return { href: "/overview", label: "Retour au cockpit" };
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

function StatCard({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className={cardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
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

  const relatedTools = registry
    .filter((item) => getToolId(item) !== getToolId(tool))
    .filter((item) => getToolCategory(item).toLowerCase() === category.toLowerCase())
    .slice(0, 3);

  const activeCount = registry.filter((item) => getToolStatus(item).toLowerCase() === "active").length;
  const categoryCount = registry.filter(
    (item) => getToolCategory(item).toLowerCase() === category.toLowerCase()
  ).length;

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-b border-white/10 pb-6">
        <div className="text-sm text-zinc-400">
          <Link
            href="/tools"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Tools
          </Link>{" "}
          / {name}
        </div>

        <div className={sectionLabelClassName()}>Capabilities</div>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {name}
        </h1>

        <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              status
            )}`}
          >
            {status.toUpperCase()}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${categoryTone(
              category
            )}`}
          >
            {category}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${enabledTone(
              enabled
            )}`}
          >
            {enabled ? "ENABLED" : "DISABLED"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registry source" value={registrySource} />
        <StatCard
          label="Status"
          value={status.toUpperCase()}
          tone={status.toLowerCase() === "active" ? "text-emerald-300" : "text-zinc-300"}
        />
        <StatCard
          label="Enabled"
          value={enabled ? "Yes" : "No"}
          tone={enabled ? "text-emerald-300" : "text-zinc-300"}
        />
        <StatCard label="Same category" value={categoryCount} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 text-lg font-medium text-white">Tool identity</div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <MetaItem label="Name" value={name} />
            <MetaItem label="Category" value={category} />
            <MetaItem label="Status" value={status.toUpperCase()} />
            <MetaItem label="Enabled" value={enabled ? "Yes" : "No"} />
            <MetaItem label="Mode" value={mode} />
            <MetaItem label="Registry source" value={registrySource} />
            <MetaItem label="Tool key" value={toolKey} breakAll />
            <MetaItem label="ID" value={getToolId(tool) || "—"} breakAll />

            <div className="md:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Description</div>
              <div className="mt-1 text-zinc-200">{description}</div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Registry status</div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Source</span>
              <span className="text-zinc-200">{registrySource}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Active tools</span>
              <span className="text-zinc-200">{activeCount}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Category</span>
              <span className="text-zinc-200">{category}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Availability</span>
              <span className="text-zinc-200">{enabled ? "Enabled" : "Disabled"}</span>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Next step</div>
              <div className="mt-1 text-zinc-200">
                {registrySource === "Dynamic registry"
                  ? "Le registre dynamique alimente déjà cette page."
                  : "Cette page fonctionne en fallback statique tant que l’API n’expose pas encore /tools."}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Suggested cockpit surface</div>

          {suggestedSurface ? (
            <div className="space-y-4">
              <div className={softPanelClassName()}>
                <div className={metaLabelClassName()}>Suggested route</div>
                <div className="mt-1 text-zinc-200">{suggestedSurface.href}</div>
              </div>

              <Link
                href={suggestedSurface.href}
                className={actionLinkClassName("primary")}
              >
                {suggestedSurface.label}
              </Link>
            </div>
          ) : (
            <div className={emptyStateClassName()}>
              Aucune surface cockpit suggérée.
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Related tools</div>

          {relatedTools.length === 0 ? (
            <div className={emptyStateClassName()}>
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-white">
                        {getToolName(item)}
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {getToolDescription(item)}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                        getToolStatus(item)
                      )}`}
                    >
                      {getToolStatus(item).toUpperCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="flex flex-col gap-3">
          <Link href="/tools" className={actionLinkClassName("soft")}>
            Retour à la liste tools
          </Link>

          <Link href="/tools" className={actionLinkClassName("primary")}>
            Voir tous les tools
          </Link>

          {suggestedSurface ? (
            <Link
              href={suggestedSurface.href}
              className={actionLinkClassName("default")}
            >
              {suggestedSurface.label}
            </Link>
          ) : (
            <span className={actionLinkClassName("default", true)}>
              Surface cockpit indisponible
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
