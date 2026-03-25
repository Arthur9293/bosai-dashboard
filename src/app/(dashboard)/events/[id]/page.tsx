import { notFound } from "next/navigation";
import { fetchEvents } from "../../../../lib/api";

type EventItem = {
  id: string;
  event_type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[];
  mapped_capability?: string;
  processed_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  flow_id?: string | null;
  payload?: Record<string, unknown>;
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

  if (s === "processed") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "queued") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "new") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "ignored") {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (s === "error") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function getLinkedCommandValue(evt: EventItem) {
  if (evt.command_id) return evt.command_id;
  if (Array.isArray(evt.linked_command) && evt.linked_command.length > 0) {
    return evt.linked_command[0];
  }
  return "—";
}

function getFlowId(evt: EventItem) {
  if (evt.flow_id && String(evt.flow_id).trim()) {
    return String(evt.flow_id).trim();
  }

  const payload = evt.payload;
  if (payload && typeof payload === "object") {
    const candidate =
      (payload as Record<string, unknown>)["flow_id"] ??
      (payload as Record<string, unknown>)["flowid"];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "—";
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;

  let data: any = null;

  try {
    data = await fetchEvents();
  } catch {
    data = null;
  }

  const events: EventItem[] = data?.events ?? [];
  const event = events.find((item) => item.id === id);

  if (!event) {
    notFound();
  }

  const linkedCommand = getLinkedCommandValue(event);
  const flowId = getFlowId(event);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          EVENT
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {event.mapped_capability || event.event_type || "Event detail"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue détaillée d’un event BOSAI.
        </p>
      </div>

      <section className={cardClassName()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Event identity</h2>
          </div>

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
              event.status
            )}`}
          >
            {(event.status || "unknown").toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            ID: <span className="break-all text-zinc-300">{event.id}</span>
          </div>
          <div>
            Event type: <span className="text-zinc-300">{event.event_type || "—"}</span>
          </div>
          <div>
            Capability:{" "}
            <span className="text-zinc-300">{event.mapped_capability || "—"}</span>
          </div>
          <div>
            Source: <span className="text-zinc-300">{event.source || "—"}</span>
          </div>
          <div>
            Run: <span className="break-all text-zinc-300">{event.run_id || "—"}</span>
          </div>
          <div>
            Processed:{" "}
            <span className="text-zinc-300">{formatDate(event.processed_at)}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Pipeline linking</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Command created:{" "}
            <span className="text-zinc-300">
              {event.command_created === true ? "Yes" : "No"}
            </span>
          </div>
          <div>
            Linked command:{" "}
            <span className="break-all text-zinc-300">{linkedCommand}</span>
          </div>
          <div>
            Flow: <span className="break-all text-zinc-300">{flowId}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Payload snapshot</h2>
        </div>

        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{JSON.stringify(event.payload ?? {}, null, 2)}
        </pre>
      </section>
    </div>
  );
}
