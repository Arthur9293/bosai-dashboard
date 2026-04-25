import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable : ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

const helpersAnchor = `function getQueueOutcomeNextStep(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Traiter puis revenir à cette file";
  if (level === "MEDIUM RISK") return "Compléter puis réévaluer";

  return "Surveiller puis revenir All queues";
}`;

const helpersBlock = `${helpersAnchor}

function getQueueOperatorDecisionLabel(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Décision : intervention immédiate";
  if (level === "MEDIUM RISK") return "Décision : clarification requise";

  return "Décision : surveillance contrôlée";
}

function getQueueOperatorDecisionReason(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Le niveau de risque impose une action immédiate sur le premier incident de la file.";
  }

  if (level === "MEDIUM RISK") {
    return "Le niveau de risque demande de compléter le contexte avant une action forte.";
  }

  return "Le niveau de risque permet de maintenir la file sous surveillance sans intervention urgente.";
}

function getQueueOperatorDecisionNextStep(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Ouvrir maintenant";
  if (level === "MEDIUM RISK") return "Vérifier le contexte";

  return "Continuer la surveillance";
}`;

if (!source.includes("function getQueueOperatorDecisionLabel(")) {
  if (!source.includes(helpersAnchor)) {
    console.error("Point d’insertion helpers V2.26 introuvable.");
    process.exit(1);
  }

  source = source.replace(helpersAnchor, helpersBlock);
  console.log("Helpers V2.26 ajoutés.");
} else {
  console.log("Helpers V2.26 déjà présents.");
}

const outcomeBlockEnd = `                      <div className="mt-4">
                        <Link
                          href={activeQueueFilterHref}
                          className={actionLinkClassName("soft")}
                        >
                          Revenir à la file active
                        </Link>
                      </div>
                    </div>`;

const operatorDecisionBlock = `${outcomeBlockEnd}

                      <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className={metaLabelClassName()}>
                          Queue Operator Decision
                        </div>

                        <div className="mt-3 text-xl font-semibold tracking-tight text-white">
                          {getQueueOperatorDecisionLabel(queueRiskLevel)}
                        </div>

                        <div className="mt-3 text-sm leading-6 text-zinc-300">
                          {getQueueOperatorDecisionReason(queueRiskLevel)}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Décision suivante
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getQueueOperatorDecisionNextStep(queueRiskLevel)}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Surface cible
                            </div>
                            <div className="mt-2">
                              <DashboardStatusBadge
                                kind={getNextMoveBadgeKind(firstIncidentNextMoveLabel)}
                                label={firstIncidentNextMoveLabel}
                              />
                            </div>
                          </div>
                        </div>

                        {queueFocusedFirstIncidentHref ? (
                          <div className="mt-4">
                            <Link
                              href={queueFocusedFirstIncidentHref}
                              className={actionLinkClassName("primary")}
                            >
                              Exécuter la décision
                            </Link>
                          </div>
                        ) : null}
                      </div>`;

if (!source.includes("Queue Operator Decision")) {
  if (!source.includes(outcomeBlockEnd)) {
    console.error("Point d’insertion bloc Queue Operator Decision introuvable.");
    process.exit(1);
  }

  source = source.replace(outcomeBlockEnd, operatorDecisionBlock);
  console.log("Bloc Queue Operator Decision V2.26 ajouté.");
} else {
  console.log("Bloc Queue Operator Decision V2.26 déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.26 appliqué sur :");
console.log(filePath);
