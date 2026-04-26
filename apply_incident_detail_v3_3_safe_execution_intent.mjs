import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const marker = "Incident Detail V3.3-safe-execution-intent";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.3 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const requiredMarkers = [
  "Incident Detail V3.0-operator-action-console",
  "Incident Detail V3.1-execution-path-polish",
  "Incident Detail V3.2-execution-preview",
];

for (const requiredMarker of requiredMarkers) {
  if (!source.includes(requiredMarker)) {
    console.error(`${requiredMarker} introuvable. Patch V3.3 arrêté.`);
    process.exit(1);
  }
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

const v33Logic = `
  const safeIntentStatus = (() => {
    const statusSource = \`\${status} \${severity}\`.toLowerCase();

    if (
      statusSource.includes("resolved") ||
      statusSource.includes("closed") ||
      statusSource.includes("low")
    ) {
      return "WATCH ONLY";
    }

    if ((commandId || flowId) && readiness === "READY TO ACT") {
      return "READY TO PREPARE";
    }

    if (!commandId && !flowId) {
      return "NEEDS CONTEXT";
    }

    return "NOT ARMED";
  })();

  const safeExecutionMode = "INTENT ONLY";
  const safeArmState = "NOT ARMED";

  const safeIntentStatusClassName =
    safeIntentStatus === "READY TO PREPARE"
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
      : safeIntentStatus === "NEEDS CONTEXT"
        ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
        : safeIntentStatus === "WATCH ONLY"
          ? "border-sky-400/30 bg-sky-500/15 text-sky-100"
          : "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";

  const safeExecutionIntentCards = [
    ["Intent Status", safeIntentStatus],
    ["Target Surface", previewSurfaceTarget],
    ["Target Command", commandId || "No linked command"],
    ["Target Flow", flowId || "No linked flow"],
    ["Workspace", workspaceId],
    ["Risk Level", previewRiskLevel],
    ["Confidence", previewConfidenceLevel],
    ["Readiness", readiness],
    ["Execution Mode", safeExecutionMode],
  ];

  const safeExecutionPreconditions = [
    {
      label: "Workspace identifié",
      state: workspaceId ? "OK" : "MISSING",
      detail: workspaceId || "Aucun workspace détecté.",
    },
    {
      label: "Incident identifié",
      state: incidentId ? "OK" : "MISSING",
      detail: incidentId || "Aucun incident détecté.",
    },
    {
      label: "Surface cible détectée",
      state: commandId || flowId || runId ? "OK" : "MISSING",
      detail: previewSurfaceTarget,
    },
    {
      label: "Command liée disponible si présente",
      state: commandId ? "OK" : "MISSING",
      detail: commandId || "Aucune command liée.",
    },
    {
      label: "Flow lié disponible si présent",
      state: flowId ? "OK" : "MISSING",
      detail: flowId || "Aucun flow lié.",
    },
    {
      label: "Preview validée visuellement",
      state: "REQUIRED",
      detail: "Validation opérateur requise avant toute future exécution.",
    },
    {
      label: "Confirmation opérateur requise",
      state: "REQUIRED",
      detail: "Aucune exécution ne peut être lancée sans confirmation humaine.",
    },
  ] as const;

  const getPreconditionClassName = (state: "OK" | "MISSING" | "REQUIRED") => {
    if (state === "OK") {
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
    }

    if (state === "REQUIRED") {
      return "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";
    }

    return "border-amber-400/30 bg-amber-500/15 text-amber-100";
  };

  const safeExecutionGuardrails = [
    "Aucun POST /run.",
    "Aucun appel worker.",
    "Aucune mutation Airtable.",
    "Aucun changement de statut incident.",
    "Aucun retry déclenché.",
    "Aucune escalade automatique.",
    "Confirmation humaine requise.",
    "Future exécution devra passer par une couche dédiée.",
  ];
`;

source = source.slice(0, returnIndex) + v33Logic + "\n" + source.slice(returnIndex);

const linkedPathIndex = source.indexOf("Linked Execution Path", componentIndex);

if (linkedPathIndex === -1) {
  console.error("Linked Execution Path introuvable. Patch V3.3 arrêté.");
  process.exit(1);
}

const linkedBlockCandidates = [
  '<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4 sm:p-5">',
  '<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">',
];

let linkedBlockStart = -1;

for (const candidate of linkedBlockCandidates) {
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

const safeExecutionIntentBlock = `        <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-950/20 p-4 shadow-[0_0_80px_rgba(16,185,129,0.07)] sm:p-5">
          {/* Incident Detail V3.3-safe-execution-intent */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
                Safe Execution Intent
              </p>
              <h3 className="text-xl font-semibold text-white">
                Intention d’exécution sécurisée
              </h3>
              <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                Cette couche prépare l’intention opérateur sans armer ni exécuter une action réelle.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex max-w-full rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                INTENT ONLY
              </span>
              <span className="inline-flex max-w-full rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                NOT ARMED
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {safeExecutionIntentCards.map(([label, value]) => (
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

          <div className="mt-5 flex flex-wrap gap-2">
            <span className={\`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] \${safeIntentStatusClassName}\`}>
              {safeIntentStatus}
            </span>

            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {safeExecutionMode}
            </span>

            <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
              {safeArmState}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                Execution Preconditions
              </p>

              <div className="mt-4 space-y-3">
                {safeExecutionPreconditions.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {item.label}
                      </p>

                      <span
                        className={\`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] \${getPreconditionClassName(item.state)}\`}
                      >
                        {item.state}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-xs leading-5 text-zinc-400">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                Safety Guardrails
              </p>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                {safeExecutionGuardrails.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Execution Mode
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  L’intention est préparée mais non armée. La future exécution devra passer par une couche dédiée.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 opacity-70"
              >
                Execution intent prepared
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {commandHref ? (
              <a
                href={commandHref}
                className="inline-flex items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
              >
                Ouvrir la command liée
              </a>
            ) : null}

            {flowHref ? (
              <a
                href={flowHref}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Ouvrir le flow lié
              </a>
            ) : null}

            <a
              href={incidentsHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Retour Incidents
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
  safeExecutionIntentBlock +
  source.slice(linkedBlockStart);

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch Incident Detail V3.3 appliqué.");
console.log("Safe Execution Intent ajouté.");
console.log("Execution Preconditions ajouté.");
console.log("Safety Guardrails ajouté.");
console.log("Badges INTENT ONLY / NOT ARMED ajoutés.");
console.log("Bouton disabled non exécutable ajouté.");
console.log("Aucune logique métier, mutation, endpoint, worker, form ou server action modifié.");
