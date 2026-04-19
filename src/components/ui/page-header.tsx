import type { ReactNode } from "react";

type HeaderBadgeTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "muted";

type HeaderBadge = {
  label: ReactNode;
  tone?: HeaderBadgeTone;
};

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  badges?: HeaderBadge[];
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
};

function badgeClassName(tone: HeaderBadgeTone = "default"): string {
  if (tone === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (tone === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (tone === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (tone === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (tone === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  if (tone === "muted") {
    return "inline-flex rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-medium text-zinc-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-200";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badges,
  actions,
  className = "",
  children,
}: PageHeaderProps) {
  const safeBadges = Array.isArray(badges) ? badges : [];

  return (
    <section
      className={[
        "space-y-4 border-b border-white/10 pb-6",
        className,
      ].join(" ")}
    >
      <div className="space-y-4 xl:flex xl:items-end xl:justify-between xl:gap-8 xl:space-y-0">
        <div className="max-w-4xl">
          {eyebrow ? (
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-400">
              {description}
            </p>
          ) : null}

          {safeBadges.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {safeBadges.map((badge, index) => (
                <span
                  key={`${String(badge.label)}-${index}`}
                  className={badgeClassName(badge.tone)}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>

      {children ? <div>{children}</div> : null}
    </section>
  );
}
