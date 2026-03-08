import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <PageHeader
        title="Settings"
        description="Réglages du workspace BOSAI."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Settings à brancher.
      </div>
    </AppShell>
  );
}
