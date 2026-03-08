type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-white/50">{description}</p>
      ) : null}
    </div>
  );
}
