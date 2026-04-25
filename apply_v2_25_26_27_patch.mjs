import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const helpersAnchor = `function getQueueExecutionNote(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Exécution prioritaire : réduire le risque avant de passer à la file suivante.";
  }

  if (level === "MEDIUM RISK") {
    return "Exécution contextuelle : clarifier avant d’agir.";
  }

  return "Exécution légère : surveillance sans action immédiate.";
}
`;

const helpersBlock = `${helpersAnchor}

type QueueDecisionConfidence =
  | "HIGH CONFIDENCE"
  | "MEDIUM CONFIDENCE"
  | "LOW CONFIDENCE";

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
}

function getQueueDecisionConfidence(args: {
  level: QueueRiskLevel;
  nextMoveLabel: NextMoveLabel;
  firstIncident: IncidentItem;
}): QueueDecisionConfidence {
  const signalConfidence = getSignalConfidenceLabel(args.firstIncident);

  if (args.nextMoveLabel === "WATCH" || signalConfidence !== "SIGNAL READY") {
    return "LOW CONFIDENCE";
  }

  if (
    args.nextMoveLabel === "OPEN DETAIL" ||
    args.nextMoveLabel === "REVIEW RESOLUTION" ||
    args.level === "MEDIUM RISK"
  ) {
    return "MEDIUM CONFIDENCE";
  }

  if (
    args.level !== "LOW RISK" &&
    (args.nextMoveLabel === "OPEN COMMAND" ||
      args.nextMoveLabel === "OPEN FLOW" ||
      args.nextMoveLabel === "OPEN EVENT")
  ) {
    return "HIGH CONFIDENCE";
  }

  return "MEDIUM CONFIDENCE";
}

function getQueueDecisionConfidenceSummary(
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

if (!source.includes(helpersAnchor)) {
  console.error("Point d'insertion helpers V2.25/V2.26/V2.27 introuvable.");
  process.exit(1);
}

if (!source.includes("function getQueueOutcomeTitle(")) {
  source = source.replace(helpersAnchor, helpersBlock);
  console.log("Helpers V2.25/V2.26/V2.27 ajoutés.");
} else {
  console.log("Helpers V2.25/V2.26/V2.27 déjà présents.");
}

const oldBlock = `                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {queueFocusedFirstIncidentHref ? (
                          <Link
                            href={queueFocusedFirstIncidentHref}
                            className={actionLinkClassName("primary")}
                          >
                            Ouvrir le premier incident
                          </Link>
                        ) : null}

                        <Link href={allQueuesHref} className={actionLinkClassName("soft")}>
                          Retour All queues
                        </Link>
                      </div>`;

const newBlock = `                      {queueFocusedFirstIncident &&
                      queueFocusedFirstIncidentNextMoveLabel ? (
                        <>
                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Outcome Preview
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              {getQueueOutcomeTitle(queueRiskLevel)}
                            </div>

                            <div className="mt-3 text-sm leading-6 text-zinc-300">
                              {getQueueOutcomeSummary(queueRiskLevel)}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Prochaine étape
                                </div>
                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  {getQueueOutcomeNextStep(queueRiskLevel)}
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Surface de retour
                                </div>
                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  {activeQueueFilterLabel}
                                </div>
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

                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className={metaLabelClassName()}>
                              Queue Operator Decision
                            </div>

                            <div className="mt-3 text-lg font-semibold tracking-tight text-white">
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
                                    kind={getNextMoveBadgeKind(
                                      queueFocusedFirstIncidentNextMoveLabel,
                                    )}
                                    label={queueFocusedFirstIncidentNextMoveLabel}
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
                          </div>

                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
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
                          </div>
                        </>
                      ) : null}

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {queueFocusedFirstIncidentHref ? (
                          <Link
                            href={queueFocusedFirstIncidentHref}
                            className={actionLinkClassName("primary")}
                          >
                            Ouvrir le premier incident
                          </Link>
                        ) : null}

                        <Link href={allQueuesHref} className={actionLinkClassName("soft")}>
                          Retour All queues
                        </Link>
                      </div>`;

if (!source.includes(oldBlock)) {
  console.error("Point d'insertion UI V2.25/V2.26/V2.27 introuvable.");
  process.exit(1);
}

if (!source.includes("Queue Decision Confidence")) {
  source = source.replace(oldBlock, newBlock);
  console.log("Blocs UI V2.25/V2.26/V2.27 ajoutés.");
} else {
  console.log("Blocs UI V2.25/V2.26/V2.27 déjà présents.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.25/V2.26/V2.27 appliqué sur :");
console.log(filePath);
