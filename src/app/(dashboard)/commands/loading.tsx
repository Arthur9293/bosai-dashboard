export default function CommandsLoading() {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
          <div className="mt-5 h-12 w-56 animate-pulse rounded bg-white/10" />
          <div className="mt-3 h-6 w-full max-w-3xl animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-6 w-full max-w-2xl animate-pulse rounded bg-white/10" />

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-white/10" />
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/10" />
            </div>

            <div className="sm:col-span-2 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-8 w-44 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-5 w-56 animate-pulse rounded bg-white/10" />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-8 w-14 animate-pulse rounded bg-white/10" />
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-8 w-14 animate-pulse rounded bg-white/10" />
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-8 w-14 animate-pulse rounded bg-white/10" />
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-8 w-14 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-10 w-16 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-6 w-full max-w-2xl animate-pulse rounded bg-white/10" />

        {Array.from({ length: 3 }).map((_, index) => (
          <article
            key={index}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-8 w-64 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-white/10" />

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((__, metaIndex) => (
                <div
                  key={metaIndex}
                  className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4"
                >
                  <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-5 w-full animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>

            <div className="mt-5 h-12 w-full animate-pulse rounded-full bg-white/10" />
          </article>
        ))}
      </section>
    </div>
  );
}
