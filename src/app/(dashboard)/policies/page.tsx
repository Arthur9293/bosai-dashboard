import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import { fetchPolicies, type PolicyItem } from "../../../lib/api";

const fallbackPolicies: PolicyItem[] = [
  { id: "retry_limit", name: "Retry limit", value: 3 },
  { id: "lock_ttl", name: "Lock TTL (min)", value: 10 },
  { id: "approval_required", name: "Approval required", value: false },
  { id: "sla_warning", name: "SLA warning (min)", value: 15 },
];

function renderPolicyValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return "—";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "Unsupported value";
  }
}

export default async function PoliciesPage() {
  let policies: PolicyItem[] = fallbackPolicies;

  try {
    const data = await fetchPolicies();
    if (data?.policies?.length) {
      policies = data.policies;
    }
  } catch {}

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Policies"
        description="Pilotage des règles BOSAI (retry, SLA, approvals, limites système)."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {policies.map((p) => (
          <DashboardCard key={p.id}>
            <div className="text-sm text-zinc-400">
              {p.name || p.id}
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {renderPolicyValue(p.value)}
            </div>
          </DashboardCard>
        ))}
      </section>

      <DashboardCard
        title="Policy engine"
        subtitle="BOSAI applique ces règles en temps réel dans l’orchestration."
      >
        <div className="text-sm text-zinc-500">
          Les policies définissent le comportement global du système :
          retry, SLA, validation humaine, et limites d’exécution.
        </div>
      </DashboardCard>
    </div>
  );
}
