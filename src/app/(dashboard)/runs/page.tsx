import { PageHeader } from "../../../components/ui/page-header";

export default function RunsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Runs"
        description="Historique d’exécution des capacités BOSAI. Cette vue affichera les runs, statuts, workers, durées et signaux d’exécution."
      />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white">System runs</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Placeholder V1 prêt. Cette page sera la première à être branchée sur
          les données réelles.
        </p>
      </section>
    </div>
  );
}
