import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const marker = "Incident Detail V3.8-dry-run-arm-switch-preview";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.8 déjà présent dans page.tsx. Aucune modification.");
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
  "Incident Detail V3.7-dry-run-confirmation-gate",
];

for (const required of requiredMarkers) {
  if (!source.includes(required)) {
    console.error(`${required} introuvable. Patch V3.8 arrêté pour préserver la baseline.`);
    process.exit(1);
  }
}

if (!source.includes("executionPathHealth")) {
  console.error("Variable executionPathHealth introuvable. Patch V3.8 arrêté.");
  process.exit(1);
}

const v37Index = source.indexOf("Incident Detail V3.7-dry-run-confirmation-gate");
const anchorText = "Linked Execution Path";
const anchorIndex = source.indexOf(anchorText, v37Index);

if (anchorIndex === -1) {
  console.error("Linked Execution Path introuvable après V3.7. Patch V3.8 arrêté.");
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
          const armPreviewStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "ARMING PREVIEW READY"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "ARMING REVIEW REQUIRED"
                : "ARMING BLOCKED";

          const armPreviewRecommendation =
            armPreviewStatus === "ARMING PREVIEW READY"
              ? "L’interface peut afficher le futur armement dry run, mais le switch reste désactivé."
              : armPreviewStatus === "ARMING REVIEW REQUIRED"
                ? "Le contexte doit être revu avant de préparer un futur armement dry run."
                : "L’armement reste bloqué tant que le chemin d’exécution est incomplet.";

          const armRequirements = [
            {
              label: "Operator confirmation",
              status: "REQUIRED",
              note: "Une validation humaine sera obligatoire avant tout futur dry run.",
            },
            {
              label: "Scheduler secret",
              status: "REQUIRED",
              note: "Le futur déclenchement devra être protégé par secret côté worker.",
            },
            {
              label: "dry_run true",
              status: "REQUIRED",
              note: "Le mode dry_run devra rester explicitement activé.",
            },
            {
              label: "POST /run",
              status: "LOCKED",
              note: "Aucun POST /run n’est déclenché depuis cette version.",
            },
            {
              label: "Worker call",
              status: "LOCKED",
              note: "Aucun appel worker n’est créé par ce switch preview.",
            },
            {
              label: "Airtable mutation",
              status: "LOCKED",
              note: "Aucune écriture base n’est autorisée dans V3.8.",
            },
            {
              label: "Payload preview",
              status: "OK",
              note: "Le payload V3.6 reste seulement affiché en lecture seule.",
            },
            {
              label: "Confirmation gate",
              status: "OK",
              note: "La porte V3.7 reste active et non exécutable.",
            },
          ];

          const armBadgeClassName = (status: string) => {
            if (status === "ARMING PREVIEW READY" || status === "OK") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "ARMING REVIEW REQUIRED" || status === "REQUIRED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED" || status === "NOT ACTIVE") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-sky-400/20 bg-sky-950/15 p-4 shadow-[0_0_90px_rgba(56,189,248,0.06)] sm:p-5">
              {/* Incident Detail V3.8-dry-run-arm-switch-preview */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/70">
                    Dry Run Arm Switch Preview
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Prévisualisation armement dry run
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Faux switch d’armement pour préparer l’UX du futur dry run contrôlé.
                    Le switch est désactivé, non actif et ne déclenche aucune action.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={\`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] \${armBadgeClassName(armPreviewStatus)}\`}>
                    {armPreviewStatus}
                  </span>
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
                    ARMING PREVIEW
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NOT ACTIVE
                  </span>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                    OPERATOR REQUIRED
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Arm Switch
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-white">
                      ARM DRY RUN
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Switch visuel uniquement. Il reste désactivé et ne contient aucun onClick,
                      aucun formulaire, aucune server action et aucun fetch.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex w-full cursor-not-allowed items-center justify-between rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 opacity-70 lg:w-[260px]"
                  >
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Disabled
                    </span>
                    <span className="flex h-8 w-16 items-center rounded-full border border-rose-400/30 bg-rose-500/15 p-1">
                      <span className="h-6 w-6 rounded-full bg-rose-200/60 shadow-[0_0_20px_rgba(251,113,133,0.25)]" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Arm Status", armPreviewStatus],
                  ["Switch State", "NOT ACTIVE"],
                  ["Execution Mode", "PREVIEW ONLY"],
                  ["POST /run", "DISABLED"],
                  ["Worker Call", "DISABLED"],
                  ["Airtable Mutation", "DISABLED"],
                  ["dry_run", "REQUIRED TRUE"],
                  ["Human Confirmation", "REQUIRED"],
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
                  Arm Preview Recommendation
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {armPreviewRecommendation}
                </p>

                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-4 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70 sm:w-auto"
                >
                  Arm dry run unavailable
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-100/70">
                  Arming Preconditions
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {armRequirements.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-6 text-white">
                            {item.label}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            {item.note}
                          </p>
                        </div>

                        <span className={\`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] \${armBadgeClassName(item.status)}\`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Arm Lock
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
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                    SWITCH DISABLED
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

console.log("V3.8 Dry Run Arm Switch Preview injecté dans page.tsx.");
console.log("Insertion placée après V3.7 et avant Linked Execution Path.");
console.log("Patch visuel uniquement : switch désactivé, aucun fetch, aucun POST, aucun worker, aucune mutation.");
