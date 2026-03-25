import { PageHeader } from "../../../components/ui/page-header";

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Policies"
        description="Vue de gouvernance BOSAI. Cette page affichera les règles, garde-fous, limites, approbations et politiques actives du système."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Policies loaded</div>
          <div className="mt-3 text-4xl font-semibold text-white">—</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Approval required</div>
          <div className="mt-3 text-2xl font-semibold text-white">—</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Retry limit</div>
          <div className="mt-3 text-4xl font-semibold text-white">—</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Lock TTL</div>
          <div className="mt-3 text-4xl font-semibold text-white">—</div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Policy registry</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Placeholder V1 prêt. Cette page recevra bientôt les politiques
            réelles chargées par le worker BOSAI.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
          Aucune policy branchée pour le moment.
        </div>
      </section>
    </div>
  );
}
