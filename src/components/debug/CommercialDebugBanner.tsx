import type { ReactNode } from "react";

type DebugItem = {
  label: string;
  value: ReactNode;
};

type CommercialDebugBannerProps = {
  title: string;
  items: DebugItem[];
};

export function CommercialDebugBanner({
  title,
  items,
}: CommercialDebugBannerProps) {
  return (
    <div className="sticky top-0 z-[9999] border-b border-red-500/40 bg-red-950/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 text-red-50 sm:px-6 lg:px-8">
        <div className="text-[11px] uppercase tracking-[0.24em] text-red-200/80">
          {title}
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={String(item.label)}
              className="rounded-xl border border-red-400/20 bg-black/25 px-3 py-2"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-red-200/70">
                {item.label}
              </div>
              <div className="mt-1 break-all text-sm text-white">
                {item.value || "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
