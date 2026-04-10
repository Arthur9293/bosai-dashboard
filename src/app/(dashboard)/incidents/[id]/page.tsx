import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function statCardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function toText(value: unknown, fallback = ""): string {
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function firstText(values: unknown[], fallback = ""): string {
  for (const value of values) {
    const text = toText(value, "");
    if (text) return text;
  }
  return fallback;
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return typeof value === "string" ? value : "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function safeUpper(text: string): string {
  return text.trim() ? text.trim().toUpperCase() : "—";
}

function getIncidentTitle(incident: IncidentItem): string {
  return firstText(
    [incident.title, incident.name, incident.error_id],
    "Untitled incident"
  );
}

function getIncidentStatusRaw(incident: IncidentItem): string {
  return firstText([incident.status, incident.statut_incident], "");
}

function getIncidentSeverityRaw(incident: IncidentItem): string {
  return firstText([incident.severity], "");
}

function getIncidentStatusNormalized(incident: IncidentItem): string {
  const raw = getIncidentStatusRaw(incident).toLowerCase();
  const sla = toText(incident.sla_status, "").toLowerCase();
  const hasResolvedAt = Boolean(toText(incident.resolved_at, ""));

  if (hasResolvedAt) {
    return "resolved";
  }

  if (!raw) {
    if (sla === "breached") return "open";
    return "open";
  }

  if (["open", "opened", "new", "active", "en cours"].includes(raw)) {
    return "open";
  }

  if (["escalated", "escalade", "escaladé"].includes(raw)) {
    return "escalated";
  }

  if (["resolved", "closed", "done", "résolu", "resolve"].includes(raw)) {
    return "resolved";
  }

  return raw;
}

function getIncidentStatusLabel(incident: IncidentItem): string {
  const normalized = getIncidentStatusNormalized(incident);

  if (normalized === "open") return "OPEN";
  if (normalized === "escalated") return "ESCALATED";
  if (normalized === "resolved") return "RESOLVED";

  const raw = getIncidentStatusRaw(incident);
  return raw ? raw.toUpperCase() : "OPEN";
}

function getIncidentSeverityNormalized(incident: IncidentItem): string {
  const raw = getIncidentSeverityRaw(incident).toLowerCase();

  if (!raw) {
    if (toText(incident.sla_status, "").toLowerCase() === "breached") {
      return "critical";
    }
    return "unknown";
  }

  if (["critical", "critique"].includes(raw)) return "critical";
  if (["high", "élevé", "eleve"].includes(raw)) return "high";
  if (["warning", "warn", "medium", "moyen"].includes(raw)) return "medium";
  if (["low", "faible"].includes(raw)) return "low";

  return raw;
}

function getIncidentSeverityLabel(incident: IncidentItem): string {
  const normalized = getIncidentSeverityNormalized(incident);

  if (normalized === "critical") return "CRITICAL";
  if (normalized === "high") return "HIGH";
  if (normalized === "medium") return "MEDIUM";
  if (normalized === "low") return "LOW";

  const raw = getIncidentSeverityRaw(incident);
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

function statusTone(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);

  if (status === "resolved") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "escalated") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "open") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function severityTone(incident: IncidentItem): string {
  const severity = getIncidentSeverityNormalized(incident);

  if (severity === "critical") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (severity === "high") {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (severity === "medium") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (severity === "low") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getDecisionStatus(incident: IncidentItem): string {
  return toText(incident.decision_status, "");
}

function getDecisionReason(incident: IncidentItem): string {
  return toText(incident.decision_reason, "");
}

function getNextAction(incident: IncidentItem): string {
  return toText(incident.next_action, "");
}

function getPriorityScore(incident: IncidentItem): number {
  return toNumber(incident.priority_score, 0);
}

function getDecisionTone(incident: IncidentItem): string {
  const decision = getDecisionStatus(incident).toLowerCase();

  if (["escalate", "escalated"].includes(decision)) {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (["resolve", "resolved"].includes(decision)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["retry", "retriable"].includes(decision)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (decision) {
    return "bg-purple-500/15 text-purple-300 border border-purple-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getSlaLabel(incident: IncidentItem): string {
  const resolvedLike =
    Boolean(toText(incident.resolved_at, "")) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "RESOLVED";

  const sla = toText(incident.sla_status, "");
  if (sla) return sla.toUpperCase();

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) {
    return "BREACHED";
  }

  return "—";
}

function getSlaTone(incident: IncidentItem): string {
  const resolvedLike =
    Boolean(toText(incident.resolved_at, "")) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  const sla = toText(incident.sla_status, "").toLowerCase();

  if (sla === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (sla === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (sla === "ok") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getOpenedAt(incident: IncidentItem): string {
  return firstText([incident.opened_at, incident.created_at], "");
}

function getUpdatedAt(incident: IncidentItem): string {
  return firstText([incident.updated_at, incident.created_at], "");
}

function getResolvedAt(incident: IncidentItem): string {
  const resolvedAt = toText(incident.resolved_at, "");
  if (resolvedAt) return resolvedAt;

  if (getIncidentStatusNormalized(incident) === "resolved") {
    return firstText([incident.updated_at, incident.created_at], "");
  }

  return "";
}

function getWorkspace(incident: IncidentItem): string {
  return firstText([incident.workspace_id, incident.workspace], "—");
}

function getRunRecord(incident: IncidentItem): string {
  return firstText(
    [incident.run_record_id, incident.linked_run, incident.run_id],
    "—"
  );
}

function getCommandRecord(incident: IncidentItem): string {
  return firstText([incident.command_id, incident.linked_command], "—");
}

function getFlowId(incident: IncidentItem): string {
  return toText(incident.flow_id, "");
}

function getRootEventId(incident: IncidentItem): string {
  return toText(incident.root_event_id, "");
}

function getSourceRecordId(incident: IncidentItem): string {
  return toText((incident as Record<string, unknown>).source_record_id, "");
}

function getCategory(incident: IncidentItem): string {
  return firstText([incident.category], "—");
}

function getReason(incident: IncidentItem): string {
  return firstText([incident.reason], "—");
}

function getSuggestedAction(incident: IncidentItem): string {
  const nextAction = getNextAction(incident);
  if (nextAction) return nextAction;

  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);

  if (status === "escalated") return "Review escalated incident";
  if (severity === "critical") return "Prioritize immediate review";
  if (toText(incident.sla_status, "").toLowerCase() === "breached") {
    return "Review SLA breach";
  }
  if (status === "resolved") return "Verify final resolution state";

  return "Monitor flow and resolution";
}

function getResolutionNote(incident: IncidentItem): string {
  return toText(incident.resolution_note, "—");
}

function getLastAction(incident: IncidentItem): string {
  return toText(incident.last_action, "—");
}

function getBestFlowTargetFromIncident(incident: IncidentItem): string {
  return (
    getFlowId(incident) ||
    getSourceRecordId(incident) ||
    getRootEventId(incident) ||
    ""
  );
}

function getSourceFlowHref(incident: IncidentItem): string {
  const target = getBestFlowTargetFromIncident(incident);
  return target ? `/flows/${encodeURIComponent(target)}` : "";
}

function getLinkedFlowHref(incident: IncidentItem): string {
  const target = getBestFlowTargetFromIncident(incident);
  return target ? `/flows/${encodeURIComponent(target)}` : "";
}

function getLinkedCommandHref(incident: IncidentItem): string {
  const commandRecord = getCommandRecord(incident);
  if (!commandRecord || commandRecord === "—") return "";
  return `/commands/${encodeURIComponent(commandRecord)}`;
}

function getLinkedEventHref(incident: IncidentItem): string {
  const target =
    getSourceRecordId(incident) ||
    getRootEventId(incident) ||
    getFlowId(incident) ||
    "";

  if (!target) return "";
  return `/events/${encodeURIComponent(target)}`;
}

function getSummaryLine(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  const severity = getIncidentSeverityNormalized(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);

  return `${safeUpper(status)} · ${safeUpper(severity)} · ${workspace} · ${category}`;
}

function isLegacyNoiseIncident(incident: IncidentItem): boolean {
  const title = getIncidentTitle(incident).trim().toLowerCase();
  const category = getCategory(incident).trim().toLowerCase();
  const reason = getReason(incident).trim().toLowerCase();
  const errorId = toText(incident.error_id, "");
  const resolutionNote = toText(incident.resolution_note, "");
  const lastAction = toText(incident.last_action, "");
  const flowId = getFlowId(incident);
  const rootEventId = getRootEventId(incident);
  const sourceRecordId = getSourceRecordId(incident);
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);

  const isGenericTitle = title === "incident" || title === "untitled incident";
  const isGenericCategory =
    category === "" || category === "—" || category === "unknown_incident";
  const isGenericReason =
    reason === "" || reason === "—" || reason === "incident_create";

  const hasNoLinking =
    flowId === "" &&
    rootEventId === "" &&
    sourceRecordId === "" &&
    (commandRecord === "" || commandRecord === "—") &&
    (runRecord === "" || runRecord === "—");

  const hasStrongBusinessSignal =
    errorId !== "" ||
    resolutionNote !== "" ||
    lastAction !== "" ||
    category === "http_failure" ||
    reason === "http_5xx_exhausted" ||
    reason === "http_status_error" ||
    reason === "forbidden_host" ||
    !hasNoLinking;

  return (
    isGenericTitle &&
    isGenericCategory &&
    isGenericReason &&
    !hasStrongBusinessSignal
  );
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "break-all" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-3 text-xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let data: IncidentsResponse | null = null;

  try {
    data = await fetchIncidents();
  } catch {
    data = null;
  }

  const incidents: IncidentItem[] = Array.isArray(data?.incidents)
    ? data.incidents
    : [];

  const cleanIncidents = incidents.filter(
    (item) => !isLegacyNoiseIncident(item)
  );

  const incident =
    cleanIncidents.find((item) => String(item.id) === id) ||
    cleanIncidents.find((item) => toText(item.error_id, "") === id) ||
    null;

  if (!incident) {
    notFound();
  }

  const title = getIncidentTitle(incident);
  const statusLabel = getIncidentStatusLabel(incident);
  const severityLabel = getIncidentSeverityLabel(incident);
  const openedAt = getOpenedAt(incident);
  const updatedAt = getUpdatedAt(incident);
  const resolvedAt = getResolvedAt(incident);
  const flowId = getFlowId(incident);
  const commandRecord = getCommandRecord(incident);
  const runRecord = getRunRecord(incident);
  const rootEventId = getRootEventId(incident);
  const sourceRecordId = getSourceRecordId(incident);
  const workspace = getWorkspace(incident);
  const category = getCategory(incident);
  const reason = getReason(incident);
  const suggestedAction = getSuggestedAction(incident);
  const slaLabel = getSlaLabel(incident);
  const resolutionNote = getResolutionNote(incident);
  const lastAction = getLastAction(incident);
  const errorId = toText(incident.error_id, "—");
  const decisionStatus = getDecisionStatus(incident);
  const decisionReason = getDecisionReason(incident);
  const nextAction = getNextAction(incident);
  const priorityScore = getPriorityScore(incident);

  const sourceFlowHref = getSourceFlowHref(incident);
  const linkedFlowHref = getLinkedFlowHref(incident);
  const linkedCommandHref = getLinkedCommandHref(incident);
  const linkedEventHref = getLinkedEventHref(incident);

  const remainingMinutes = toNumber(incident.sla_remaining_minutes, Number.NaN);

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-b border-white/10 pb-6">
        <div className="text-sm text-zinc-400">
          <Link
            href="/incidents"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Incidents
          </Link>{" "}
          / {title}
        </div>

        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>

        <div className="text-sm text-zinc-400">{getSummaryLine(incident)}</div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              incident
            )}`}
          >
            {statusLabel}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${severityTone(
              incident
            )}`}
          >
            {severityLabel}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${getSlaTone(
              incident
            )}`}
          >
            SLA {slaLabel}
          </span>

          {decisionStatus ? (
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${getDecisionTone(
                incident
              )}`}
            >
              DECISION {decisionStatus.toUpperCase()}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard label="Ouvert" value={formatDate(openedAt)} />
        <StatCard label="Mis à jour" value={formatDate(updatedAt)} />
        <StatCard label="Résolu" value={formatDate(resolvedAt)} />
        <StatCard
          label="SLA restant"
          value={
            Number.isFinite(remainingMinutes) ? `${remainingMinutes} min` : "—"
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 text-lg font-medium text-white">
            Contexte incident
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <MetaItem label="Catégorie" value={category} />
            <MetaItem label="Raison" value={reason} />
            <MetaItem label="Workspace" value={workspace} />
            <MetaItem label="Source" value={toText(incident.source, "Incidents")} />
            <MetaItem label="Worker" value={toText(incident.worker, "—")} />
            <MetaItem label="Error ID" value={errorId} />
            <MetaItem label="Dernière action" value={lastAction} />
            <MetaItem label="Note de résolution" value={resolutionNote} />
            <MetaItem
              label="Statut décision"
              value={
                <span className="text-purple-300">{decisionStatus || "—"}</span>
              }
            />
            <MetaItem label="Raison décision" value={decisionReason || "—"} />
            <MetaItem label="Next action" value={nextAction || "—"} />
            <MetaItem label="Priorité" value={String(priorityScore)} />

            <div className="md:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Action suggérée</div>
              <div className="mt-1 text-zinc-200">{suggestedAction}</div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Résumé</div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Statut</span>
              <span className="text-zinc-200">{statusLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Sévérité</span>
              <span className="text-zinc-200">{severityLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">SLA</span>
              <span className="text-zinc-200">{slaLabel}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Priorité</span>
              <span className="text-zinc-200">{priorityScore}</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <span className="text-zinc-400">Record ID</span>
              <span className="break-all text-right text-zinc-200">
                {String(incident.id)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 text-lg font-medium text-white">Liens BOSAI</div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <MetaItem
              label="Flow"
              value={
                linkedFlowHref ? (
                  <Link
                    href={linkedFlowHref}
                    className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                  >
                    {flowId || sourceRecordId || rootEventId}
                  </Link>
                ) : (
                  "—"
                )
              }
              breakAll
            />

            <MetaItem
              label="Root event"
              value={
                linkedEventHref && rootEventId ? (
                  <Link
                    href={linkedEventHref}
                    className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                  >
                    {rootEventId}
                  </Link>
                ) : (
                  rootEventId || "—"
                )
              }
              breakAll
            />

            <MetaItem
              label="Source record"
              value={
                linkedEventHref && sourceRecordId ? (
                  <Link
                    href={linkedEventHref}
                    className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                  >
                    {sourceRecordId}
                  </Link>
                ) : (
                  sourceRecordId || "—"
                )
              }
              breakAll
            />

            <MetaItem label="Run record" value={runRecord} breakAll />

            <MetaItem
              label="Command"
              value={
                linkedCommandHref ? (
                  <Link
                    href={linkedCommandHref}
                    className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                  >
                    {commandRecord}
                  </Link>
                ) : (
                  "—"
                )
              }
              breakAll
            />
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Navigation</div>

          <div className="space-y-3">
            <Link href="/incidents" className={actionLinkClassName("soft")}>
              Retour à la liste incidents
            </Link>

            <Link href="/incidents" className={actionLinkClassName("primary")}>
              Voir tous les incidents
            </Link>

            {sourceFlowHref ? (
              <Link href={sourceFlowHref} className={actionLinkClassName("soft")}>
                Retour au flow source
              </Link>
            ) : null}

            {linkedFlowHref && linkedFlowHref !== sourceFlowHref ? (
              <Link href={linkedFlowHref} className={actionLinkClassName("soft")}>
                Ouvrir le flow lié
              </Link>
            ) : null}

            {linkedEventHref ? (
              <Link href={linkedEventHref} className={actionLinkClassName("soft")}>
                Ouvrir l’event lié
              </Link>
            ) : null}

            {linkedCommandHref ? (
              <Link
                href={linkedCommandHref}
                className={actionLinkClassName("soft")}
              >
                Ouvrir la command liée
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
