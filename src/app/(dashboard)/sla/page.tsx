import Link from "next/link";
import { fetchSla, type SlaItem, type SlaResponse } from "@/lib/api";

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/5 text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  return `${base} border border-white/10 bg-white/5 text-white hover:bg-white/10`;
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.22em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toText(item, "");
      if (candidate) return candidate;
    }
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toTextOrEmpty(value: unknown): string {
  return toText(value, "");
}

function toNumber(value: unknown, fallback = Number.NaN): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getSlaTitle(item: SlaItem): string {
  return (
    toTextOrEmpty(item.title) ||
    toTextOrEmpty(item.name) ||
    toTextOrEmpty(item.category) ||
    toTextOrEmpty(item.reason) ||
    (item.id ? `SLA ${item.id}` : "SLA item")
  );
}

function getSlaStatusNormalized(item: SlaItem): string {
  const raw = toText(item.sla_status, "").toLowerCase();

  if (["ok"].includes(raw)) return "ok";
  if (["warning", "warn"].includes(raw)) return "warning";
  if (["breached", "breach"].includes(raw)) return "breached";
  if (["escalated", "escalade", "escaladé"].includes(raw)) return "escalated";

  return "unknown";
}

function getSlaStatusLabel(item: SlaItem): string {
  const normalized = getSlaStatusNormalized(item);

  if (normalized === "ok") return "OK";
  if (normalized === "warning") return "WARNING";
  if (normalized === "breached") return "BREACHED";
  if (normalized === "escalated") return "ESCALATED";

  return "UNKNOWN";
}

function getSlaTone(item: SlaItem): string {
  const status = getSlaStatusNormalized(item);

  if (status === "ok") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (status === "escalated") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getRemainingMinutes(item: SlaItem): string {
  const value =
    toNumber(item.sla_remaining_minutes) || toNumber(item.remaining_minutes);

  return Number.isFinite(value) ? `${value} min` : "—";
}

function getLastCheck(item: SlaItem): string {
  return (
    toTextOrEmpty(item.last_sla_check) ||
    toTextOrEmpty(item.updated_at) ||
    toTextOrEmpty(item.created_at) ||
    ""
  );
}

function getWorkspace(item: SlaItem): string {
  return toTextOrEmpty(item.workspace_id) || toTextOrEmpty(item.workspace) || "—";
}

function getFlowTarget(item: SlaItem): string {
  return (
    toTextOrEmpty(item.flow_id) ||
    toTextOrEmpty(item.root_event_id) ||
    toTextOrEmpty(item.source_record_id) ||
    ""
  );
}

function getCommandTarget(item: SlaItem): string {
  return (
    toTextOrEmpty(item.linked_command) ||
    toTextOrEmpty(item.command_id) ||
    ""
  );
}

function getRunTarget(item: SlaItem): string {
  return (
    toTextOrEmpty(item.run_record_id) ||
    toTextOrEmpty(item.linked_run) ||
    toTextOrEmpty(item.run_id) ||
    "—"
  );
}

function statValue(value?: number): number {
  return typeof value === "number" ? value : 0;
}

export default async function SlaPage() {
  let data: SlaResponse | null = null;

  try {
    data = await fetchSla(100);
  } catch {
    data = null;
  }

  const items: SlaItem[] = Array.isArray(data?.incidents) ? data.incidents : [];
  const stats = data?.stats ?? {};

  const sortedItems = [...items].sort((a, b) => {
    const aTs = new Date(getLastCheck(a) || 0).getTime();
    const bTs = new Date(getLastCheck(b) || 0).getTime();
    return bTs - aTs;
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            SLA
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Vue SLA du cockpit BOSAI. Cette page affiche les signaux OK, Warning,
            Breached, Escalated et la file d’escalade.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">OK</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
            {statValue(stats.ok)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Warning</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-300">
            {statValue(stats.warning)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Breached</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-red-300">
            {statValue(stats.breached)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Escalated</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-rose-300">
            {statValue(stats.escalated)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Queued</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-violet-300">
            {statValue(stats.escalation_queued)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Unknown</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-300">
            {statValue(stats.unknown)}
          </div>
        </div>
      </section>

      {sortedItems.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500">
          Aucun signal SLA visible pour le moment.
        </section>
      ) : (
        <section className="space-y-4">
          {sortedItems.map((item) => {
            const id = String(item.id || "");
            const title = getSlaTitle(item);
            const flowTarget = getFlowTarget(item);
            const commandTarget = getCommandTarget(item);
            const hasFlow = flowTarget !== "";
            const hasCommand = commandTarget !== "";

            return (
              <article key={id} className={cardClassName()}>
                <div className="flex h-full flex-col gap-5">
                  <div className="space-y-4 border-b border-white/10 pb-4">
                    <div className={sectionLabelClassName()}>BOSAI SLA</div>

                    <div className="space-y-3">
                      <div className="block break-words text-xl font-semibold tracking-tight text-white">
                        {title}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSlaTone(
                            item
                          )}`}
                        >
                          {getSlaStatusLabel(item)}
                        </span>

                        {item.escalation_queued ? (
                          <span className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                            ESCALATION QUEUED
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                      <span>
                        Workspace:{" "}
                        <span className="text-zinc-300">{getWorkspace(item)}</span>
                      </span>
                      <span>
                        Remaining:{" "}
                        <span className="text-zinc-300">{getRemainingMinutes(item)}</span>
                      </span>
                      <span>
                        Last check:{" "}
                        <span className="text-zinc-300">
                          {formatDate(getLastCheck(item))}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <div className={metaLabelClassName()}>Record ID</div>
                      <div className="mt-1 break-all text-zinc-200">{id}</div>
                    </div>

                    <div>
                      <div className={metaLabelClassName()}>Flow</div>
                      <div className="mt-1 break-all text-zinc-200">
                        {flowTarget || "—"}
                      </div>
                    </div>

                    <div>
                      <div className={metaLabelClassName()}>Command</div>
                      <div className="mt-1 break-all text-zinc-200">
                        {commandTarget || "—"}
                      </div>
                    </div>

                    <div>
                      <div className={metaLabelClassName()}>Run</div>
                      <div className="mt-1 break-all text-zinc-200">
                        {getRunTarget(item)}
                      </div>
                    </div>

                    <div>
                      <div className={metaLabelClassName()}>Category</div>
                      <div className="mt-1 text-zinc-200">
                        {toText(item.category, "—")}
                      </div>
                    </div>

                    <div>
                      <div className={metaLabelClassName()}>Reason</div>
                      <div className="mt-1 break-words text-zinc-200">
                        {toText(item.reason, "—")}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {hasFlow ? (
                      <Link
                        href={`/flows/${encodeURIComponent(flowTarget)}`}
                        className={actionLinkClassName("primary")}
                      >
                        Ouvrir le flow lié
                      </Link>
                    ) : (
                      <span className={actionLinkClassName("primary", true)}>
                        Ouvrir le flow lié
                      </span>
                    )}

                    {hasCommand ? (
                      <Link
                        href={`/commands/${encodeURIComponent(commandTarget)}`}
                        className={actionLinkClassName("soft")}
                      >
                        Ouvrir la command liée
                      </Link>
                    ) : (
                      <span className={actionLinkClassName("soft", true)}>
                        Ouvrir la command liée
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
