import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import { fetchTools } from "../../../lib/api";

const fallbackTools = [
  {
    name: "http_exec",
    description: "Exécution HTTP contrôlée avec garde-fous BOSAI.",
    status: "active",
  },
  {
    name: "decision_router",
    description: "Routage décisionnel des flows BOSAI.",
    status: "active",
  },
];

function tone(status?: string) {
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

export default async function ToolsPage() {
  let tools = fallbackTools;

  try {
    const data = await fetchTools();
    if (data?.tools?.length) {
      tools = data.tools;
    }
  } catch {}

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capabilities"
        title="Tools"
        description="Inventaire des capacités BOSAI exposées dans le cockpit SaaS."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <DashboardCard
            key={tool.name}
            rightSlot={
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                  tool.status
                )}`}
              >
                {(tool.status || "unknown").toUpperCase()}
              </span>
            }
          >
            <div className="text-lg font-semibold text-white">
              {tool.name}
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {tool.description || "No description"}
            </p>
          </DashboardCard>
        ))}
      </section>
    </div>
  );
}
