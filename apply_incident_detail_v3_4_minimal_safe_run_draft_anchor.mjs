import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";

const marker = "Incident Detail V3.4-minimal-safe-run-draft-anchor";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.4 minimal déjà présent dans page.tsx. Aucune modification.");
  process.exit(0);
}

const required = [
  "Incident Detail V3.0-operator-action-console",
  "Incident Detail V3.1-execution-path-polish",
  "Incident Detail V3.2-execution-preview",
  "Incident Detail V3.3-safe-execution-intent",
];

for (const item of required) {
  if (!source.includes(item)) {
    console.error(`${item} introuvable. Patch arrêté.`);
    process.exit(1);
  }
}

const anchorText = "Linked Execution Path";
const anchorIndex = source.indexOf(anchorText);

if (anchorIndex === -1) {
  console.error("Texte Linked Execution Path introuvable.");
  process.exit(1);
}

// On cherche un début de bloc JSX juste avant le titre visible.
// Version robuste : accepte div, section ou article, avec n'importe quelle indentation.
const beforeAnchor = source.slice(0, anchorIndex);
const blockStartMatches = [...beforeAnchor.matchAll(/\n\s*<(div|section|article)\b[^>]*>/g)];

if (blockStartMatches.length === 0) {
  console.error("Aucun début de bloc JSX trouvé avant Linked Execution Path.");
  process.exit(1);
}

const lastMatch = blockStartMatches[blockStartMatches.length - 1];
const insertIndex = lastMatch.index;

if (typeof insertIndex !== "number" || insertIndex < 0) {
  console.error("Index d’insertion invalide.");
  process.exit(1);
}

const block = `
        <div className="rounded-[2rem] border border-amber-400/20 bg-amber-950/20 p-4 shadow-[0_0_80px_rgba(245,158,11,0.06)] sm:p-5">
          {/* Incident Detail V3.4-minimal-safe-run-draft-anchor */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/70">
                Safe Run Draft
              </p>
              <h3 className="text-xl font-semibold text-white">
                Brouillon sécurisé non armé
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                Point d’ancrage visuel pour le futur dry run. Cette carte ne lit aucune donnée dynamique,
                ne déclenche aucune action et ne modifie aucun système.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                DRAFT ONLY
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                NOT ARMED
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Endpoint
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-white">
                POST /run
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Affichage informatif uniquement.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Worker Call
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Disabled
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Aucun appel worker.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Airtable Mutation
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Disabled
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Aucune écriture base.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Execution State
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Safe Draft
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Préparation visuelle seulement.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
              Safety Lock
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                No POST /run
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                No Worker Call
              </span>
              <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                No Airtable Mutation
              </span>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                Human Confirmation Required
              </span>
            </div>
          </div>
        </div>

`;

source = source.slice(0, insertIndex) + block + source.slice(insertIndex);

fs.writeFileSync(filePath, source, "utf8");

console.log("V3.4 minimal injecté dans page.tsx.");
console.log("Injection placée juste avant Linked Execution Path.");
console.log("Aucune logique métier, aucun endpoint, aucun worker, aucune mutation modifiés.");
