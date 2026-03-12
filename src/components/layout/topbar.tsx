export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
          BOSAI Dashboard
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300">
          Production
        </div>
        <div className="rounded-full border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300">
          Stable
        </div>
      </div>
    </header>
  );
}
