import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";

const marker = "Incident Detail V3.5-dry-run-readiness-review";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.5 déjà présent dans page.tsx. Aucune modification.");
  process.exit(0);
}

const requiredMarkers = [
  "Incident Detail V3.0-operator-action-console",
  "Incident Detail V3.1-execution-path-polish",
  "Incident Detail V3.2-execution-preview",
  "Incident Detail V3.3-safe-execution-intent",
  "Incident Detail V3.4-minimal-safe-run-draft-anchor",
];

for (const required of requiredMarkers) {
  if (!source.includes(required)) {
    console.error(`${required} introuvable. Patch V3.5 arrêté pour préserver la baseline.`);
    process.exit(1);
  }
}

if (!source.includes("executionPathHealth")) {
  console.error("Variable executionPathHealth introuvable. Patch V3.5 arrêté.");
  process.exit(1);
}

const anchorText = "Linked Execution Path";
const anchorIndex = source.indexOf(anchorText);

if (anchorIndex === -1) {
  console.error("Linked Execution Path introuvable. Patch V3.5 arrêté.");
  process.exit(1);
}

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
        {(() => {
          {/* Incident Detail V3.5-dry-run-readiness-review */}
          const dryRunReadinessStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "READY FOR DRY RUN"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "PARTIAL READINESS"
                : executionPathHealth === "MISSING PATH"
                  ? "BLOCKED"
                  : "NOT EXECUTABLE";

          const dryRunRecommendation =
            dryRunReadinessStatus === "READY FOR DRY RUN"
              ? "Le contexte est suffisant pour préparer un futur dry run contrôlé."
              : dryRunReadinessStatus === "PARTIAL READINESS"
                ? "Le contexte est partiel : vérifier la meilleure surface disponible avant toute simulation future."
                : dryRunReadinessStatus === "BLOCKED"
                  ? "Le contexte est incomplet : impossible de préparer un dry run fiable."
                  : "Sécurité par défaut : aucune exécution ne peut être préparée depuis cet état.";

          const dryRunReadinessItems = [
            {
              label: "Workspace identifié",
              status: dryRunReadinessStatus === "BLOCKED" || dryRunReadinessStatus === "NOT EXECUTABLE" ? "MISSING" : "OK",
              note: "Contexte workspace requis pour tout dry run futur.",
            },
            {
              label: "Incident identifié",
              status: dryRunReadinessStatus === "BLOCKED" || dryRunReadinessStatus === "NOT EXECUTABLE" ? "MISSING" : "OK",
              note: "Incident source nécessaire pour garder la traçabilité.",
            },
            {
              label: "Command liée disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : dryRunReadinessStatus === "PARTIAL READINESS" ? "MISSING" : "MISSING",
              note: "Surface d’action prioritaire pour une simulation contrôlée.",
            },
            {
              label: "Run lié disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : "MISSING",
              note: "Run utile pour relier l’exécution simulée à l’historique.",
            },
            {
              label: "Flow lié disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : dryRunReadinessStatus === "PARTIAL READINESS" ? "MISSING" : "MISSING",
              note: "Flow requis pour comprendre la chaîne complète.",
            },
            {
              label: "Root event disponible",
              status: dryRunReadinessStatus === "READY FOR DRY RUN" ? "OK" : "MISSING",
              note: "Événement racine utile pour conserver la causalité.",
            },
            {
              label: "Dry run draft visible",
              status: "OK",
              note: "Le brouillon V3.4 est visible et non armé.",
            },
            {
              label: "Execution intent non armée",
              status: "LOCKED",
              note: "L’intention reste strictement non exécutable.",
            },
            {
              label: "Safety guardrails visibles",
              status: "OK",
              note: "Les garde-fous de sécurité restent affichés.",
            },
            {
              label: "Confirmation humaine requise",
              status: "REQUIRED",
              note: "Aucune future exécution sans validation opérateur.",
            },
          ];

          const dryRunBadgeClassName = (status: string) => {
            if (status === "READY FOR DRY RUN" || status === "OK") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "PARTIAL READINESS" || status === "REQUIRED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-950/15 p-4 shadow-[0_0_80px_rgba(16,185,129,0.06)] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                    Dry Run Readiness Review
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Revue de préparation dry run
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Vérification visuelle locale du contexte avant un futur dry run contrôlé.
                    Aucun appel worker, aucun POST /run et aucune mutation ne sont exécutés.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={\`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] \${dryRunBadgeClassName(dryRunReadinessStatus)}\`}>
                    {dryRunReadinessStatus}
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NO EXECUTION
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Readiness Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {dryRunReadinessStatus}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Safety Check
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    NO EXECUTION
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Worker Call
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    NO WORKER CALL
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Airtable Mutation
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    NO AIRTABLE MUTATION
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Dry Run Recommendation
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {dryRunRecommendation}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70"
                  >
                    {dryRunReadinessStatus === "READY FOR DRY RUN"
                      ? "Dry run readiness checked"
                      : "Dry run not executable yet"}
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/70">
                  Readiness Checklist
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {dryRunReadinessItems.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">
                            {item.label}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            {item.note}
                          </p>
                        </div>

                        <span className={\`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] \${dryRunBadgeClassName(item.status)}\`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Safety Check
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO EXECUTION
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO WORKER CALL
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO AIRTABLE MUTATION
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    HUMAN CONFIRMATION REQUIRED
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

`;

source = source.slice(0, insertIndex) + block + source.slice(insertIndex);

fs.writeFileSync(filePath, source, "utf8");

console.log("V3.5 Dry Run Readiness Review injecté dans page.tsx.");
console.log("Insertion placée avant Linked Execution Path.");
console.log("Patch visuel uniquement : aucun worker, aucun endpoint, aucune mutation modifiés.");
