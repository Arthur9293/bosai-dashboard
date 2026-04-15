import type { ReactNode } from "react";

type BadgeTone = "default" | "info" | "success" | "warning" | "danger" | "muted";

type ShellBadge = {
  label: string;
  tone?: BadgeTone;
};

type ShellMetric = {
  label: string;
  value: ReactNode;
  hint?: string;
};

type ControlPlaneShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: ShellBadge[];
  metrics?: ShellMetric[];
  aside?: ReactNode;
  children: ReactNode;
  topMeta?: ReactNode;
  footerNote?: ReactNode;
};

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: "default" | "attention" | "neutral";
  compact?: boolean;
};

type SidePanelCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

function badgeToneClasses(tone: BadgeTone = "default"): string {
  switch (tone) {
    case "info":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "success":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "warning":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "danger":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "muted":
      return "border-white/10 bg-white/[0.04] text-white/60";
    default:
      return "border-white/10 bg-white/[0.06] text-white/80";
  }
}

function sectionToneClasses(tone: SectionCardProps["tone"] = "default"): string {
  switch (tone) {
    case "attention":
      return "border-amber-400/20 bg-white/[0.045]";
    case "neutral":
      return "border-white/8 bg-white/[0.03]";
    default:
      return "border-white/10 bg-white/[0.04]";
  }
}

export function StatusBadge({ label, tone = "default" }: ShellBadge) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        badgeToneClasses(tone),
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function SectionCountPill({
  value,
  tone = "default",
}: {
  value: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={[
        "inline-flex min-w-8 w-fit self-start items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium sm:self-auto",
        badgeToneClasses(tone),
      ].join(" ")}
    >
      {value}
    </span>
  );
}

export function EmptyStatePanel({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10">
      <div className="text-sm font-medium text-white/85">{title}</div>
      {description ? (
        <div className="mt-2 text-sm leading-6 text-white/55">{description}</div>
      ) : null}
    </div>
  );
}

export function InlineInfoStrip({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-2 text-sm text-white/85">{value}</div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  tone = "default",
  compact = false,
}: SectionCardProps) {
  return (
    <section
      className={[
        "rounded-2xl border shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]",
        sectionToneClasses(tone),
      ].join(" ")}
    >
      <div
        className={[
          "border-b border-white/8",
          compact ? "px-4 py-4 sm:px-5" : "px-4 py-4 sm:px-6 sm:py-5",
        ].join(" ")}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-wide text-white sm:text-base">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60">
                {description}
              </p>
            ) : null}
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className={compact ? "px-4 py-4 sm:px-5" : "px-4 py-4 sm:px-6 sm:py-6"}>
        {children}
      </div>
    </section>
  );
}

export function SidePanelCard({ title, subtitle, children }: SidePanelCardProps) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-5">
      <div className="border-b border-white/8 pb-3">
        <h3 className="text-sm font-semibold tracking-wide text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-white/60">{subtitle}</p> : null}
      </div>
      <div className="pt-4">{children}</div>
    </aside>
  );
}

function MetricCard({ label, value, hint }: ShellMetric) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

export function ControlPlaneShell({
  eyebrow = "BOSAI Control Plane",
  title,
  description,
  badges = [],
  metrics = [],
  aside,
  children,
  topMeta,
  footerNote,
}: ControlPlaneShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
      <div className="space-y-6 lg:space-y-8">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_24%),rgba(255,255,255,0.04)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {topMeta ? (
              <div className="mb-5 border-b border-white/8 pb-4">{topMeta}</div>
            ) : null}

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 max-w-4xl">
                <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-200/80">
                  {eyebrow}
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {title}
                </h1>

                {description ? (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65 sm:text-[15px]">
                    {description}
                  </p>
                ) : null}

                {badges.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <StatusBadge
                        key={`${badge.label}-${badge.tone ?? "default"}`}
                        label={badge.label}
                        tone={badge.tone}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="hidden shrink-0 lg:block">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Surface
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/85">Control Plane</div>
                  <div className="mt-1 text-xs text-white/50">Premium reading shell</div>
                </div>
              </div>
            </div>

            {metrics.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    hint={metric.hint}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <div className={aside ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8" : ""}>
          <main className="min-w-0 space-y-6">{children}</main>

          {aside ? (
            <div className="min-w-0">
              <div className="space-y-4 lg:sticky lg:top-24">{aside}</div>
            </div>
          ) : null}
        </div>

        {footerNote ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/55 sm:px-5">
            {footerNote}
          </div>
        ) : null}
      </div>
    </div>
  );
}
