export default function LoadingWorkspacesPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="h-10 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="h-5 w-[32rem] max-w-full animate-pulse rounded bg-zinc-900" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5"
              >
                <div className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                <div className="mt-3 h-8 w-20 animate-pulse rounded bg-zinc-700" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-zinc-900" />
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-zinc-900" />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
            <div className="mt-4 h-8 w-48 animate-pulse rounded bg-zinc-700" />
            <div className="mt-2 h-4 w-40 animate-pulse rounded bg-zinc-900" />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((__, innerIndex) => (
                <div
                  key={innerIndex}
                  className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4"
                >
                  <div className="h-3 w-12 animate-pulse rounded bg-zinc-800" />
                  <div className="mt-2 h-6 w-16 animate-pulse rounded bg-zinc-700" />
                  <div className="mt-1 h-4 w-14 animate-pulse rounded bg-zinc-900" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
