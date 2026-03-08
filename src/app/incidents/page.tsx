import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function IncidentsPage() {
  return (
    <AppShell title="Incidents">
      <PageHeader
        title="Incidents"
        description="Vue opérationnelle SLA et erreurs."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Incidents list à brancher.
      </div>
    </AppShell>
  );
}
