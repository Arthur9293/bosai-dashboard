import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const marker = "Incident Detail V3.2-execution-preview";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.2 déjà appliqué. Aucune modification.");
  process.exit(0);
}

if (!source.includes("Incident Detail V3.0-operator-action-console")) {
  console.error("V3.0 introuvable. Patch V3.2 arrêté.");
  process.exit(1);
}

if (!source.includes("Incident Detail V3.1-execution-path-polish")) {
  console.error("V3.1 introuvable. Patch V3.2 arrêté.");
  process.exit(1);
}

const componentIndex = source.indexOf("function IncidentDetailOperatorActionConsole");
if (componentIndex === -1) {
  console.error("Composant IncidentDetailOperatorActionConsole introuvable.");
  process.exit(1);
}

const returnAnchor = "  return (\n    <section";
const returnIndex = source.indexOf(returnAnchor, componentIndex);

if (returnIndex === -1) {
  console.error("return du composant Operator Action Console introuvable.");
  process.exit(1);
}

const previewLogic = `
  const previewSurfaceTarget =
    commandId ? "Command" : flowId ? "Flow" : runId ? "Run" : "Incident context";

  const previewRiskLevel = (() => {
    const riskSource = \`\${status} \${severity}\`.toLowerCase();

    if (
      riskSource.includes("critical") ||
      riskSource.includes("high") ||
      riskSource.includes("escalated")
    ) {
      return "HIGH RISK";
    }

    if (riskSource.includes("medium")) return "MEDIUM RISK";

    if (
      riskSource.includes("low") ||
      riskSource.includes("resolved") ||
      riskSource.includes("closed")
    ) {
      return "LOW RISK";
    }

    return "UNKNOWN RISK";
  })();

  const previewConfidenceLevel =
    commandId && flowId
      ? "HIGH CONFIDENCE"
      : commandId || flowId
        ? "MEDIUM CONFIDENCE"
        : "LOW CONFIDENCE";

  const previewPrimaryHref = commandHref || flowHref || runHref || incidentsHref;

  const previewPrimaryAction =
    commandId
      ? "Prévisualiser la command liée"
      : flowId
        ? "Prévisualiser le flow lié"
        : runId
          ? "Prévisualiser le run lié"
          : "Prévisualiser le contexte incident";

  const currentIncidentHref = buildIncidentDetailHref(
    \`/incidents/\${encodeURIComponent(incidentId)}\`,
    {
      workspace_id: workspaceId,
      queue: queueFilter || "",
    },
  );

  const previewModeClassName =
    "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";

  const previewRiskClassName =
    previewRiskLevel === "HIGH RISK"
      ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
      : previewRiskLevel === "MEDIUM RISK"
        ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
        : previewRiskLevel === "LOW RISK"
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";

  const previewWhatWillHappen = [
    "BOSAI ouvrira la meilleure surface liée disponible.",
    "L’opérateur pourra inspecter Command / Run / Flow.",
    "Aucune exécution automatique ne sera déclenchée.",
    "Aucune donnée Airtable ne sera modifiée.",
  ];

  const previewWhatWillNotHappen = [
    "Aucun appel worker.",
    "Aucun POST /run.",
    "Aucune mutation Airtable.",
    "Aucun changement de statut incident.",
    "Aucun retry déclenché.",
    "Aucune escalade automatique.",
  ];

  const previewTargetCards = [
    ["Action prévue", previewPrimaryAction],
    ["Surface cible", previewSurfaceTarget],
    ["Command cible", commandId || "No linked command"],
    ["Run cible", runId || "No linked run"],
    ["Flow cible", flowId || "No linked flow"],
    ["Workspace", workspaceId],
    ["Risque", previewRiskLevel],
    ["Confiance", previewConfidenceLevel],
    ["Readiness", readiness],
  ];
`;

source = source.slice(0, returnIndex) + previewLogic + "\n" + source.slice(returnIndex);

const linkedPathIndex = source.indexOf("Linked Execution Path", componentIndex);

if (linkedPathIndex === -1) {
  console.error("Linked Execution Path introuvable. Patch V3.2 arrêté.");
  process.exit(1);
}

const linkedBlockStartCandidates = [
  '<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4 sm:p-5">',
  '<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">',
];

let linkedBlockStart = -1;

for (const candidate of linkedBlockStartCandidates) {
  const index = source.lastIndexOf(candidate, linkedPathIndex);
  if (index !== -1) {
    linkedBlockStart = index;
    break;
  }
}

if (linkedBlockStart === -1) {
  console.error("Début du bloc Linked Execution Path introuvable.");
  process.exit(1);
}

const executionPreviewBlock = `        <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-950/20 p-4 shadow-[0_0_80px_rgba(34,211,238,0.07)] sm:p-5">
          {/* Incident Detail V3.2-execution-preview */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                Execution Preview
              </p>
              <h3 className="text-xl font-semibold text-white">
                Prévisualisation avant exécution
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                Cette section décrit ce qui serait ouvert ou inspecté. Elle ne déclenche aucune action réelle.
              </p>
            </div>

            <span
              className={\`inline-flex max-w-full rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] \${previewModeClassName}\`}
            >
              PREVIEW ONLY
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {previewTargetCards.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
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

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                What will happen
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                {previewWhatWillHappen.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                What will NOT happen
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                {previewWhatWillNotHappen.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] border-cyan-400/30 bg-cyan-500/15 text-cyan-100">
              {previewSurfaceTarget}
            </span>

            <span className={\`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] \${previewRiskClassName}\`}>
              {previewRiskLevel}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
              {previewConfidenceLevel}
            </span>

            <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              {readiness}
            </span>

            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              NO EXECUTION
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <a
              href={previewPrimaryHref}
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              {previewPrimaryAction}
            </a>

            {commandHref ? (
              <a
                href={commandHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Prévisualiser la command liée
              </a>
            ) : null}

            {flowHref ? (
              <a
                href={flowHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Prévisualiser le flow lié
              </a>
            ) : null}

            <a
              href={currentIncidentHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Retour Incident
            </a>

            {queueFilter ? (
              <a
                href={queueHref}
                className="inline-flex items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15"
              >
                Retour file active
              </a>
            ) : null}
          </div>
        </div>

`;

source =
  source.slice(0, linkedBlockStart) +
  executionPreviewBlock +
  source.slice(linkedBlockStart);

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch Incident Detail V3.2 appliqué.");
console.log("Execution Preview ajouté.");
console.log("What will happen ajouté.");
console.log("What will NOT happen ajouté.");
console.log("Badge PREVIEW ONLY / NO EXECUTION ajouté.");
console.log("Aucune logique métier, mutation, endpoint, worker ou fetch modifié.");
