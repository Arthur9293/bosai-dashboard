import { fetchEvents } from "../../../lib/api";

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

type EventStats = {
  new?: number;
  queued?: number;
  processed?: number;
  ignored?: number;
  error?: number;
  other?: number;
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

function linkageTone(linked: boolean) {
  if (linked) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function flowTone(linked: boolean) {
  if (linked) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
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

function isLinked(evt: EventItem) {
  return evt.command_created === true || getLinkedCommandValue(evt) !== "—";
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

function hasFlow(evt: EventItem) {
  return getFlowId(evt) !== "—";
}

export default async function EventsPage() {
  let data: any = null;

  try {
    data = await fetchEvents();
  } catch {
    data = null;
  }

  const events: EventItem[] = data?.events ?? [];
  const stats = (data?.stats ?? {}) as EventStats;

  const newEvents = stats.new ?? 0;
  const queued = stats.queued ?? 0;
  const processed = stats.processed ?? 0;
  const ignored = stats.ignored ?? 0;
  const error = stats.error ?? 0;

  const list = [...events]
    .sort(
      (a, b) =>
        new Date(b.processed_at || 0).getTime() -
        new Date(a.processed_at || 0).getTime()
    )
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Events
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Pipeline Event → Command → Flow BOSAI.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          ["New", newEvents],
          ["Queued", queued],
          ["Processed", processed],
          ["Ignored", ignored],
          ["Errors", error],
        ].map(([label, value]) => (
          <div key={label} className={cardClassName()}>
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {value}
            </div>
          </div>
        ))}
      </section>

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-500">
            Aucun event affiché.
          </div>
        ) : (
          list.map((evt) => {
            const linked = isLinked(evt);
            const linkedCommand = getLinkedCommandValue(evt);
            const flowId = getFlowId(evt);
            const flowLinked = hasFlow(evt);

            return (
              <div
                key={evt.id}
                className="rounded-xl border border-white/10 bg-black/30 p-4 transition hover:bg-white/5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {evt.event_type || "event"}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-white">
                        {evt.mapped_capability || evt.event_type || "Unknown event"}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                          evt.status
                        )}`}
                      >
                        {(evt.status || "unknown").toUpperCase()}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${linkageTone(
                          linked
                        )}`}
                      >
                        {linked ? "LINKED" : "UNLINKED"}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${flowTone(
                          flowLinked
                        )}`}
                      >
                        {flowLinked ? "FLOW LINKED" : "NO FLOW"}
                      </span>
                    </div>

                    <div className="break-all text-sm text-zinc-400">
                      ID: <span className="text-zinc-300">{evt.id}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        Capability:{" "}
                        <span className="text-zinc-300">
                          {evt.mapped_capability || "—"}
                        </span>
                      </div>

                      <div>
                        Command:{" "}
                        <span className="break-all text-zinc-300">
                          {linkedCommand}
                        </span>
                      </div>

                      <div>
                        Flow:{" "}
                        <span className="break-all text-zinc-300">
                          {flowId}
                        </span>
                      </div>

                      <div>
                        Run:{" "}
                        <span className="break-all text-zinc-300">
                          {evt.run_id || "—"}
                        </span>
                      </div>

                      <div>
                        Processed:{" "}
                        <span className="text-zinc-300">
                          {formatDate(evt.processed_at)}
                        </span>
                      </div>

                      <div>
                        Source:{" "}
                        <span className="text-zinc-300">{evt.source || "—"}</span>
                      </div>

                      <div>
                        Command created:{" "}
                        <span className="text-zinc-300">
                          {evt.command_created === true ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 xl:min-w-[120px] xl:text-right">
                    EVENT SIGNAL
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
