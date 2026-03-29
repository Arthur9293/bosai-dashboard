import Link from "next/link";
import { fetchCommandById } from "../../../../lib/api";

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
  parent_command_id?: string;
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

function toText(
  value?: string | number | null,
  fallback: string = "—"
) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function InfoRow({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value?: string | number | null;
  breakAll?: boolean;
}) {
  return (
    <div>
      {label}:{" "}
      <span className={breakAll ? "break-all text-zinc-300" : "text-zinc-300"}>
        {toText(value)}
      </span>
    </div>
  );
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CommandDetailPage({ params }: PageProps) {
  const { id } = await params;

  let command: CommandItem | null = null;
  let fetchError = "";

  try {
    command = await fetchCommandById(id);
  } catch (error) {
    command = null;
    fetchError =
      error instanceof Error ? error.message : "Unknown fetchCommandById error";
  }

  if (!command) {
    return (
      <div className="space-y-6">
        <div className="border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            COMMAND
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Command not found
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
            Impossible de charger cette commande BOSAI.
          </p>
        </div>

        <section className={cardClassName()}>
          <h2 className="mb-4 text-lg font-semibold text-white">Debug</h2>

          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              Requested ID:{" "}
              <span className="break-all text-zinc-300">{toText(id)}</span>
            </div>

            <div>
              Error:{" "}
              <span className="break-all text-red-300">
                {fetchError || "No error message"}
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/commands"
                className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
              >
                Retour à la liste Commands
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const flowId = String(command.flow_id || "").trim();
  const rootEventId = String(command.root_event_id || "").trim();
  const parentCommandId = String(command.parent_command_id || "").trim();
  const workspaceId = String(command.workspace_id || "").trim();
  const workerName = String(command.worker || "").trim();

  const hasFlow = flowId.length > 0;
  const hasEvent = rootEventId.length > 0;
  const hasParent = parentCommandId.length > 0;

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          COMMAND
        </div>

        <h1 className="mt-2 break-all text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {toText(command.capability, "Command detail")}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue détaillée d’une commande BOSAI.
        </p>
      </div>

      <section className={cardClassName()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Command identity</h2>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
              command.status
            )}`}
          >
            {toText(command.status, "unknown").toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow label="ID" value={command.id} breakAll />
          <InfoRow label="Capability" value={command.capability} />
          <InfoRow label="Priority" value={command.priority} />
          <InfoRow label="Flow" value={flowId} breakAll />
          <InfoRow label="Root event" value={rootEventId} breakAll />
          <InfoRow label="Parent command" value={parentCommandId} breakAll />
          <InfoRow label="Workspace" value={workspaceId} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {hasFlow && (
            <Link
              href={`/flows/${encodeURIComponent(flowId)}`}
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Voir Flow
            </Link>
          )}

          {hasEvent && (
            <Link
              href={`/events/${encodeURIComponent(rootEventId)}`}
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Voir Event source
            </Link>
          )}

          {hasParent && (
            <Link
              href={`/commands/${encodeURIComponent(parentCommandId)}`}
              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Voir parent
            </Link>
          )}
        </div>

        {(!hasFlow || !hasEvent || !hasParent || !workspaceId || !workerName) && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Certaines métadonnées de navigation ne sont pas encore présentes sur cette
            commande côté API ou source de données.
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <h2 className="mb-4 text-lg font-semibold text-white">Execution</h2>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow label="Worker" value={workerName} />
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
            Scheduled: <span className="text-zinc-300">{formatDate(command.scheduled_at)}</span>
          </div>
          <div>
            Next retry: <span className="text-zinc-300">{formatDate(command.next_retry_at)}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <h2 className="mb-4 text-lg font-semibold text-white">Control / Retry</h2>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow label="Retry count" value={command.retry_count} />
          <InfoRow label="Retry max" value={command.retry_max} />

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

          <InfoRow label="Locked by" value={command.locked_by} />

          <div className="md:col-span-2 xl:col-span-3">
            Idempotency key:{" "}
            <span className="break-all text-zinc-300">
              {toText(command.idempotency_key)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
