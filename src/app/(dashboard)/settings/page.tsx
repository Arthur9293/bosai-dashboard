import { PageHeader } from "../../../components/ui/page-header";

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Paramètres système et configuration générale du cockpit BOSAI."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Workspace</div>
          <div className="mt-3 text-2xl font-semibold text-white">
            production
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Environment</div>
          <div className="mt-3 text-2xl font-semibold text-white">Stable</div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Mode</div>
          <div className="mt-3 text-2xl font-semibold text-white">
            Read-only
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Dashboard</div>
          <div className="mt-3 text-2xl font-semibold text-white">V1</div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Configuration registry
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Page de configuration prête. Les paramètres réels du cockpit BOSAI
            pourront être branchés ici sans toucher au moteur.
          </p>
        </div>

        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span>Worker status</span>
            <span className="text-zinc-300">Connected</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span>API mode</span>
            <span className="text-zinc-300">Live</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <span>Permissions</span>
            <span className="text-zinc-300">Read-only</span>
          </div>
        </div>
      </section>
    </div>
  );
}
