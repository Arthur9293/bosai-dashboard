import Link from "next/link";
import type { ReactNode } from "react";

export type SectionCountTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

type LegacyPanelTone = "default" | "attention" | "neutral";

type ShellBadge = {
  label: string;
  tone?: SectionCountTone | string;
};

type ShellMetric = {
  label: string;
  value: ReactNode;
  toneClass?: string;
  helper?: string;
};

function normalizeTone(value?: string): SectionCountTone {
  if (value === "info") return "info";
  if (value === "success") return "success";
  if (value === "warning") return "warning";
  if (value === "danger") return "danger";
  if (value === "muted") return "muted";
  return "default";
}

function dashboardPageTitleClassName(): string {
  return "max-w-full break-words text-[clamp(2.15rem,9vw,4.4rem)] font-semibold leading-[0.92] tracking-[-0.03em] text-white [overflow-wrap:anywhere]";
}

function dashboardSectionTitleClassName(): string {
  return "break-words text-[clamp(1.75rem,6.5vw,2.2rem)] font-semibold leading-[0.98] tracking-tight text-white [overflow-wrap:anywhere]";
}

function dashboardSideTitleClassName(): string {
  return "break-words text-[clamp(1.55rem,5.4vw,1.95rem)] font-semibold leading-[0.98] tracking-tight text-white [overflow-wrap:anywhere]";
}

export function dashboardCardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

export function dashboardRowCardClassName(): string {
  return "block w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.04]";
}

export function dashboardSectionLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.24em] text-zinc-500 sm:text-xs";
}

export function dashboardMetaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

export function dashboardButtonClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  fullWidth = false
): string {
  const base = [
    "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition",
    fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function sectionCountToneClass(tone: SectionCountTone): string {
  if (tone === "info") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-300 shadow-[inset_0_1px_0_rgba(125,211,252,0.08)]";
  }

  if (tone === "success") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shadow-[inset_0_1px_0_rgba(110,231,183,0.08)]";
  }

  if (tone === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-[inset_0_1px_0_rgba(253,230,138,0.08)]";
  }

  if (tone === "danger") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300 shadow-[inset_0_1px_0_rgba(253,164,175,0.08)]";
  }

  if (tone === "muted") {
    return "border-zinc-700 bg-zinc-800 text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
}

