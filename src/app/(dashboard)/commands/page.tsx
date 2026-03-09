import { PageHeader } from "../../../components/ui/page-header";

export default function CommandsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Commands"
        description="Pilotage de la queue des commandes BOSAI. Cette vue affichera la file, les statuts, les capacités et l’état d’exécution."
      />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white">Commands queue</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Placeholder V1 prêt. Étape suivante : brancher les données read-only
          de l’API BOSAI.
        </p>
      </section>
    </div>
  );
}
