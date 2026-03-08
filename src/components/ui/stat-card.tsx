type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="text-sm text-white/50">{label}</div>

      <div className="mt-3 text-3xl font-semibold tracking-tight">
        {value}
      </div>

      {hint ? (
        <div className="mt-2 text-xs text-white/40">{hint}</div>
      ) : null}
    </div>
  );
}
