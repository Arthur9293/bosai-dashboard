import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";

export default function ToolsPage() {
  return (
    <AppShell title="Tools">
      <PageHeader
        title="Tools"
        description="Catalogue des outils autorisés."
      />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/60">
        Tools list à brancher.
      </div>
    </AppShell>
  );
}
