import fs from "node:fs";
import path from "node:path";

const filePath = path.join(
  process.cwd(),
  "src/app/(dashboard)/incidents/page.tsx",
);

if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable : ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

if (!source.includes("function getQueueFocusedFirstIncident(")) {
  const anchor = "function getQueueFocusedFirstIncidentHref(args:";
  const index = source.indexOf(anchor);

  if (index === -1) {
    console.error("Point d’insertion getQueueFocusedFirstIncident introuvable.");
    process.exit(1);
  }

  const helper = `function getQueueFocusedFirstIncident(
  incidents: IncidentItem[],
): IncidentItem | null {
  return incidents[0] || null;
}

`;

  source = source.slice(0, index) + helper + source.slice(index);
  console.log("Helper getQueueFocusedFirstIncident ajouté.");
} else {
  console.log("Helper getQueueFocusedFirstIncident déjà présent.");
}

if (!source.includes("function getQueueRecommendedActionLabel(")) {
  const anchor = "function getPluralLabel(";
  const index = source.indexOf(anchor);

  if (index === -1) {
    console.error("Point d’insertion helpers V2.23 introuvable.");
    process.exit(1);
  }

  const helpers = `function getQueueRecommendedActionLabel(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Traiter maintenant";
  if (level === "MEDIUM RISK") return "Compléter avant action";

  return "Surveiller";
}

function getQueueRecommendedActionReason(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") {
    return "Cette file contient un signal fort. Ouvre le premier incident et traite la surface recommandée.";
  }

  if (level === "MEDIUM RISK") {
    return "Cette file contient un signal intermédiaire. Vérifie le contexte avant d’agir.";
  }

  return "Cette file ne montre pas de risque immédiat. Garde-la en surveillance.";
}

`;

  source = source.slice(0, index) + helpers + source.slice(index);
  console.log("Helpers Queue Recommended Action V2.23 ajoutés.");
} else {
  console.log("Helpers Queue Recommended Action V2.23 déjà présents.");
}

if (!source.includes("Queue Recommended Action")) {
  const riskIndex = source.indexOf("Queue Risk Signal");

  if (riskIndex === -1) {
    console.error("Bloc Queue Risk Signal introuvable.");
    process.exit(1);
  }

  const ctaAnchor = `
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {queueFocusedFirstIncidentHref ? (`;

  const ctaIndex = source.indexOf(ctaAnchor, riskIndex);

  if (ctaIndex === -1) {
    console.error("Point d’insertion Queue Recommended Action introuvable.");
    process.exit(1);
  }

  const recommendedBlock = `
                      {(() => {
                        const queueRecommendedRiskLevel = getQueueRiskLevel(
                          queueFocusedIncidents,
                          activeWorkspaceId,
                        );

                        const queueRecommendedFirstIncident =
                          getQueueFocusedFirstIncident(queueFocusedIncidents);

                        if (!queueRecommendedFirstIncident) return null;

                        const queueRecommendedCommandHref = getCommandHref(
                          queueRecommendedFirstIncident,
                          activeWorkspaceId,
                        );

                        const queueRecommendedFlowHref = getFlowHref(
                          queueRecommendedFirstIncident,
                          activeWorkspaceId,
                        );

                        const queueRecommendedEventHref = getEventHref(
                          queueRecommendedFirstIncident,
                          activeWorkspaceId,
                        );

                        const queueRecommendedNextMoveLabel = getIncidentNextMoveLabel({
                          incident: queueRecommendedFirstIncident,
                          commandHref: queueRecommendedCommandHref,
                          flowHref: queueRecommendedFlowHref,
                          eventHref: queueRecommendedEventHref,
                        });

                        return (
                          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className={metaLabelClassName()}>
                                  Queue Recommended Action
                                </div>

                                <div className="mt-2 text-lg font-semibold tracking-tight text-white">
                                  {getQueueRecommendedActionLabel(
                                    queueRecommendedRiskLevel,
                                  )}
                                </div>
                              </div>

                              <DashboardStatusBadge
                                kind={
                                  queueRecommendedRiskLevel === "HIGH RISK"
                                    ? "failed"
                                    : queueRecommendedRiskLevel === "MEDIUM RISK"
                                      ? "retry"
                                      : "success"
                                }
                                label={queueRecommendedRiskLevel}
                              />
                            </div>

                            <div className="mt-4 text-sm leading-6 text-zinc-300">
                              {getQueueRecommendedActionReason(
                                queueRecommendedRiskLevel,
                              )}
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Surface conseillée
                                </div>

                                <div className="mt-2">
                                  <DashboardStatusBadge
                                    kind={getNextMoveBadgeKind(
                                      queueRecommendedNextMoveLabel,
                                    )}
                                    label={queueRecommendedNextMoveLabel}
                                  />
                                </div>
                              </div>

                              <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                  Action immédiate
                                </div>

                                <div className="mt-2 text-sm font-medium text-zinc-100">
                                  Ouvrir la surface recommandée
                                </div>
                              </div>
                            </div>

                            {queueFocusedFirstIncidentHref ? (
                              <div className="mt-5">
                                <Link
                                  href={queueFocusedFirstIncidentHref}
                                  className={actionLinkClassName("primary")}
                                >
                                  Appliquer la recommandation
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
`;

  source =
    source.slice(0, ctaIndex) + recommendedBlock + source.slice(ctaIndex);

  console.log("Bloc Queue Recommended Action V2.23 ajouté.");
} else {
  console.log("Bloc Queue Recommended Action V2.23 déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.23 appliqué sur :");
console.log(filePath);
