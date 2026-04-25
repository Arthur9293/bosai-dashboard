import fs from "node:fs";
import path from "node:path";

const TARGET_CANDIDATES = [
  "src/app/(dashboard)/incidents/page.tsx",
  "app/(dashboard)/incidents/page.tsx",
  "app/incidents/page.tsx",
];

function resolveTargetPath() {
  for (const candidate of TARGET_CANDIDATES) {
    const absolutePath = path.resolve(process.cwd(), candidate);

    if (fs.existsSync(absolutePath)) {
      return {
        relativePath: candidate,
        absolutePath,
      };
    }
  }

  console.error("Fichier cible introuvable.");
  console.error("Chemins testés :");
  for (const candidate of TARGET_CANDIDATES) {
    console.error(`- ${candidate}`);
  }
  process.exit(1);
}

function findFunctionEnd(source, functionName) {
  const functionStart = source.indexOf(`function ${functionName}`);

  if (functionStart === -1) {
    return -1;
  }

  const bodyStart = source.indexOf("{", functionStart);

  if (bodyStart === -1) {
    return -1;
  }

  let depth = 0;

  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return i + 1;
      }
    }
  }

  return -1;
}

function insertAfterFunction(source, functionName, insertion) {
  const functionEnd = findFunctionEnd(source, functionName);

  if (functionEnd === -1) {
    return null;
  }

  return `${source.slice(0, functionEnd)}${insertion}${source.slice(functionEnd)}`;
}

function addOutcomeHelpers(source) {
  if (source.includes("function getQueueOutcomeTitle(")) {
    console.log("Helpers V2.25 déjà présents.");
    return source;
  }

  const helpers = `

function getQueueOutcomeTitle(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Risque à réduire";
  if (level === "MEDIUM RISK") return "Contexte à clarifier";

  return "Surveillance à maintenir";
}

function getQueueOutcomeSummary(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Après traitement, vérifier que le risque baisse avant de passer à la file suivante.";
  }

  if (level === "MEDIUM RISK") {
    return "Après vérification, revenir à la file pour décider si l’incident devient actionnable.";
  }

  return "Après contrôle rapide, revenir aux files globales ou maintenir la surveillance.";
}

function getQueueOutcomeNextStep(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Traiter puis revenir à cette file";
  if (level === "MEDIUM RISK") return "Compléter puis réévaluer";

  return "Surveiller puis revenir All queues";
}
`;

  const preferredAnchors = [
    "getQueueExecutionNote",
    "getQueueExecutionChecklist",
    "getQueueRecommendedActionReason",
    "getQueueRecommendedActionLabel",
    "getQueueRiskSummary",
  ];

  for (const anchor of preferredAnchors) {
    const updated = insertAfterFunction(source, anchor, helpers);

    if (updated) {
      console.log(`Helpers V2.25 ajoutés après ${anchor}.`);
      return updated;
    }
  }

  console.error("Impossible d’insérer les helpers V2.25 : aucun helper V2.22/V2.23/V2.24 trouvé.");
  process.exit(1);
}

function addOutcomeBlock(source) {
  if (source.includes("Queue Outcome Preview")) {
    console.log("Bloc Queue Outcome Preview V2.25 déjà présent.");
    return source;
  }

  const checklistMarker = "Queue Execution Checklist";
  const checklistIndex = source.indexOf(checklistMarker);

  if (checklistIndex === -1) {
    console.error("Point d’insertion introuvable : bloc Queue Execution Checklist absent.");
    process.exit(1);
  }

  const afterChecklist = source.slice(checklistIndex);

  const ctaRegex =
    /\n\s*<div className="mt-5 grid gap-3 sm:grid-cols-2">\s*\n\s*\{queueFocusedFirstIncidentHref \? \(/;

  const ctaMatch = ctaRegex.exec(afterChecklist);

  if (!ctaMatch) {
    console.error("Point d’insertion introuvable : bloc CTA Queue Action absent après Queue Execution Checklist.");
    process.exit(1);
  }

  const insertAt = checklistIndex + ctaMatch.index;

  const outcomeBlock = `
                      <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className={metaLabelClassName()}>
                          Queue Outcome Preview
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Résultat attendu
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getQueueOutcomeTitle(
                                getQueueRiskLevel(
                                  queueFocusedIncidents,
                                  activeWorkspaceId,
                                ),
                              )}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Surface de retour
                            </div>
                            <div className="mt-2">
                              <DashboardStatusBadge
                                kind={
                                  operatorQueueFilter === "now"
                                    ? "failed"
                                    : operatorQueueFilter === "next"
                                      ? "running"
                                      : operatorQueueFilter === "context"
                                        ? "retry"
                                        : "unknown"
                                }
                                label={activeQueueFilterLabel}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                            Résumé attendu
                          </div>
                          <div className="mt-2 text-sm leading-6 text-zinc-300">
                            {getQueueOutcomeSummary(
                              getQueueRiskLevel(
                                queueFocusedIncidents,
                                activeWorkspaceId,
                              ),
                            )}
                          </div>
                        </div>

                        <div className="mt-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                            Prochaine étape conseillée
                          </div>
                          <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                            {getQueueOutcomeNextStep(
                              getQueueRiskLevel(
                                queueFocusedIncidents,
                                activeWorkspaceId,
                              ),
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <Link
                            href={getOperatorQueueFilterHref({
                              filter: operatorQueueFilter,
                              activeWorkspaceId,
                              flowId,
                              rootEventId,
                              sourceRecordId,
                              commandId,
                            })}
                            className={actionLinkClassName("soft")}
                          >
                            Revenir à la file active
                          </Link>
                        </div>
                      </div>
`;

  console.log("Bloc Queue Outcome Preview V2.25 ajouté.");
  return `${source.slice(0, insertAt)}${outcomeBlock}${source.slice(insertAt)}`;
}

const { relativePath, absolutePath } = resolveTargetPath();

let source = fs.readFileSync(absolutePath, "utf8");

source = addOutcomeHelpers(source);
source = addOutcomeBlock(source);

fs.writeFileSync(absolutePath, source, "utf8");

console.log(`Patch V2.25 appliqué sur: ${relativePath}`);
