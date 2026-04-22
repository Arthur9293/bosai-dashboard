function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function skeletonClassName(shape: string): string {
  return `animate-pulse rounded-2xl bg-white/[0.06] ${shape}`;
}

function EventCardSkeleton() {
  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={skeletonClassName("h-3 w-28")} />

          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className={skeletonClassName("h-7 w-56")} />
                <div className={skeletonClassName("h-4 w-44")} />
              </div>

              <div className={skeletonClassName("h-8 w-28 rounded-full")} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={skeletonClassName("h-8 w-28 rounded-full")} />
              <div className={skeletonClassName("h-8 w-36 rounded-full")} />
              <div className={skeletonClassName("h-8 w-40 rounded-full")} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4"
            >
              <div className={skeletonClassName("h-3 w-20")} />
              <div className={skeletonClassName("mt-3 h-5 w-full")} />
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          <div className={skeletonClassName("h-11 w-full rounded-full")} />
          <div className={skeletonClassName("h-11 w-full rounded-full")} />
          <div className={skeletonClassName("h-11 w-full rounded-full")} />
        </div>
      </div>
    </article>
  );
}

export default function EventsLoading() {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={cardClassName()}>
          <div className="space-y-5">
            <div className={skeletonClassName("h-4 w-40")} />

            <div className="space-y-3">
              <div className={skeletonClassName("h-10 w-44")} />
              <div className={skeletonClassName("h-5 w-full max-w-3xl")} />
              <div className={skeletonClassName("h-5 w-full max-w-2xl")} />
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={statCardClassName()}>
                  <div className={skeletonClassName("h-4 w-16")} />
                  <div className={skeletonClassName("mt-3 h-10 w-20")} />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <div className={skeletonClassName("h-11 w-36 rounded-full")} />
              <div className={skeletonClassName("h-11 w-36 rounded-full")} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardClassName()}>
            <div className="space-y-4">
              <div className={skeletonClassName("h-6 w-32")} />
              <div className="flex flex-wrap gap-2">
                <div className={skeletonClassName("h-8 w-32 rounded-full")} />
                <div className={skeletonClassName("h-8 w-36 rounded-full")} />
              </div>
              <div className="space-y-2">
                <div className={skeletonClassName("h-4 w-full")} />
                <div className={skeletonClassName("h-4 w-[88%]")} />
                <div className={skeletonClassName("h-4 w-[78%]")} />
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className={skeletonClassName("h-3 w-24")} />
                <div className={skeletonClassName("mt-3 h-4 w-full")} />
                <div className={skeletonClassName("mt-2 h-4 w-[90%]")} />
              </div>
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="space-y-4">
              <div className={skeletonClassName("h-6 w-28")} />
              <div className={skeletonClassName("h-4 w-32")} />
              <div className="flex flex-wrap gap-2">
                <div className={skeletonClassName("h-8 w-28 rounded-full")} />
                <div className={skeletonClassName("h-8 w-36 rounded-full")} />
              </div>
              <div className="space-y-2">
                <div className={skeletonClassName("h-4 w-full")} />
                <div className={skeletonClassName("h-4 w-[82%]")} />
                <div className={skeletonClassName("h-4 w-[72%]")} />
              </div>
              <div className="flex flex-col gap-2">
                <div className={skeletonClassName("h-11 w-full rounded-full")} />
                <div className={skeletonClassName("h-11 w-full rounded-full")} />
                <div className={skeletonClassName("h-11 w-full rounded-full")} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className={skeletonClassName("h-7 w-40")} />
              <div className={skeletonClassName("h-5 w-full max-w-2xl")} />
            </div>
            <div className={skeletonClassName("h-8 w-14 rounded-full")} />
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className={statCardClassName()}>
                <div className={skeletonClassName("h-4 w-16")} />
                <div className={skeletonClassName("mt-3 h-10 w-16")} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4"
              >
                <div className={skeletonClassName("h-3 w-24")} />
                <div className={skeletonClassName("mt-3 h-5 w-full")} />
              </div>
            ))}
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
            <div className={skeletonClassName("h-3 w-24")} />
            <div className={skeletonClassName("mt-3 h-4 w-full")} />
            <div className={skeletonClassName("mt-2 h-4 w-[92%]")} />
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className={skeletonClassName("h-7 w-44")} />
              <div className={skeletonClassName("h-5 w-full max-w-2xl")} />
            </div>
            <div className={skeletonClassName("h-8 w-14 rounded-full")} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className={skeletonClassName("h-7 w-52")} />
              <div className={skeletonClassName("h-5 w-full max-w-2xl")} />
            </div>
            <div className={skeletonClassName("h-8 w-14 rounded-full")} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}
