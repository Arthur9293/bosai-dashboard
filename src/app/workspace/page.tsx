export default function WorkspaceIndexPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
        <div className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Workspace test
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          PING WORKSPACE OK
        </h1>
        <p className="mt-3 text-zinc-400">
          Si tu vois ceci, la branche /workspace rend bien du contenu.
        </p>
      </div>
    </main>
  );
}
