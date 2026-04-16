export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#040816]/55 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/30">
            BOSAI Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200">
            Production
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200">
            Stable
          </div>
        </div>
      </div>
    </header>
  );
}
