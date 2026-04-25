import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable: ${filePath}`);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");

if (source.includes("First Incident Brief")) {
  console.log("V2.21 déjà présent. Aucun changement appliqué.");
  process.exit(0);
}

const varsAnchor = `  const queueFocusedFirstIncidentHref = getQueueFocusedFirstIncidentHref({
    incidents: queueFocusedIncidents,
    activeWorkspaceId,
  });
`;

const varsPatch = `${varsAnchor}

  const queueFocusedFirstIncident = queueFocusedIncidents[0] || null;

  const queueFocusedFirstIncidentCommandHref = queueFocusedFirstIncident
    ? getCommandHref(queueFocusedFirstIncident, activeWorkspaceId)
    : "";

  const queueFocusedFirstIncidentFlowHref = queueFocusedFirstIncident
    ? getFlowHref(queueFocusedFirstIncident, activeWorkspaceId)
    : "";

  const queueFocusedFirstIncidentEventHref = queueFocusedFirstIncident
    ? getEventHref(queueFocusedFirstIncident, activeWorkspaceId)
    : "";

  const queueFocusedFirstIncidentNextMoveLabel = queueFocusedFirstIncident
    ? getIncidentNextMoveLabel({
        incident: queueFocusedFirstIncident,
        commandHref: queueFocusedFirstIncidentCommandHref,
        flowHref: queueFocusedFirstIncidentFlowHref,
        eventHref: queueFocusedFirstIncidentEventHref,
      })
    : null;

  const queueFocusedFirstIncidentNextMoveReason =
    queueFocusedFirstIncidentNextMoveLabel
      ? getIncidentNextMoveReason(queueFocusedFirstIncidentNextMoveLabel)
      : "";
`;

if (!source.includes(varsAnchor)) {
  console.error("Point d’insertion variables introuvable.");
  process.exit(1);
}

source = source.replace(varsAnchor, varsPatch);

const ctaAnchor = `                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {queueFocusedFirstIncidentHref ? (`;

const firstIncidentBriefBlock = `                      {queueFocusedFirstIncident &&
                      queueFocusedFirstIncidentNextMoveLabel ? (
                        <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                          <div className={metaLabelClassName()}>
                            First Incident Brief
                          </div>

                          <div className="mt-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Incident
                            </div>
                            <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                              {getIncidentDisplayTitle(queueFocusedFirstIncident)}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-zinc-500">
                              {getIncidentStatusLabel(queueFocusedFirstIncident)} ·{" "}
                              {getIncidentSeverityDisplayLabel(
                                queueFocusedFirstIncident,
                              )} · {getWorkspaceDisplay(queueFocusedFirstIncident)}
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Next surface
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

                            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Pourquoi l’ouvrir
                              </div>
                              <div className="mt-2 text-sm leading-6 text-zinc-300">
                                {queueFocusedFirstIncidentNextMoveReason}
                              </div>
                            </div>
                          </div>

                          {queueFocusedFirstIncidentHref ? (
                            <div className="mt-4">
                              <Link
                                href={queueFocusedFirstIncidentHref}
                                className={actionLinkClassName("soft")}
                              >
                                Ouvrir ce premier incident
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

${ctaAnchor}`;

if (!source.includes(ctaAnchor)) {
  console.error("Point d’insertion First Incident Brief introuvable.");
  process.exit(1);
}

source = source.replace(ctaAnchor, firstIncidentBriefBlock);

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.21 appliqué sur:");
console.log(filePath);
