export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h2 className="text-sm text-white/60 mb-2">{title}</h2>
      <div className="text-xl font-semibold">{children}</div>
    </div>
  );
}
