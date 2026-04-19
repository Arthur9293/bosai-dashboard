import type { ReactNode } from "react";

type DashboardCardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function DashboardCard({
  title,
  subtitle,
  rightSlot,
  footer,
  className = "",
  children,
}: DashboardCardProps) {
  const hasHeader = Boolean(title || subtitle || rightSlot);
  const hasContent = Boolean(children);
  const hasFooter = Boolean(footer);

  return (
    <section
      className={[
        "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      ].join(" ")}
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {title}
              </h2>
            ) : null}

            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-zinc-400">{subtitle}</p>
            ) : null}
          </div>

          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      ) : null}

      {hasContent ? (
        <div className={hasHeader ? "mt-5" : ""}>{children}</div>
      ) : null}

      {hasFooter ? (
        <div className={hasContent || hasHeader ? "mt-5" : ""}>{footer}</div>
      ) : null}
    </section>
  );
}
