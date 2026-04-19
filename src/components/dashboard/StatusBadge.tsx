import type { ReactNode } from "react";

export type DashboardStatusTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export type DashboardStatusKind =
  | "running"
  | "failed"
  | "retry"
  | "success"
  | "partial"
  | "registry-only"
  | "incident"
  | "no-incident"
  | "queued"
  | "unknown";

export type DashboardStatusMeta = {
  kind: DashboardStatusKind;
  label: string;
  tone: DashboardStatusTone;
};

type DashboardStatusBadgeProps = {
  status?: string | null;
  label?: string;
  kind?: DashboardStatusKind;
  className?: string;
  compact?: boolean;
};

function cleanText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

export function normalizeDashboardStatus(
  input?: string | null
): DashboardStatusKind {
  const value = cleanText(input).toLowerCase();

  if (!value) return "unknown";

  if (
    [
      "running",
      "in_progress",
      "processing",
      "active",
      "en cours",
      "en_cours",
    ].includes(value)
  ) {
    return "running";
  }

  if (["queued", "pending", "new", "opened"].includes(value)) {
    return "queued";
  }

  if (["retry", "retries", "retrying"].includes(value)) {
    return "retry";
  }

  if (
    [
      "failed",
      "error",
      "dead",
      "blocked",
      "breached",
      "escalated",
      "échec",
    ].includes(value)
  ) {
    return "failed";
  }

  if (
    [
      "success",
      "done",
      "completed",
      "resolved",
      "closed",
      "ok",
      "succès",
    ].includes(value)
  ) {
    return "success";
  }

  if (["partial", "partiel"].includes(value)) {
    return "partial";
  }

  if (
    [
      "registry-only",
      "registry_only",
      "registre uniquement",
      "registre_uniquement",
    ].includes(value)
  ) {
    return "registry-only";
  }

  if (["incident", "incidents", "warning", "alert"].includes(value)) {
    return "incident";
  }

  if (
    [
      "no-incident",
      "no_incident",
      "sans incident",
      "aucun incident",
      "none",
    ].includes(value)
  ) {
    return "no-incident";
  }

  return "unknown";
}

export function getDashboardStatusMeta(
  input?: string | null,
  explicitLabel?: string,
  explicitKind?: DashboardStatusKind
): DashboardStatusMeta {
  const kind = explicitKind ?? normalizeDashboardStatus(input);

  switch (kind) {
    case "running":
      return {
        kind,
        label: explicitLabel ?? "EN COURS",
        tone: "info",
      };

    case "queued":
      return {
        kind,
        label: explicitLabel ?? "QUEUED",
        tone: "info",
      };

    case "retry":
      return {
        kind,
        label: explicitLabel ?? "RETRY",
        tone: "warning",
      };

    case "failed":
      return {
        kind,
        label: explicitLabel ?? "FAILED",
        tone: "danger",
      };

    case "success":
      return {
        kind,
        label: explicitLabel ?? "SUCCESS",
        tone: "success",
      };

    case "partial":
      return {
        kind,
        label: explicitLabel ?? "PARTIAL",
        tone: "warning",
      };

    case "registry-only":
      return {
        kind,
        label: explicitLabel ?? "REGISTRY ONLY",
        tone: "muted",
      };

    case "incident":
      return {
        kind,
        label: explicitLabel ?? "INCIDENT",
        tone: "danger",
      };

    case "no-incident":
      return {
        kind,
        label: explicitLabel ?? "Aucun incident",
        tone: "muted",
      };

    default:
      return {
        kind: "unknown",
        label: explicitLabel ?? "UNKNOWN",
        tone: "muted",
      };
  }
}

export function getDashboardStatusClasses(
  tone: DashboardStatusTone,
  compact = false
): string {
  const base = [
    "inline-flex items-center justify-center rounded-full border font-medium leading-none tracking-[0.16em]",
    compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
  ].join(" ");

  const toneClasses: Record<DashboardStatusTone, string> = {
    default:
      "border-white/10 bg-white/[0.06] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
    info:
      "border-sky-500/20 bg-sky-500/15 text-sky-300 shadow-[inset_0_1px_0_rgba(125,211,252,0.08)]",
    success:
      "border-emerald-500/20 bg-emerald-500/15 text-emerald-300 shadow-[inset_0_1px_0_rgba(110,231,183,0.08)]",
    warning:
      "border-amber-500/20 bg-amber-500/15 text-amber-300 shadow-[inset_0_1px_0_rgba(253,230,138,0.08)]",
    danger:
      "border-rose-500/20 bg-rose-500/15 text-rose-300 shadow-[inset_0_1px_0_rgba(253,164,175,0.08)]",
    muted:
      "border-zinc-700 bg-zinc-800 text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
  };

  return `${base} ${toneClasses[tone]}`;
}

export function DashboardStatusBadge({
  status,
  label,
  kind,
  className = "",
  compact = false,
}: DashboardStatusBadgeProps) {
  const meta = getDashboardStatusMeta(status, label, kind);

  return (
    <span
      className={`${getDashboardStatusClasses(meta.tone, compact)} ${className}`.trim()}
    >
      {meta.label}
    </span>
  );
}

type DashboardStatusGroupProps = {
  items: Array<{
    status?: string | null;
    label?: string;
    kind?: DashboardStatusKind;
    key?: string;
  }>;
  className?: string;
  compact?: boolean;
};

export function DashboardStatusGroup({
  items,
  className = "",
  compact = false,
}: DashboardStatusGroupProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {items.map((item, index) => {
        const meta = getDashboardStatusMeta(item.status, item.label, item.kind);
        const key = item.key ?? `${meta.kind}-${meta.label}-${index}`;

        return (
          <DashboardStatusBadge
            key={key}
            status={item.status}
            label={item.label}
            kind={item.kind}
            compact={compact}
          />
        );
      })}
    </div>
  );
}

type DashboardStatusLegendItem = {
  label: string;
  tone: DashboardStatusTone;
  icon?: ReactNode;
};

export function DashboardStatusLegend({
  items,
  className = "",
}: {
  items: DashboardStatusLegendItem[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {items.map((item) => (
        <span
          key={`${item.label}-${item.tone}`}
          className={getDashboardStatusClasses(item.tone, true)}
        >
          {item.icon ? <span className="mr-1 inline-flex">{item.icon}</span> : null}
          {item.label}
        </span>
      ))}
    </div>
  );
}
