import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchIncidents,
  type IncidentItem,
  type IncidentsResponse,
} from "@/lib/api";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
): string {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName(): string {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
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

  if (hasResolvedAt) return "resolved";

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

function getIncidentStatusBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const status = getIncidentStatusNormalized(incident);

  if (status === "resolved") return "success";
  if (status === "escalated") return "retry";
  if (status === "open") return "running";
  return "unknown";
}

function getIncidentSeverityBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const severity = getIncidentSeverityNormalized(incident);

  if (severity === "critical") return "failed";
  if (severity === "high") return "failed";
  if (severity === "medium") return "retry";
  if (severity === "low") return "success";
  return "unknown";
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

function getDecisionBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const decision = getDecisionStatus(incident).toLowerCase();

  if (["escalate", "escalated"].includes(decision)) return "incident";
  if (["resolve", "resolved"].includes(decision)) return "success";
  if (["retry", "retriable"].includes(decision)) return "retry";
  if (decision) return "queued";
  return "unknown";
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

function getIncidentSlaBadgeKind(
  incident: IncidentItem
): DashboardStatusKind {
  const resolvedLike =
    Boolean(toText(incident.resolved_at, "")) ||
    getIncidentStatusNormalized(incident) === "resolved";

  if (resolvedLike) return "success";

  const sla = toText(incident.sla_status, "").toLowerCase();

  if (sla === "breached") return "failed";
  if (sla === "warning") return "retry";
  if (sla === "ok") return "success";

  const remaining = toNumber(incident.sla_remaining_minutes, Number.NaN);
  if (Number.isFinite(remaining) && remaining < 0) return "failed";

  return "unknown";
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

function getFlowHref(incident: IncidentItem): string {
  const target = getBestFlowTargetFromIncident(incident);
  return target ? `/flows/${encodeURIComponent(target)}` : "";
}

function getCommandHref(incident: IncidentItem): string {
  const commandRecord = getCommandRecord(incident);
  if (!commandRecord || commandRecord === "—") return "";
  return `/commands/${encodeURIComponent(commandRecord)}`;
}

function getIncidentHref(incident: IncidentItem): string {
  return `/incidents/${encodeURIComponent(String(incident.id))}`;
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

function getShellBadgeToneFromStatus(incident: IncidentItem): string {
  const status = getIncidentStatusNormalized(incident);
  if (status === "resolved") return "success";
  if (status === "escalated") return "warning";
  if (status === "open") return "info";
  return "muted";
}

function getShellBadgeToneFromSeverity(incident: IncidentItem): string {
  const severity = getIncidentSeverityNormalized(incident);
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "low") return "success";
  return "muted";
}

function getShellBadgeToneFromSla(incident: IncidentItem): string {
  const sla = getSlaLabel(incident).toLowerCase();
  if (sla === "resolved" || sla === "ok") return "success";
  if (sla === "warning") return "warning";
  if (sla === "breached") return "danger";
  return "muted";
}

function MetaValueLink({
  href,
  value,
}: {
  href: string;
  value: string;
}) {
  if (!href || !value || value === "—") {
    return <span className="text-zinc-200">{value || "—"}</span>;
  }

  return (
    <Link
      href={href}
      className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
    >
      {value}
    </Link>
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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

  const flowHref = getFlowHref(incident);
  const commandHref = getCommandHref(incident);
  const remainingMinutes = toNumber(incident.sla_remaining_minutes, Number.NaN);

  const shellBadges: { label: string; tone?: string }[] = [
    { label: statusLabel, tone: getShellBadgeToneFromStatus(incident) },
    { label: severityLabel, tone: getShellBadgeToneFromSeverity(incident) },
    { label: `SLA ${slaLabel}`, tone: getShellBadgeToneFromSla(incident) },
  ];

  if (decisionStatus) {
    shellBadges.push({
      label: `DECISION ${decisionStatus.toUpperCase()}`,
      tone: "muted",
    });
  }

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title={title}
      description="Lecture détaillée d’un incident BOSAI avec contexte, orchestration et navigation croisée vers les objets liés."
      badges={shellBadges}
      metrics={[
        { label: "Opened", value: formatDate(openedAt) },
        { label: "Updated", value: formatDate(updatedAt) },
        { label: "Resolved", value: formatDate(resolvedAt) },
        {
          label: "Priority",
          value: String(priorityScore),
          toneClass: "text-white",
          helper: Number.isFinite(remainingMinutes)
            ? `${remainingMinutes} min SLA`
            : undefined,
        },
      ]}
      actions={
        <>
          <Link href="/incidents" className={actionLinkClassName("soft")}>
            Retour aux incidents
          </Link>

          {flowHref ? (
            <Link href={flowHref} className={actionLinkClassName("soft")}>
              Ouvrir le flow lié
            </Link>
          ) : null}

          {commandHref ? (
            <Link href={commandHref} className={actionLinkClassName("primary")}>
              Ouvrir la command liée
            </Link>
          ) : null}
        </>
      }
      aside={
        <>
          <SidePanelCard title="Résumé incident">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={getIncidentStatusBadgeKind(incident)}
                  label={statusLabel}
                />
                <DashboardStatusBadge
                  kind={getIncidentSeverityBadgeKind(incident)}
                  label={severityLabel}
                />
                <DashboardStatusBadge
                  kind={getIncidentSlaBadgeKind(incident)}
                  label={`SLA ${slaLabel}`}
                />
                {decisionStatus ? (
                  <DashboardStatusBadge
                    kind={getDecisionBadgeKind(incident)}
                    label={`DECISION ${decisionStatus.toUpperCase()}`}
                  />
                ) : null}
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Workspace : <span className="text-white/90">{workspace}</span>
                </div>
                <div>
                  Flow :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(
                      flowId || sourceRecordId || rootEventId || "—"
                    )}
                  </span>
                </div>
                <div>
                  Command :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(commandRecord)}
                  </span>
                </div>
                <div>
                  Activité :{" "}
                  <span className="text-white/90">
                    {formatDate(updatedAt || openedAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Action suggérée</div>
                <div className="mt-1 text-zinc-200">{suggestedAction}</div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Navigation">
            <div className="space-y-3">
              <Link href="/incidents" className={actionLinkClassName("soft")}>
                Retour à la liste incidents
              </Link>

              <Link href="/incidents" className={actionLinkClassName("primary")}>
                Voir tous les incidents
              </Link>

              {flowHref ? (
                <Link href={flowHref} className={actionLinkClassName("soft")}>
                  Ouvrir le flow lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir le flow lié
                </span>
              )}

              {commandHref ? (
                <Link href={commandHref} className={actionLinkClassName("soft")}>
                  Ouvrir la command liée
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir la command liée
                </span>
              )}
            </div>
          </SidePanelCard>
        </>
      }
    >
      <SectionCard
        title="Contexte incident"
        description="Contexte opérationnel, source et informations utiles pour comprendre l’incident."
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Catégorie</div>
            <div className="mt-2 text-zinc-100">{category}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Raison</div>
            <div className="mt-2 text-zinc-100">{reason}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Workspace</div>
            <div className="mt-2 text-zinc-100">{workspace}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Source</div>
            <div className="mt-2 text-zinc-100">
              {toText(incident.source, "Incidents")}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Worker</div>
            <div className="mt-2 text-zinc-100">{toText(incident.worker, "—")}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Error ID</div>
            <div className="mt-2 break-all text-zinc-100">{errorId}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Action suggérée</div>
            <div className="mt-1 text-zinc-200">{suggestedAction}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Dernière action</div>
            <div className="mt-2 text-zinc-100">{lastAction}</div>
          </div>

          <div className="md:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Note de résolution</div>
            <div className="mt-1 text-zinc-200">{resolutionNote}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Décision & orchestration"
        description="Éléments de pilotage utilisés pour l’escalade, la résolution ou l’action suivante."
        tone="neutral"
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Décision</div>
            <div className="mt-2 text-zinc-100">{decisionStatus || "—"}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Priority score</div>
            <div className="mt-2 text-zinc-100">{priorityScore}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>SLA</div>
            <div className="mt-2 text-zinc-100">{slaLabel}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>SLA restant</div>
            <div className="mt-2 text-zinc-100">
              {Number.isFinite(remainingMinutes) ? `${remainingMinutes} min` : "—"}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Raison décision</div>
            <div className="mt-1 text-zinc-200">{decisionReason || "—"}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Next action</div>
            <div className="mt-1 text-zinc-200">{nextAction || "—"}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Liens BOSAI"
        description="Objets liés pour naviguer entre l’incident, le flow, la command et les identifiants techniques."
        tone="neutral"
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Flow"
            value={
              <MetaValueLink
                href={flowHref}
                value={flowId || sourceRecordId || rootEventId || "—"}
              />
            }
            breakAll
          />

          <MetaItem label="Root event" value={rootEventId || "—"} breakAll />

          <MetaItem label="Source record" value={sourceRecordId || "—"} breakAll />

          <MetaItem label="Run record" value={runRecord} breakAll />

          <MetaItem
            label="Command"
            value={<MetaValueLink href={commandHref} value={commandRecord} />}
            breakAll
          />

          <MetaItem label="Record ID" value={String(incident.id)} breakAll />
        </div>
      </SectionCard>
    </ControlPlaneShell>
  );
}
