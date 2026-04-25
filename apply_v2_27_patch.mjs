import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable : ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

/**
 * Incident List V2.27 — Queue Decision Confidence
 * SAFE PATCH only
 * - UI-only
 * - no fetch change
 * - no worker endpoint change
 * - no global counter change
 */

function insertOnce({
  label,
  needle,
  insertion,
  position = "before",
}) {
  if (source.includes(label)) {
    console.log(`${label} déjà présent. Aucun ajout.`);
    return;
  }

  const index = source.indexOf(needle);

  if (index === -1) {
    console.error(`Point d'insertion introuvable pour ${label}`);
    process.exit(1);
  }

  if (position === "after") {
    source =
      source.slice(0, index + needle.length) +
      insertion +
      source.slice(index + needle.length);
    return;
  }

  source = source.slice(0, index) + insertion + source.slice(index);
}

/**
 * 1) Add QueueDecisionConfidence type
 */
insertOnce({
  label: "type QueueDecisionConfidence",
  needle: `type QueueRiskLevel = "HIGH RISK" | "MEDIUM RISK" | "LOW RISK";`,
  position: "after",
  insertion: `

type QueueDecisionConfidence =
  | "HIGH CONFIDENCE"
  | "MEDIUM CONFIDENCE"
  | "LOW CONFIDENCE";`,
});

/**
 * 2) Add helpers after Queue Operator Decision helpers
 */
insertOnce({
  label: "function getQueueDecisionConfidence",
  needle: `function getQueueOperatorDecisionNextStep(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Ouvrir maintenant";
  if (level === "MEDIUM RISK") return "Vérifier le contexte";

  return "Continuer la surveillance";
}`,
  position: "after",
  insertion: `

function getQueueDecisionConfidence(args: {
  level: QueueRiskLevel;
  nextMoveLabel: NextMoveLabel;
  firstIncident: IncidentItem;
}): QueueDecisionConfidence {
  const { level, nextMoveLabel, firstIncident } = args;
  const signalConfidence = getSignalConfidenceLabel(firstIncident);

  if (nextMoveLabel === "WATCH" || signalConfidence !== "SIGNAL READY") {
    return "LOW CONFIDENCE";
  }

  if (
    nextMoveLabel === "OPEN DETAIL" ||
    nextMoveLabel === "REVIEW RESOLUTION" ||
    level === "MEDIUM RISK"
  ) {
    return "MEDIUM CONFIDENCE";
  }

  if (
    level !== "LOW RISK" &&
    (nextMoveLabel === "OPEN COMMAND" ||
      nextMoveLabel === "OPEN FLOW" ||
      nextMoveLabel === "OPEN EVENT")
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

function getQueueDecisionConfidenceBadgeKind(
  confidence: QueueDecisionConfidence,
): DashboardStatusKind {
  if (confidence === "HIGH CONFIDENCE") return "success";
  if (confidence === "MEDIUM CONFIDENCE") return "retry";

  return "unknown";
}

function getQueueDecisionConfidenceTone(
  confidence: QueueDecisionConfidence,
): SignalTone {
  if (confidence === "HIGH CONFIDENCE") return "success";
  if (confidence === "MEDIUM CONFIDENCE") return "warning";

  return "default";
}`,
});

/**
 * 3) Add local variables in Queue Action block, after queue risk / recommendation variables
 */
insertOnce({
  label: "const queueDecisionConfidence",
  needle: `const queueRecommendedActionReason =
                            getQueueRecommendedActionReason(queueRiskLevel);`,
  position: "after",
  insertion: `

                          const queueDecisionConfidence =
                            queueFirstIncident && queueFirstNextMoveLabel
                              ? getQueueDecisionConfidence({
                                  level: queueRiskLevel,
                                  nextMoveLabel: queueFirstNextMoveLabel,
                                  firstIncident: queueFirstIncident,
                                })
                              : "LOW CONFIDENCE";

                          const queueDecisionConfidenceSummary =
                            getQueueDecisionConfidenceSummary(
                              queueDecisionConfidence,
                            );

                          const queueDecisionConfidenceTone =
                            getQueueDecisionConfidenceTone(
                              queueDecisionConfidence,
                            );

                          const queueFirstSignalConfidence = queueFirstIncident
                            ? getSignalConfidenceLabel(queueFirstIncident)
                            : "LOW SIGNAL";`,
});

/**
 * 4) Insert Queue Decision Confidence block after Queue Operator Decision
 */
insertOnce({
  label: "Queue Decision Confidence",
  needle: `                      <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className={metaLabelClassName()}>
                          Queue Execution Checklist
                        </div>`,
  position: "before",
  insertion: `                      <div
                        className={\`mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4 \${signalRingClassName(
                          queueDecisionConfidenceTone,
                        )}\`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className={metaLabelClassName()}>
                              Queue Decision Confidence
                            </div>
                            <div className="mt-2 text-lg font-semibold tracking-tight text-white">
                              {queueDecisionConfidence}
                            </div>
                          </div>

                          <DashboardStatusBadge
                            kind={getQueueDecisionConfidenceBadgeKind(
                              queueDecisionConfidence,
                            )}
                            label={queueDecisionConfidence}
                          />
                        </div>

                        <div className="mt-4 text-sm leading-6 text-zinc-300">
                          {queueDecisionConfidenceSummary}
                        </div>

                        <div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                          <div className={metaLabelClassName()}>
                            Signaux locaux
                          </div>
                          <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                            {queueFirstNextMoveLabel} · {queueRiskLevel} ·{" "}
                            {queueFirstSignalConfidence}
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

`,
});

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.27 appliqué sur :");
console.log(filePath);
