import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const marker = "{/* Incident Detail V3.1-execution-path-polish */}";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes("Incident Detail V3.1-execution-path-polish")) {
  console.log("V3.1 déjà appliqué. Aucune modification.");
  process.exit(0);
}

if (!source.includes("Incident Detail V3.0-operator-action-console")) {
  console.error("V3.0 introuvable. Patch V3.1 arrêté pour éviter de casser la page détail.");
  process.exit(1);
}

const actionHrefAnchor =
  "  const actionHref = commandHref || flowHref || runHref || incidentsHref;";

if (!source.includes(actionHrefAnchor)) {
  console.error("Anchor actionHref introuvable. Patch V3.1 arrêté.");
  process.exit(1);
}

const v31Logic = `
  ${marker}
  const hasCommandPath = Boolean(commandId);
  const hasRunPath = Boolean(runId);
  const hasFlowPath = Boolean(flowId);
  const hasEventPath = Boolean(eventId);

  const executionPathAvailableCount = [
    hasCommandPath,
    hasRunPath,
    hasFlowPath,
    hasEventPath,
  ].filter(Boolean).length;

  const executionPathHealth =
    hasCommandPath && hasRunPath && hasFlowPath && hasEventPath
      ? "COMPLETE PATH"
      : hasCommandPath || hasFlowPath
        ? "ACTIONABLE PATH"
        : executionPathAvailableCount > 0
          ? "PARTIAL PATH"
          : "MISSING PATH";

  const executionPathRecommendation =
    executionPathHealth === "COMPLETE PATH"
      ? "Le chemin d’exécution est complet et navigable."
      : executionPathHealth === "ACTIONABLE PATH"
        ? "Une surface d’action est disponible pour continuer l’investigation."
        : executionPathHealth === "PARTIAL PATH"
          ? "Le chemin est partiel : utiliser la meilleure surface disponible."
          : "Aucune surface d’exécution liée n’est détectée pour cet incident.";

  const executionPathHealthClassName =
    executionPathHealth === "COMPLETE PATH"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
      : executionPathHealth === "ACTIONABLE PATH"
        ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
        : executionPathHealth === "PARTIAL PATH"
          ? "border-amber-400/30 bg-amber-500/15 text-amber-200"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";

  const getExecutionPathStepState = (
    hasValue: boolean,
  ): "AVAILABLE" | "MISSING" | "PARTIAL" => {
    if (hasValue) return "AVAILABLE";
    if (executionPathAvailableCount > 0) return "PARTIAL";
    return "MISSING";
  };

  const getExecutionPathStepClassName = (
    state: "AVAILABLE" | "MISSING" | "PARTIAL",
  ): string => {
    if (state === "AVAILABLE") {
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    }

    if (state === "PARTIAL") {
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    }

    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  };

  const executionPathSteps = [
    {
      label: "Incident",
      value: incidentId,
      state: "AVAILABLE" as const,
      href: "",
    },
    {
      label: "Command",
      value: commandId || "No linked command",
      state: getExecutionPathStepState(hasCommandPath),
      href: commandHref,
    },
    {
      label: "Run",
      value: runId || "No linked run",
      state: getExecutionPathStepState(hasRunPath),
      href: runHref,
    },
    {
      label: "Flow",
      value: flowId || "No linked flow",
      state: getExecutionPathStepState(hasFlowPath),
      href: flowHref,
    },
    {
      label: "Event",
      value: eventId || "No linked event",
      state: getExecutionPathStepState(hasEventPath),
      href: "",
    },
  ];
`;

source = source.replace(actionHrefAnchor, `${actionHrefAnchor}\n${v31Logic}`);

const linkedPathLabel = "Linked Execution Path";
const labelIndex = source.indexOf(linkedPathLabel);

if (labelIndex === -1) {
  console.error("Bloc Linked Execution Path introuvable. Patch V3.1 arrêté.");
  process.exit(1);
}

const blockStart = source.lastIndexOf(
  '<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">',
  labelIndex,
);

if (blockStart === -1) {
  console.error("Début du bloc Linked Execution Path introuvable. Patch V3.1 arrêté.");
  process.exit(1);
}

const ctaGridAnchor = '<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">';
const blockEnd = source.indexOf(ctaGridAnchor, labelIndex);

if (blockEnd === -1) {
  console.error("Fin du bloc Linked Execution Path introuvable. Patch V3.1 arrêté.");
  process.exit(1);
}

const newLinkedExecutionPathBlock = `        <div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/70">
                Linked Execution Path
              </p>
              <h3 className="text-xl font-semibold text-white">
                Execution Path Health
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                {executionPathRecommendation}
              </p>
            </div>

            <span
              className={\`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] \${executionPathHealthClassName}\`}
            >
              {executionPathHealth}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
            {executionPathSteps.map((step) => (
              <div
                key={step.label}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    {step.label}
                  </p>

                  <span
                    className={\`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] \${getExecutionPathStepClassName(step.state)}\`}
                  >
                    {step.state}
                  </span>
                </div>

                <p className="mt-3 break-words text-sm font-medium text-white">
                  {step.value}
                </p>

                {step.href ? (
                  <a
                    href={step.href}
                    className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    Ouvrir
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="break-words text-sm text-zinc-300">
              Incident → Command → Run → Flow → Event
            </p>
          </div>
        </div>

`;

source = source.slice(0, blockStart) + newLinkedExecutionPathBlock + source.slice(blockEnd);

const flowCtaBlock = `{flowHref ? (
            <a
              href={flowHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir le flow lié
            </a>
          ) : null}`;

if (source.includes(flowCtaBlock) && !source.includes("Ouvrir le run lié")) {
  const runCtaBlock = `{runHref ? (
            <a
              href={runHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir le run lié
            </a>
          ) : null}

          `;

  source = source.replace(flowCtaBlock, `${runCtaBlock}${flowCtaBlock}`);
  console.log("OK CTA Ouvrir le run lié ajouté.");
} else {
  console.log("Ignoré CTA run : déjà présent ou anchor flow introuvable.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch Incident Detail V3.1 appliqué.");
console.log("Bloc Linked Execution Path amélioré.");
console.log("Execution Path Health ajouté.");
console.log("Badges AVAILABLE / MISSING / PARTIAL ajoutés.");
console.log("Aucune logique métier, mutation, endpoint, worker ou fetch modifié.");
