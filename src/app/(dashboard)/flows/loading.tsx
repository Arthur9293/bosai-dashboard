export default function LoadingFlowsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="space-y-5 p-5 sm:p-6 lg:p-8">
          <div className="space-y-3">
            <div className="h-7 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
            <div className="h-8 w-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-white/10" />
            <div className="h-5 w-full max-w-3xl animate-pulse rounded-xl bg-zinc-200 dark:bg-white/10" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-black/20"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
                <div className="mt-3 h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
                <div className="mt-2 h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="space-y-5 p-5 sm:p-6 lg:p-8">
          <div className="h-6 w-56 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-10 w-24 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-6"
            >
              <div className="space-y-4">
                <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
                <div className="h-7 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((__, cardIndex) => (
                    <div
                      key={cardIndex}
                      className="h-16 animate-pulse rounded-2xl bg-zinc-200 dark:bg-white/10"
                    />
                  ))}
                </div>
                <div className="h-20 animate-pulse rounded-3xl bg-zinc-200 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
