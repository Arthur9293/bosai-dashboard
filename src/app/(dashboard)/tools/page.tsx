import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

const tools = [
  {
    name: "http_exec",
    description: "Exécution HTTP contrôlée avec garde-fous BOSAI.",
    status: "Active",
  },
  {
    name: "decision_router",
    description: "Routage décisionnel des flows BOSAI.",
    status: "Active",
  },
  {
    name: "incident_router",
    description: "Création et orientation des incidents.",
    status: "Active",
  },
  {
    name: "retry_router",
    description: "Gestion des retries et réinjection dans le pipeline.",
    status: "Active",
  },
  {
    name: "complete_flow_demo",
    description: "Terminaison propre d’un flow BOSAI.",
    status: "Active",
  },
  {
    name: "event_engine",
    description: "Transformation Event → Command.",
    status: "Active",
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

export default function ToolsPage() {
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
                {tool.status.toUpperCase()}
              </span>
            }
          >
            <div className="text-lg font-semibold text-white">{tool.name}</div>
            <p className="mt-2 text-sm text-zinc-400">{tool.description}</p>
          </DashboardCard>
        ))}
      </section>

      <DashboardCard
        title="Tool registry"
        subtitle="V1 statique validée. Cette page pourra ensuite être branchée sur un endpoint réel des capacités BOSAI."
      >
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
          Registre des tools prêt pour raccordement futur.
        </div>
      </DashboardCard>
    </div>
  );
}
