import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const helpersAnchor = `function getQueueFinalPrimaryAction(
  confidence: QueueDecisionConfidence,
): string {
  if (confidence === "HIGH CONFIDENCE") return "Exécuter maintenant";
  if (confidence === "MEDIUM CONFIDENCE") return "Ouvrir et vérifier";

  return "Surveiller avant action";
}
`;

const helpersBlock = `${helpersAnchor}

type QueueCompletionState =
  | "ACTIVE QUEUE"
  | "LAST INCIDENT"
  | "WATCH COMPLETION";

function getQueueCompletionState(args: {
  count: number;
  level: QueueRiskLevel;
}): QueueCompletionState {
  if (args.count > 1) return "ACTIVE QUEUE";

  if (args.level === "LOW RISK") return "WATCH COMPLETION";

  return "LAST INCIDENT";
}

function getQueueCompletionSummary(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") {
    return "La file contient encore plusieurs incidents à traiter.";
  }

  if (state === "LAST INCIDENT") {
    return "Dernier incident actif de cette file : traiter puis revenir aux files globales.";
  }

  return "Dernier incident en surveillance : vérifier puis revenir aux files globales.";
}

function getQueueCompletionCtaLabel(
  state: QueueCompletionState,
): string {
  if (state === "ACTIVE QUEUE") return "Continuer cette file";
  if (state === "LAST INCIDENT") return "Traiter le dernier incident";

  return "Vérifier puis clôturer la file";
}
`;

if (!source.includes(helpersAnchor)) {
  console.error("Point d'insertion helpers V2.29 introuvable.");
  process.exit(1);
}

if (!source.includes("type QueueCompletionState =")) {
  source = source.replace(helpersAnchor, helpersBlock);
  console.log("Helpers V2.29 ajoutés.");
} else {
  console.log("Helpers V2.29 déjà présents.");
}

const uiAnchor = `                          <div className="mt-5 rounded-[18px] border border-emerald-400/15 bg-emerald-400/[0.04] px-4 py-4">
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

const uiBlock = `${uiAnchor}

                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Completion State
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <DashboardStatusBadge
                                kind={
                                  getQueueCompletionState({
                                    count: queueFocusedIncidents.length,
                                    level: queueRiskLevel,
                                  }) === "ACTIVE QUEUE"
                                    ? "running"
                                    : getQueueCompletionState({
                                          count: queueFocusedIncidents.length,
                                          level: queueRiskLevel,
                                        }) === "LAST INCIDENT"
                                      ? "retry"
                                      : "unknown"
                                }
                                label={getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                })}
                              />
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueCompletionSummary(
                                getQueueCompletionState({
                                  count: queueFocusedIncidents.length,
                                  level: queueRiskLevel,
                                }),
                              )}
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Compteurs locaux
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                {getPluralLabel(
                                  queueFocusedIncidents.length,
                                  "incident",
                                  "incidents",
                                )}{" "}
                                · {Math.max(queueFocusedIncidents.length - 1, 0)}{" "}
                                restants · {queueRiskLevel} ·{" "}
                                {getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel:
                                    queueFocusedFirstIncidentNextMoveLabel,
                                  firstIncident: queueFocusedFirstIncident,
                                })}
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-4">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  {getQueueCompletionCtaLabel(
                                    getQueueCompletionState({
                                      count: queueFocusedIncidents.length,
                                      level: queueRiskLevel,
                                    }),
                                  )}
                                </Link>
                              </div>
                            ) : null}
                          </div>`;

if (!source.includes(uiAnchor)) {
  console.error("Point d'insertion UI V2.29 introuvable.");
  process.exit(1);
}

if (!source.includes("Queue Completion State")) {
  source = source.replace(uiAnchor, uiBlock);
  console.log("Bloc UI V2.29 ajouté.");
} else {
  console.log("Bloc UI V2.29 déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.29 appliqué sur :");
console.log(filePath);
