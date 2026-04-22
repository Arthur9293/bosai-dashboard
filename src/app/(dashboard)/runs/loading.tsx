function cardClassName(): string {
  return [
    "rounded-[28px] border border-white/10 p-5 md:p-6",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.76)_0%,rgba(3,8,22,0.56)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function asidePanelClassName(): string {
  return "bg-[radial-gradient(100%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_52%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function statCardClassName(): string {
  return [
    "rounded-[24px] border border-white/10 p-4 md:p-5",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.72)_0%,rgba(3,9,24,0.54)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function sectionFrameClassName(
  tone: "default" | "attention" | "neutral" = "default"
): string {
  if (tone === "attention") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  if (tone === "neutral") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.06),transparent_46%),linear-gradient(180deg,rgba(7,18,43,0.68)_0%,rgba(3,8,22,0.54)_100%)]";
  }

  return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function Skeleton({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export default function RunsLoading() {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={cardClassName()}>
          <div className="space-y-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-5 w-full max-w-3xl" />
              <Skeleton className="h-5 w-full max-w-2xl" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={statCardClassName()}>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-3 h-10 w-20" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Skeleton className="h-11 w-full rounded-full" />
              <Skeleton className="h-11 w-full rounded-full" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`${cardClassName()} ${asidePanelClassName()}`}>
            <Skeleton className="h-6 w-36" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[84%]" />
            </div>
          </div>

          <div className={`${cardClassName()} ${asidePanelClassName()}`}>
            <Skeleton className="h-6 w-28" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-[78%]" />
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-4 w-[66%]" />
            </div>
          </div>

          <div className={`${cardClassName()} ${asidePanelClassName()}`}>
            <Skeleton className="h-6 w-24" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-4 w-[72%]" />
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardClassName()} ${sectionFrameClassName("neutral")}`}>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="min-w-0 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className={`${cardClassName()} ${sectionFrameClassName("default")}`}>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={statCardClassName()}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-10 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-20 w-full" />
      </section>

      <section className={`${cardClassName()} ${sectionFrameClassName("attention")}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Skeleton className="h-7 w-52" />
            <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[28px] border border-white/10 p-5 md:p-6 bg-[linear-gradient(180deg,rgba(8,20,48,0.76)_0%,rgba(3,8,22,0.56)_100%)]"
            >
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="mt-4 h-8 w-48" />
              <Skeleton className="mt-3 h-4 w-40" />
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((__, innerIndex) => (
                  <div
                    key={innerIndex}
                    className="min-w-0 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3"
                  >
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${cardClassName()} ${sectionFrameClassName("neutral")}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Skeleton className="h-7 w-44" />
            <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5">
          <div className="rounded-[28px] border border-white/10 p-5 md:p-6 bg-[linear-gradient(180deg,rgba(8,20,48,0.76)_0%,rgba(3,8,22,0.56)_100%)]">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="mt-4 h-8 w-56" />
            <Skeleton className="mt-3 h-4 w-44" />
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-w-0 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-3 h-5 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
