export function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();

  let color = "bg-gray-500";

  if (s === "done") color = "bg-emerald-500";
  if (s === "running") color = "bg-blue-500";
  if (s === "error") color = "bg-red-500";
  if (s === "queued") color = "bg-yellow-500";

  return (
    <span className={`px-2 py-1 text-xs rounded ${color}`}>
      {status}
    </span>
  );
}
