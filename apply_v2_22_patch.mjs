import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable : ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

const helpers = `
type QueueRiskLevel = "HIGH RISK" | "MEDIUM RISK" | "LOW RISK";

function getQueueRiskStats(
  incidents: IncidentItem[],
): {
  escalated: number;
  highCritical: number;
  slaRisk: number;
  needsContext: number;
} {
  return incidents.reduce(
    (acc, incident) => {
      const status = getIncidentStatusNormalized(incident);
      const severity = getIncidentSeverityNormalized(incident);
      const slaLabel = getSlaLabel(incident).trim().toUpperCase();
      const actionReadinessLabel = getIncidentActionReadinessLabel(incident);

      if (status === "escalated") acc.escalated += 1;

      if (severity === "high" || severity === "critical") {
        acc.highCritical += 1;
      }

      if (slaLabel === "BREACHED" || slaLabel === "WARNING") {
        acc.slaRisk += 1;
      }

      if (actionReadinessLabel === "NEEDS CONTEXT") {
        acc.needsContext += 1;
      }

      return acc;
    },
    {
      escalated: 0,
      highCritical: 0,
      slaRisk: 0,
      needsContext: 0,
    },
  );
}

function getQueueRiskLevel(
  incidents: IncidentItem[],
  activeWorkspaceId?: string,
): QueueRiskLevel {
  const scopedIncidents = activeWorkspaceId
    ? incidents.filter((incident) =>
        workspaceMatchesOrUnscoped(
          getIncidentWorkspaceId(incident),
          activeWorkspaceId,
        ),
      )
    : incidents;

  const stats = getQueueRiskStats(scopedIncidents);

  const hasCritical = scopedIncidents.some(
    (incident) => getIncidentSeverityNormalized(incident) === "critical",
  );

  const hasBreachedSla = scopedIncidents.some(
    (incident) => getSlaLabel(incident).trim().toUpperCase() === "BREACHED",
  );

  if (stats.escalated > 0 || hasCritical || hasBreachedSla) {
    return "HIGH RISK";
  }

  if (stats.highCritical > 0 || stats.slaRisk > 0 || stats.needsContext > 0) {
    return "MEDIUM RISK";
  }

  return "LOW RISK";
}

function getQueueRiskSummary(level: QueueRiskLevel): string {
  if (level === "HIGH RISK") return "Risque fort détecté dans cette file.";
  if (level === "MEDIUM RISK") return "Risque moyen détecté dans cette file.";

  return "Risque faible sur cette file.";
}
`;

const stateBlock = `  const queueRiskStats = getQueueRiskStats(queueFocusedIncidents);
  const queueRiskLevel = getQueueRiskLevel(
    queueFocusedIncidents,
    activeWorkspaceId,
  );

`;

const riskBlock = `
                      <div
                        className={\`\${metaBoxClassName()} mt-5 \${signalRingClassName(
                          queueRiskLevel === "HIGH RISK"
                            ? "danger"
                            : queueRiskLevel === "MEDIUM RISK"
                              ? "warning"
                              : "success",
                        )}\`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className={metaLabelClassName()}>
                              Queue Risk Signal
                            </div>

                            <div className="mt-2 text-base font-semibold tracking-tight text-white">
                              {queueRiskLevel}
                            </div>
                          </div>

                          <DashboardStatusBadge
                            kind={
                              queueRiskLevel === "HIGH RISK"
                                ? "failed"
                                : queueRiskLevel === "MEDIUM RISK"
                                  ? "retry"
                                  : "success"
                            }
                            label={queueRiskLevel}
                          />
                        </div>

                        <div className="mt-3 text-sm leading-6 text-zinc-300">
                          {getQueueRiskSummary(queueRiskLevel)}
                        </div>

                        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                          <div className={metaLabelClassName()}>
                            Compteurs locaux
                          </div>

                          <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                            {queueRiskStats.escalated} escalated ·{" "}
                            {queueRiskStats.highCritical} high/critical ·{" "}
                            {queueRiskStats.slaRisk} SLA risk ·{" "}
                            {queueRiskStats.needsContext} context
                          </div>
                        </div>
                      </div>
`;

if (!source.includes('type QueueRiskLevel = "HIGH RISK"')) {
  const helperAnchor = "function getPluralLabel(";

  if (!source.includes(helperAnchor)) {
    console.error("Point d’insertion helpers introuvable.");
    process.exit(1);
  }

  source = source.replace(helperAnchor, `${helpers}\n${helperAnchor}`);
  console.log("Helpers Queue Risk V2.22 ajoutés.");
} else {
  console.log("Helpers Queue Risk V2.22 déjà présents.");
}

if (!source.includes("const queueRiskStats = getQueueRiskStats(queueFocusedIncidents);")) {
  const stateAnchor = `  const queueFocusedFirstIncidentHref = getQueueFocusedFirstIncidentHref({
    incidents: queueFocusedIncidents,
    activeWorkspaceId,
  });

`;

  if (!source.includes(stateAnchor)) {
    console.error("Point d’insertion variables Queue Risk introuvable.");
    process.exit(1);
  }

  source = source.replace(stateAnchor, `${stateAnchor}${stateBlock}`);
  console.log("Variables Queue Risk V2.22 ajoutées.");
} else {
  console.log("Variables Queue Risk V2.22 déjà présentes.");
}

if (!source.includes("Queue Risk Signal")) {
  const firstBriefIndex = source.indexOf("First Incident Brief");

  if (firstBriefIndex === -1) {
    console.error("Bloc First Incident Brief introuvable. Vérifie que V2.21 est présent.");
    process.exit(1);
  }

  const ctaAnchor = `                      <div className="mt-5 grid gap-3 sm:grid-cols-2">`;
  const ctaIndex = source.indexOf(ctaAnchor, firstBriefIndex);

  if (ctaIndex === -1) {
    console.error("Point d’insertion UI Queue Risk introuvable.");
    process.exit(1);
  }

  source =
    source.slice(0, ctaIndex) +
    riskBlock +
    "\n" +
    source.slice(ctaIndex);

  console.log("Bloc Queue Risk Signal V2.22 ajouté.");
} else {
  console.log("Bloc Queue Risk Signal V2.22 déjà présent.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.22 appliqué sur :");
console.log(filePath);
