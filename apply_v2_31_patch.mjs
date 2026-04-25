import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const finalCtaAnchor = `                          {queueFocusedFirstIncidentHref ? (
                            <Link
                              href={queueFocusedFirstIncidentHref}
                              className={actionLinkClassName("primary")}
                            >
                              Ouvrir le premier incident
                            </Link>
                          ) : null}`;

const summaryFooterBlock = `                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Operator Summary Footer
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              Synthèse opérateur de la file active
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  File active
                                </div>
                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  {getOperatorQueuePositionLabel(queueFilter)}
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Route suivante
                                </div>
                                <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                  {getQueueNextStepRouteLabel(
                                    getQueueCompletionState({
                                      count: queueFocusedIncidents.length,
                                      level: queueRiskLevel,
                                    }),
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Signaux synthèse
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                {queueRiskLevel} ·{" "}
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
                                Action immédiate
                              </div>
                              <div className="mt-2 text-sm font-medium text-zinc-100">
                                {getQueueNextStepPrimaryCta(
                                  getQueueCompletionState({
                                    count: queueFocusedIncidents.length,
                                    level: queueRiskLevel,
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
                                  Lancer depuis la synthèse
                                </Link>
                              </div>
                            ) : null}
                          </div>

${finalCtaAnchor}`;

if (!source.includes(finalCtaAnchor)) {
  console.error("Point d'insertion V2.31 introuvable : CTA final 'Ouvrir le premier incident'.");
  process.exit(1);
}

if (!source.includes("Queue Operator Summary Footer")) {
  source = source.replace(finalCtaAnchor, summaryFooterBlock);
  console.log("Bloc UI V2.31 ajouté.");
} else {
  console.log("Bloc UI V2.31 déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.31 appliqué sur :");
console.log(filePath);
