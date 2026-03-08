type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-3 text-xs text-white/40">{hint}</div> : null}
    </div>
  );
}
