import { PageHeader } from "../../../components/ui/page-header";

export default function IncidentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Incidents"
        description="Supervision opérationnelle des incidents, escalades et états critiques du système BOSAI."
      />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white">Incident monitoring</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Placeholder V1 prêt. On branchera ensuite les incidents actifs, leur
          gravité, leur statut et leurs liens éventuels avec les runs.
        </p>
      </section>
    </div>
  );
}
