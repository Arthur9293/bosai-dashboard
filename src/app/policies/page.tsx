import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";

export default function PoliciesPage() {
  return (
    <AppShell title="Policies">
      <PageHeader
        title="Policies"
        description="Règles de gouvernance BOSAI."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Policies list à brancher.
      </div>
    </AppShell>
  );
}
