import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function CommandsPage() {
  return (
    <AppShell title="Commands">
      <PageHeader
        title="Commands"
        description="Queue des commandes BOSAI."
      />

      <div style={{marginTop:20}}>
        Commands dashboard coming online...
      </div>
    </AppShell>
  );
}
