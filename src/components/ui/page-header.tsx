type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
          {eyebrow}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
