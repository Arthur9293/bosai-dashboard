export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="flex min-h-[72px] items-center justify-between px-4 sm:px-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
            Workspace
          </div>
          <div className="mt-1 text-sm font-medium text-white">
            Default workspace
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
            Multi-workspace ready
          </div>

          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            Read-only API
          </div>
        </div>
      </div>
    </header>
  );
}
