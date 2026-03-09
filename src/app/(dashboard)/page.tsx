import { PageHeader } from "../../components/ui/page-header";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="BOSAI"
        title="Overview"
        description="Cockpit principal du workspace BOSAI. Cette page centralisera health score, runs, commands, incidents et signaux système."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">System Health</div>
          <div className="mt-3 text-3xl font-semibold text-white">—</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Commands Queue</div>
          <div className="mt-3 text-3xl font-semibold text-white">—</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Runs</div>
          <div className="mt-3 text-3xl font-semibold text-white">—</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Incidents</div>
          <div className="mt-3 text-3xl font-semibold text-white">—</div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-white">
          BOSAI SaaS V1 architecture
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Layout SaaS en place. Les prochaines étapes consistent à brancher les
          pages Runs, Commands, Incidents, Tools, Policies, Integrations et
          Settings une par une, en lecture API uniquement.
        </p>
      </section>
    </div>
  );
}
