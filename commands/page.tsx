import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function CommandsPage() {
  return (
    <AppShell title="Commands">
      <PageHeader
        title="Commands"
        description="File d’ordres du système."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Commands list à brancher.
      </div>
    </AppShell>
  );
}
