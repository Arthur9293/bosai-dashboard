import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const helpersAnchor = `function getQueueDecisionConfidenceSummary(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") {
    return "Décision fiable : la surface cible est claire et le risque justifie l’action.";
  }

  if (confidence === "MEDIUM CONFIDENCE") {
    return "Décision prudente : le contexte doit rester visible avant action forte.";
  }

  return "Décision à surveiller : le signal reste insuffisant ou non actionnable.";
}
`;

const helpersBlock = `${helpersAnchor}

function getQueueFinalActionLabel(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") return "Action validée";
  if (confidence === "MEDIUM CONFIDENCE") return "Action prudente";

  return "Action à surveiller";
}

function getQueueFinalPrimaryAction(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") return "Exécuter maintenant";
  if (confidence === "MEDIUM CONFIDENCE") return "Ouvrir et vérifier";

  return "Surveiller avant action";
}
`;

if (!source.includes(helpersAnchor)) {
  console.error("Point d'insertion helpers V2.28 introuvable.");
  process.exit(1);
}

if (!source.includes("function getQueueFinalActionLabel(")) {
  source = source.replace(helpersAnchor, helpersBlock);
  console.log("Helpers V2.28 ajoutés.");
} else {
  console.log("Helpers V2.28 déjà présents.");
}

const uiAnchor = `                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Decision Confidence
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <DashboardStatusBadge
                                kind={
                                  getQueueDecisionConfidence({
                                    level: queueRiskLevel,
                                    nextMoveLabel:
                                      queueFocusedFirstIncidentNextMoveLabel,
                                    firstIncident: queueFocusedFirstIncident,
                                  }) === "HIGH CONFIDENCE"
                                    ? "success"
                                    : getQueueDecisionConfidence({
                                          level: queueRiskLevel,
                                          nextMoveLabel:
                                            queueFocusedFirstIncidentNextMoveLabel,
                                          firstIncident: queueFocusedFirstIncident,
                                        }) === "MEDIUM CONFIDENCE"
                                      ? "retry"
                                      : "unknown"
                                }
                                label={getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}
                              />
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueDecisionConfidenceSummary(
                                getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Signaux locaux
                              </div>
                              <div className="mt-2 text-sm font-medium text-zinc-100">
                                {queueFocusedFirstIncidentNextMoveLabel} ·{" "}
                                {queueRiskLevel} ·{" "}
                                {getSignalConfidenceLabel(queueFocusedFirstIncident)}
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Ouvrir avec cette décision
                                </Link>
                              </div>
                            ) : null}
                          </div>`;

const uiBlock = `${uiAnchor}

                          <div className="mt-5 rounded-[18px] border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Final Action Bar
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              {getQueueFinalActionLabel(
                                getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Résumé décision
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                {getQueueOperatorDecisionLabel(queueRiskLevel)} ·{" "}
                                {getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}{" "}
                                · {queueFocusedFirstIncidentNextMoveLabel}
                              </div>
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Action principale
                              </div>
                              <div className="mt-2 text-sm font-medium text-zinc-100">
                                {getQueueFinalPrimaryAction(
                                  getQueueDecisionConfidence({
                                    level: queueRiskLevel,
                                    nextMoveLabel:
                                      queueFocusedFirstIncidentNextMoveLabel,
                                    firstIncident: queueFocusedFirstIncident,
                                  }),
                                )}
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Lancer l’action principale
                                </Link>
                              </div>
                            ) : null}
                          </div>`;

if (!source.includes(uiAnchor)) {
  console.error("Point d'insertion UI V2.28 introuvable.");
  process.exit(1);
}

if (!source.includes("Queue Final Action Bar")) {
  source = source.replace(uiAnchor, uiBlock);
  console.log("Bloc UI V2.28 ajouté.");
} else {
  console.log("Bloc UI V2.28 déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.28 appliqué sur :");
console.log(filePath);