function legacyPanelToneClass(tone: LegacyPanelTone): string {
  if (tone === "attention") {
    return "border-amber-500/20 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)] shadow-[inset_0_1px_0_rgba(251,191,36,0.08)]";
  }

  if (tone === "neutral") {
    return "border-white/10 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.06),transparent_46%),linear-gradient(180deg,rgba(7,18,43,0.68)_0%,rgba(3,8,22,0.54)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
  }

  return "border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

export function SectionCountPill({
  value,
  tone = "default",
  className = "",
}: {
  value: number | string;
  tone?: SectionCountTone;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex min-w-9 items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-medium leading-none tracking-[0.12em]",
        sectionCountToneClass(tone),
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {value}
    </span>
  );
}

export function EmptyStatePanel({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        dashboardCardClassName(),
        "border-dashed bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.06),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.01)_100%)] px-5 py-8 md:px-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-3">
        <div className={dashboardSectionLabelClassName()}>Empty state</div>
        <div className="text-xl font-semibold tracking-tight text-white">{title}</div>
        <p className="max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
      </div>

      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function DashboardPageHeader({
  eyebrow = "BOSAI Dashboard",
  title,
  description,
  actions,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={["space-y-4 border-b border-white/10 pb-5 sm:pb-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={dashboardSectionLabelClassName()}>{eyebrow}</div>

      <div className="space-y-4 xl:flex xl:items-end xl:justify-between xl:gap-8 xl:space-y-0">
        <div className="max-w-4xl min-w-0">
          <h1 className={dashboardPageTitleClassName()}>{title}</h1>

          {description ? (
            <p className="mt-3 max-w-3xl text-[15px] leading-8 text-zinc-400 sm:text-lg sm:leading-8">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:flex-wrap xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}

export function DashboardSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["space-y-4", className].filter(Boolean).join(" ")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow ? (
            <div className={dashboardSectionLabelClassName()}>{eyebrow}</div>
          ) : null}

          {title ? <div className={dashboardSectionTitleClassName()}>{title}</div> : null}

          {description ? (
            <p className="max-w-3xl text-[15px] leading-8 text-zinc-400 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}

export function DashboardCard({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
}) {
  const paddingClass =
    padding === "none" ? "" : padding === "sm" ? "p-4 md:p-5" : "p-4 md:p-5 lg:p-6";

  return (
    <div
      className={[dashboardCardClassName(), paddingClass, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function DashboardMetricCard({
  label,
  value,
  toneClass = "text-white",
  helper,
}: {
  label: string;
  value: number | string | ReactNode;
  toneClass?: string;
  helper?: string;
}) {
  return (
    <DashboardCard className="min-h-[140px]">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight sm:text-4xl ${toneClass}`}>
        {value}
      </div>
      {helper ? <div className="mt-3 text-sm text-zinc-300">{helper}</div> : null}
    </DashboardCard>
  );
}

export function DashboardInlineMetric({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export function DashboardLaneCard({
  eyebrow = "BOSAI Lane",
  title,
  subtitle,
  href,
  badge,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: ReactNode;
}) {
  return (
    <Link href={href} className={dashboardRowCardClassName()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={dashboardMetaLabelClassName()}>{eyebrow}</div>
          <div className="mt-2 break-words text-lg font-semibold tracking-tight text-white [overflow-wrap:anywhere]">
            {title}
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</div>
        </div>

        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTROL PLANE SHELL                                                        */
/* -------------------------------------------------------------------------- */

export function ControlPlaneShell({
  children,
  className = "",
  eyebrow,
  title,
  description,
  badges,
  metrics,
  aside,
  actions,
}: {
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  badges?: ShellBadge[];
  metrics?: ShellMetric[];
  aside?: ReactNode;
  actions?: ReactNode;
}) {
  const hasHeader =
    Boolean(eyebrow) ||
    Boolean(title) ||
    Boolean(description) ||
    Boolean(actions) ||
    Boolean(badges?.length) ||
    Boolean(metrics?.length);

  const header = hasHeader ? (
    <section className="space-y-5 border-b border-white/10 pb-5 sm:pb-6">
      {eyebrow ? (
        <div className={dashboardSectionLabelClassName()}>{eyebrow}</div>
      ) : null}

      <div className="space-y-4 xl:flex xl:items-end xl:justify-between xl:gap-8 xl:space-y-0">
        <div className="max-w-4xl min-w-0">
          {title ? <h1 className={dashboardPageTitleClassName()}>{title}</h1> : null}

          {description ? (
            <p className="mt-3 max-w-3xl text-[15px] leading-8 text-zinc-400 sm:text-lg sm:leading-8">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:flex-wrap xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {badges && badges.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {badges.map((badge, index) => (
            <span
              key={`${badge.label}-${index}`}
              className={[
                "inline-flex max-w-full rounded-full border px-3 py-1.5 text-sm font-medium",
                sectionCountToneClass(normalizeTone(badge.tone)),
              ].join(" ")}
            >
              <span className="whitespace-normal break-words">{badge.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      {metrics && metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <DashboardMetricCard
              key={`${metric.label}-${index}`}
              label={metric.label}
              value={metric.value}
              toneClass={metric.toneClass ?? "text-white"}
              helper={metric.helper}
            />
          ))}
        </div>
      ) : null}
    </section>
  ) : null;

  if (aside) {
    return (
      <div
        className={[
          "grid gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="min-w-0 space-y-6 lg:space-y-8">
          {header}
          {children}
        </div>

        <div className="hidden space-y-5 lg:space-y-6 xl:block">{aside}</div>
      </div>
    );
  }

  return (
    <div className={["space-y-6 lg:space-y-8", className].filter(Boolean).join(" ")}>
      {header}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LEGACY COMPAT EXPORTS                                                      */
/* -------------------------------------------------------------------------- */

type LegacyCardProps = {
  title?: string;
  subtitle?: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  tone?: LegacyPanelTone;
};

export function SectionCard({
  title,
  subtitle,
  description,
  eyebrow,
  action,
  children,
  className = "",
  padding = "md",
  tone = "default",
}: LegacyCardProps) {
  const resolvedDescription = description ?? subtitle;
  const paddingClass =
    padding === "none" ? "" : padding === "sm" ? "p-4 md:p-5" : "p-4 md:p-5 lg:p-6";

  return (
    <div
      className={[
        "rounded-[28px] border",
        legacyPanelToneClass(tone),
        paddingClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title || resolvedDescription || eyebrow || action ? (
        <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <div className={dashboardSectionLabelClassName()}>{eyebrow}</div>
            ) : null}

            {title ? <div className={dashboardSectionTitleClassName()}>{title}</div> : null}

            {resolvedDescription ? (
              <p className="max-w-3xl text-[15px] leading-8 text-zinc-400 sm:text-base">
                {resolvedDescription}
              </p>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}

export function SidePanelCard({
  title,
  subtitle,
  description,
  eyebrow,
  action,
  children,
  className = "",
  padding = "md",
  tone = "default",
}: LegacyCardProps) {
  const resolvedDescription = description ?? subtitle;
  const paddingClass =
    padding === "none" ? "" : padding === "sm" ? "p-4 md:p-5" : "p-4 md:p-5 lg:p-6";

  return (
    <aside
      className={[
        "rounded-[28px] border",
        legacyPanelToneClass(tone),
        paddingClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title || resolvedDescription || eyebrow || action ? (
        <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5">
          <div className="min-w-0 space-y-2">
            {eyebrow ? (
              <div className={dashboardSectionLabelClassName()}>{eyebrow}</div>
            ) : null}

            {title ? <div className={dashboardSideTitleClassName()}>{title}</div> : null}

            {resolvedDescription ? (
              <p className="text-sm leading-6 text-zinc-400">{resolvedDescription}</p>
            ) : null}
          </div>

          {action ? <div>{action}</div> : null}
        </div>
      ) : null}

      {children}
    </aside>
  );
}
