import type { ReactNode } from "react";

type DashboardCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function DashboardCard({
  title,
  subtitle,
  children,
  rightSlot,
  className = "",
}: DashboardCardProps) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${className}`}
    >
      {(title || subtitle || rightSlot) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            ) : null}

            {subtitle ? (
              <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
            ) : null}
          </div>

          {rightSlot ? <div>{rightSlot}</div> : null}
        </div>
      )}

      {children}
    </section>
  );
}
