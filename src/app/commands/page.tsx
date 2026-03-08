import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/ui/page-header";

type Command = {
  id?: string;
  capability?: string;
  status?: string;
  source?: string;
  worker?: string;
  created_at?: string;
};

async function getCommands(): Promise<Command[]> {
  try {
    const res = await fetch("https://bosai-worker.onrender.com/commands", {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    if (!data || !data.commands) {
      return [];
    }

    return data.commands;
  } catch {
    return [];
  }
}

export default async function CommandsPage() {
  const commands = await getCommands();

  return (
    <AppShell title="Commands">
      <PageHeader
        title="Commands"
        description="Queue des commandes BOSAI."
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 text-lg font-medium">
          Commands ({commands.length})
        </div>

        {commands.length === 0 ? (
          <div className="text-sm text-white/50">
            Aucune commande trouvée.
          </div>
        ) : (
          <div className="space-y-3">
            {commands.map((command) => (
              <div
                key={command.id || Math.random()}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex justify-between">
                  <div className="text-sm font-semibold">
                    {command.capability || "unknown_capability"}
                  </div>

                  <div className="text-xs text-white/60">
                    {command.status || "unknown"}
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/50">
                  Worker: {command.worker || "—"}
                </div>

                <div className="text-xs text-white/50">
                  Source: {command.source || "—"}
                </div>

                <div className="text-xs text-white/50">
                  Created: {command.created_at || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
