import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const marker = "Incident Detail V3.7-dry-run-confirmation-gate";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.7 déjà présent dans page.tsx. Aucune modification.");
  process.exit(0);
}

const requiredMarkers = [
  "Incident Detail V3.0-operator-action-console",
  "Incident Detail V3.1-execution-path-polish",
  "Incident Detail V3.2-execution-preview",
  "Incident Detail V3.3-safe-execution-intent",
  "Incident Detail V3.4-minimal-safe-run-draft-anchor",
  "Incident Detail V3.5-dry-run-readiness-review",
  "Incident Detail V3.6-dry-run-payload-preview",
];

for (const required of requiredMarkers) {
  if (!source.includes(required)) {
    console.error(`${required} introuvable. Patch V3.7 arrêté pour préserver la baseline.`);
    process.exit(1);
  }
}

if (!source.includes("executionPathHealth")) {
  console.error("Variable executionPathHealth introuvable. Patch V3.7 arrêté.");
  process.exit(1);
}

const v36Index = source.indexOf("Incident Detail V3.6-dry-run-payload-preview");
const anchorText = "Linked Execution Path";
const anchorIndex = source.indexOf(anchorText, v36Index);

if (anchorIndex === -1) {
  console.error("Linked Execution Path introuvable après V3.6. Patch V3.7 arrêté.");
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
          const confirmationGateStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "READY TO CONFIRM"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "REVIEW REQUIRED"
                : "CONFIRMATION BLOCKED";

          const confirmationGateRecommendation =
            confirmationGateStatus === "READY TO CONFIRM"
              ? "Le contexte est prêt pour une future confirmation opérateur, mais aucune exécution n’est armée."
              : confirmationGateStatus === "REVIEW REQUIRED"
                ? "Le contexte doit être revu avant toute future préparation de dry run."
                : "La confirmation reste bloquée tant que le chemin d’exécution est incomplet.";

          const confirmationGateItems = [
            { label: "Payload preview affiché", status: "OK" },
            { label: "Readiness review disponible", status: "OK" },
            { label: "Execution intent non armée", status: "LOCKED" },
            { label: "POST /run désactivé", status: "NO EXECUTION" },
            { label: "Worker call désactivé", status: "LOCKED" },
            { label: "Mutation Airtable désactivée", status: "LOCKED" },
            { label: "Confirmation humaine requise", status: "REQUIRED" },
            { label: "Future dry run non branché", status: "GATED" },
          ];

          const confirmationBadgeClassName = (status: string) => {
            if (status === "READY TO CONFIRM" || status === "OK") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "REVIEW REQUIRED" || status === "REQUIRED" || status === "GATED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-amber-400/20 bg-amber-950/15 p-4 shadow-[0_0_90px_rgba(245,158,11,0.06)] sm:p-5">
              {/* Incident Detail V3.7-dry-run-confirmation-gate */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/70">
                    Dry Run Confirmation Gate
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Porte de confirmation opérateur
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Dernière barrière visuelle avant un futur dry run. Cette section prépare la
                    confirmation humaine sans déclencher aucun appel, aucune action et aucune mutation.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={\`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] \${confirmationBadgeClassName(confirmationGateStatus)}\`}>
                    {confirmationGateStatus}
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                    CONFIRMATION REQUIRED
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NO EXECUTION
                  </span>
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
                    GATED
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Gate Status", confirmationGateStatus],
                  ["Execution Mode", "CONFIRMATION ONLY"],
                  ["POST /run", "DISABLED"],
                  ["Worker Call", "DISABLED"],
                  ["Airtable Mutation", "DISABLED"],
                  ["Human Confirmation", "REQUIRED"],
                  ["Future Dry Run", "GATED"],
                  ["Current Action", "NO EXECUTION"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Confirmation Recommendation
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {confirmationGateRecommendation}
                </p>

                <button
                  type="button"
                  disabled
                  className="mt-4 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70 sm:w-auto"
                >
                  Confirm dry run preparation
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-100/70">
                  Final Confirmation Checklist
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {confirmationGateItems.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-semibold leading-6 text-white">
                          {item.label}
                        </p>

                        <span className={\`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] \${confirmationBadgeClassName(item.status)}\`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Execution Lock
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO POST /run
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO WORKER CALL
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                    NO AIRTABLE MUTATION
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                    OPERATOR CONFIRMATION REQUIRED
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

`;

source = source.slice(0, insertIndex) + block + source.slice(insertIndex);

fs.writeFileSync(filePath, source, "utf8");

console.log("V3.7 Dry Run Confirmation Gate injecté dans page.tsx.");
console.log("Insertion placée après V3.6 et avant Linked Execution Path.");
console.log("Patch visuel uniquement : aucun fetch, aucun POST, aucun worker, aucune mutation.");
