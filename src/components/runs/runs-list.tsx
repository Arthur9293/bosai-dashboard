type Run = {
  id: string;
  capability?: string;
  status?: string;
  worker?: string;
  started_at?: string;
};

type Props = {
  runs: Run[];
};

export function RunsList({ runs }: Props) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 text-lg font-semibold">Recent Runs</div>

      <div className="space-y-2">
        {runs.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2"
          >
            <div className="text-sm">
              {run.capability || "run"}
            </div>

            <div className="text-xs text-white/50">
              {run.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
