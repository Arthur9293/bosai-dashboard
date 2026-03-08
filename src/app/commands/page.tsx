import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

async function getCommands() {
  const res = await fetch("https://bosai-worker.onrender.com/commands", {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.commands || [];
}

export default async function CommandsPage() {
  const commands = await getCommands();

  return (
    <AppShell title="Commands">
      <PageHeader
        title="Commands"
        description="Queue des commandes BOSAI."
      />

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-medium">Command Queue</h3>

        <div className="mt-4 space-y-2 text-sm text-white/70">
          {commands.length === 0 && (
            <div className="text-white/50">No commands</div>
          )}

          {commands.map((cmd: any) => (
            <div
              key={cmd.id}
              className="rounded-xl border border-white/10 p-3"
            >
              {cmd.capability} · {cmd.status}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
