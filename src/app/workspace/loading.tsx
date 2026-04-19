export default function WorkspaceLoading() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <div className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            Workspace loading
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            Chargement workspace…
          </h1>
          <p className="mt-3 text-zinc-400">
            Si tu vois ce message, la branche /workspace répond bien.
          </p>
        </div>
      </div>
    </main>
  );
}
