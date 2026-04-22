function cardClassName(): string {
  return "rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

export default function OverviewLoading() {
  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>BOSAI Control Plane</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SkeletonBlock className="h-7 w-36 rounded-full" />
            <SkeletonBlock className="h-7 w-36 rounded-full" />
            <SkeletonBlock className="h-7 w-44 rounded-full" />
            <SkeletonBlock className="h-7 w-32 rounded-full" />
          </div>

          <div className="mt-5 space-y-4">
            <SkeletonBlock className="h-12 w-56" />
            <SkeletonBlock className="h-5 w-full max-w-3xl" />
            <SkeletonBlock className="h-5 w-full max-w-2xl" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <div className="sm:col-span-2">
              <SkeletonBlock className="h-28 w-full" />
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>Signal summary</div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-8 w-40" />
              <SkeletonBlock className="h-4 w-56" />
            </div>

            <SkeletonBlock className="h-7 w-32 rounded-full" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>

          <div className="mt-4">
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className={`${statCardClassName()} col-span-2 xl:col-span-1`}>
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-4 h-10 w-24" />
          <SkeletonBlock className="mt-3 h-4 w-24" />
        </div>

        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={statCardClassName()}>
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-24" />
            <SkeletonBlock className="mt-3 h-4 w-32" />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <div className={sectionLabelClassName()}>Needs attention</div>
          <SkeletonBlock className="h-8 w-72" />
          <SkeletonBlock className="h-5 w-full max-w-3xl" />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={cardClassName()}>
            <SkeletonBlock className="h-7 w-52" />
            <div className="mt-5 space-y-3">
              <SkeletonBlock className="h-36 w-full" />
              <SkeletonBlock className="h-36 w-full" />
            </div>
          </div>

          <div className={cardClassName()}>
            <SkeletonBlock className="h-7 w-52" />
            <div className="mt-5 space-y-3">
              <SkeletonBlock className="h-36 w-full" />
              <SkeletonBlock className="h-36 w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <div className={sectionLabelClassName()}>Operational lanes</div>
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-5 w-full max-w-3xl" />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-32 w-full" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <div className={sectionLabelClassName()}>System snapshot</div>
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-5 w-full max-w-3xl" />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-56 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
