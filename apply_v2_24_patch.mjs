import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable : ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

const helpersBlock = `
function getQueueExecutionChecklist(level: QueueRiskLevel): string[] {
  if (level === "HIGH RISK") {
    return [
      "1. Ouvrir le premier incident",
      "2. Traiter la surface recommandée",
      "3. Vérifier la réduction du risque",
    ];
  }

  if (level === "MEDIUM RISK") {
    return [
      "1. Ouvrir le premier incident",
      "2. Compléter le contexte manquant",
      "3. Revenir à la file après vérification",
    ];
  }

  return [
    "1. Garder la file en surveillance",
    "2. Vérifier le premier incident si nécessaire",
    "3. Revenir aux files globales",
  ];
}

function getQueueExecutionNote(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Exécution prioritaire : réduire le risque avant de passer à la file suivante.";
  }

  if (level === "MEDIUM RISK") {
    return "Exécution contextuelle : clarifier avant d’agir.";
  }

  return "Exécution légère : surveillance sans action immédiate.";
}
`;

if (!source.includes("function getQueueExecutionChecklist(")) {
  const helperAnchor = /(\nfunction getQueueRecommendedActionReason\(level: QueueRiskLevel\): string \{[\s\S]*?\n\})\n\nfunction getPluralLabel/;

  if (!helperAnchor.test(source)) {
    console.error("Point d’insertion helpers introuvable.");
    process.exit(1);
  }

  source = source.replace(
    helperAnchor,
    `$1\n${helpersBlock}\nfunction getPluralLabel`,
  );

  console.log("Helpers V2.24 ajoutés.");
} else {
  console.log("Helpers V2.24 déjà présents.");
}

const checklistBlock = `
                      <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className={metaLabelClassName()}>
                          Queue Execution Checklist
                        </div>

                        <div className="mt-4 space-y-3">
                          {getQueueExecutionChecklist(queueRiskLevel).map(
                            (step) => (
                              <div
                                key={step}
                                className="flex gap-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3"
                              >
                                <span
                                  className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-emerald-300"
                                  aria-hidden="true"
                                />
                                <span className="text-sm font-medium leading-6 text-zinc-100">
                                  {step}
                                </span>
                              </div>
                            ),
                          )}
                        </div>

                        <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                          <div className={metaLabelClassName()}>
                            Note d’exécution
                          </div>
                          <div className="mt-2 text-sm leading-6 text-zinc-300">
                            {getQueueExecutionNote(queueRiskLevel)}
                          </div>
                        </div>
                      </div>
`;

if (!source.includes("Queue Execution Checklist")) {
  const recommendedIndex = source.indexOf("Queue Recommended Action");

  if (recommendedIndex === -1) {
    console.error("Bloc Queue Recommended Action introuvable.");
    process.exit(1);
  }

  const ctaAnchor = `\n                      <div className="mt-5 grid gap-3 sm:grid-cols-2">`;
  const ctaIndex = source.indexOf(ctaAnchor, recommendedIndex);

  if (ctaIndex === -1) {
    console.error("Point d’insertion avant CTA introuvable.");
    process.exit(1);
  }

  source =
    source.slice(0, ctaIndex) +
    checklistBlock +
    source.slice(ctaIndex);

  console.log("Bloc Queue Execution Checklist V2.24 ajouté.");
} else {
  console.log("Bloc Queue Execution Checklist déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.24 appliqué sur :");
console.log(filePath);
