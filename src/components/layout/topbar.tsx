type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="border-b border-white/10 bg-neutral-950/70 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-white/50">BOSAI SaaS V1</p>
        </div>

        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
          PROD
        </div>
      </div>
    </header>
  );
}
