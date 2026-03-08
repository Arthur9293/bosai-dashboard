import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function RunsPage() {
  return (
    <AppShell title="Runs">
      <PageHeader
        title="Runs"
        description="Journal d’exécution runtime."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Runs list à brancher.
      </div>
    </AppShell>
  );
}
