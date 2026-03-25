import { notFound } from "next/navigation";
import { fetchCommands } from "../../../../lib/api";
import { PageHeader } from "../../../../components/ui/page-header";
import { DashboardCard } from "../../../../components/ui/dashboard-card";

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  retry_count?: number;
  retry_max?: number;
  scheduled_at?: string;
  next_retry_at?: string;
  is_locked?: boolean;
  locked_by?: string;
  idempotency_key?: string;
  flow_id?: string;
  root_event_id?: string;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
};

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function tone(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "done") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "queued" || s === "queue") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "retry") {
    return "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20";
  }

  if (s === "unsupported") {
    return "bg-purple-500/15 text-purple-300 border border-purple-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CommandDetailPage({ params }: PageProps) {
  const { id } = await params;

  let data: any = null;

  try {
    data = await fetchCommands();
  } catch {
    data = null;
  }

  const commands: CommandItem[] = data?.commands ?? [];
  const command = commands.find((item) => item.id === id);

  if (!command) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command"
        title={command.capability || "Command detail"}
        description="Vue détaillée d’une commande BOSAI."
      />

      <DashboardCard
        title="Command identity"
        rightSlot={
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
              command.status
            )}`}
          >
            {(command.status || "unknown").toUpperCase()}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            ID: <span className="break-all text-zinc-300">{command.id}</span>
          </div>
          <div>
            Capability: <span className="text-zinc-300">{command.capability || "—"}</span>
          </div>
          <div>
            Priority: <span className="text-zinc-300">{command.priority ?? "—"}</span>
          </div>
          <div>
            Flow: <span className="break-all text-zinc-300">{command.flow_id || "—"}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-300">
              {command.root_event_id || "—"}
            </span>
          </div>
          <div>
            Workspace: <span className="text-zinc-300">{command.workspace_id || "—"}</span>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Execution">
        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Worker: <span className="text-zinc-300">{command.worker || "—"}</span>
          </div>
          <div>
            Created: <span className="text-zinc-300">{formatDate(command.created_at)}</span>
          </div>
          <div>
            Started: <span className="text-zinc-300">{formatDate(command.started_at)}</span>
          </div>
          <div>
            Finished: <span className="text-zinc-300">{formatDate(command.finished_at)}</span>
          </div>
          <div>
            Scheduled:{" "}
            <span className="text-zinc-300">{formatDate(command.scheduled_at)}</span>
          </div>
          <div>
            Next retry:{" "}
            <span className="text-zinc-300">{formatDate(command.next_retry_at)}</span>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Control / Retry">
        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Retry count: <span className="text-zinc-300">{command.retry_count ?? "—"}</span>
          </div>
          <div>
            Retry max: <span className="text-zinc-300">{command.retry_max ?? "—"}</span>
          </div>
          <div>
            Locked:{" "}
            <span className="text-zinc-300">
              {typeof command.is_locked === "boolean"
                ? command.is_locked
                  ? "Yes"
                  : "No"
                : "—"}
            </span>
          </div>
          <div>
            Locked by: <span className="text-zinc-300">{command.locked_by || "—"}</span>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            Idempotency key:{" "}
            <span className="break-all text-zinc-300">
              {command.idempotency_key || "—"}
            </span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
