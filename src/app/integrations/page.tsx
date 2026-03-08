import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";

export default function IntegrationsPage() {
  return (
    <AppShell title="Integrations">
      <PageHeader
        title="Integrations"
        description="État des connexions système."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Integrations à brancher.
      </div>
    </AppShell>
  );
}
