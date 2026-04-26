import fs from "node:fs";
import path from "node:path";

const marker = "Incident Detail V3.0-operator-action-console";
const markerJsx = "{/* Incident Detail V3.0-operator-action-console */}";

const incidentsRoot = "src/app/(dashboard)/incidents";

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile() && entry.name === "page.tsx") return [fullPath];

    return [];
  });
}

const candidates = walk(incidentsRoot).filter((file) => {
  const normalized = file.replaceAll("\\", "/");

  if (normalized.endsWith("/incidents/page.tsx")) return false;
  if (!normalized.includes("/incidents/")) return false;

  return true;
});

if (candidates.length === 0) {
  console.error("Aucune page détail incident trouvée sous src/app/(dashboard)/incidents.");
  process.exit(1);
}

let targetFile = null;

for (const file of candidates) {
  const content = fs.readFileSync(file, "utf8");

  const looksLikeIncidentDetail =
    content.includes("fetchIncidents") ||
    content.includes("Incident") ||
    content.includes("incident") ||
    content.includes("notFound");

  if (looksLikeIncidentDetail) {
    targetFile = file;
    break;
  }
}

if (!targetFile) {
  console.error("Impossible d'identifier une page détail incident sûre.");
  console.error("Candidats trouvés :");
  for (const candidate of candidates) console.error(`- ${candidate}`);
  process.exit(1);
}

let source = fs.readFileSync(targetFile, "utf8");

if (source.includes(marker)) {
  console.log(`V3.0 déjà appliqué dans ${targetFile}. Aucune modification.`);
  process.exit(0);
}

const incidentVarCandidates = [
  "incident",
  "currentIncident",
  "selectedIncident",
  "matchedIncident",
  "incidentItem",
  "detailIncident",
  "activeIncident",
];

let incidentVar = null;

for (const name of incidentVarCandidates) {
  const declarationRegex = new RegExp(`\\bconst\\s+${name}\\s*=|\\blet\\s+${name}\\s*=|\\bvar\\s+${name}\\s*=`);
  if (declarationRegex.test(source)) {
    incidentVar = name;
    break;
  }
}

if (!incidentVar) {
  const genericIncidentMatch = source.match(/\bconst\s+([A-Za-z0-9_]*incident[A-Za-z0-9_]*)\s*=/i);
  if (genericIncidentMatch?.[1] && !/id$/i.test(genericIncidentMatch[1])) {
    incidentVar = genericIncidentMatch[1];
  }
}

if (!incidentVar) {
  console.error("Variable incident introuvable. Patch arrêté pour éviter de casser le build.");
  console.error("Cherche dans la page détail une variable du type : incident, currentIncident, selectedIncident.");
  console.error(`Fichier détecté : ${targetFile}`);
  process.exit(1);
}

const queueCandidates = [
  "queue",
  "queueFilter",
  "activeQueue",
  "operatorQueueFilter",
  "sourceQueue",
  "queueParam",
];

let queueExpr = "undefined";

for (const name of queueCandidates) {
  const declarationRegex = new RegExp(`\\bconst\\s+${name}\\s*=|\\blet\\s+${name}\\s*=|\\bvar\\s+${name}\\s*=`);
  if (declarationRegex.test(source)) {
    queueExpr = name;
    break;
  }
}

const componentCode = `

/* ${marker} */
type IncidentDetailOperatorConsoleRecord = Record<string, unknown>;

function getIncidentDetailConsoleRecord(value: unknown): IncidentDetailOperatorConsoleRecord {
  if (!value || typeof value !== "object") return {};
  return value as IncidentDetailOperatorConsoleRecord;
}

function getIncidentDetailConsoleString(
  source: unknown,
  keys: string[],
  fallback = "UNKNOWN",
): string {
  const record = getIncidentDetailConsoleRecord(source);
  const nestedCandidates = [
    record,
    getIncidentDetailConsoleRecord(record.fields),
    getIncidentDetailConsoleRecord(record.payload),
    getIncidentDetailConsoleRecord(record.raw),
  ];

  for (const candidate of nestedCandidates) {
    for (const key of keys) {
      const value = candidate[key];

      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }

      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
    }
  }

  return fallback;
}

function getIncidentDetailConsoleStatus(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "status",
    "Status",
    "status_select",
    "Status_select",
    "incident_status",
    "Incident_Status",
  ], "UNKNOWN");
}

function getIncidentDetailConsoleSeverity(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "severity",
    "Severity",
    "risk",
    "Risk",
    "priority",
    "Priority",
  ], "UNKNOWN");
}

function getIncidentDetailConsoleWorkspace(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "workspaceId",
    "workspace_id",
    "Workspace_ID",
    "workspace",
    "Workspace",
  ], "default");
}

function getIncidentDetailConsoleCommandId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "commandId",
    "command_id",
    "Command_ID",
    "linkedCommand",
    "linked_command",
    "Linked_Command",
    "commandRecordId",
    "Command_Record_ID",
  ], "");
}

function getIncidentDetailConsoleRunId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "runId",
    "run_id",
    "Run_ID",
    "runRecordId",
    "run_record_id",
    "Run_Record_ID",
    "linkedRun",
    "Linked_Run",
  ], "");
}

function getIncidentDetailConsoleFlowId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "flowId",
    "flow_id",
    "Flow_ID",
  ], "");
}

function getIncidentDetailConsoleEventId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "eventId",
    "event_id",
    "Event_ID",
    "rootEventId",
    "root_event_id",
    "Root_Event_ID",
    "sourceEventId",
    "source_event_id",
    "Source_Event_ID",
  ], "");
}

function getIncidentDetailConsoleId(incident: unknown): string {
  return getIncidentDetailConsoleString(incident, [
    "id",
    "recordId",
    "record_id",
    "Record_ID",
    "incidentId",
    "incident_id",
    "Incident_ID",
  ], "incident");
}

function getIncidentDetailReadiness(args: {
  status: string;
  severity: string;
  commandId: string;
}): "READY TO ACT" | "NEEDS CONTEXT" | "WATCH ONLY" {
  const status = args.status.toLowerCase();
  const severity = args.severity.toLowerCase();

  if (
    status.includes("resolved") ||
    status.includes("closed") ||
    severity.includes("low")
  ) {
    return "WATCH ONLY";
  }

  if (!args.commandId) {
    return "NEEDS CONTEXT";
  }

  if (
    status.includes("escalated") ||
    status.includes("open") ||
    severity.includes("high") ||
    severity.includes("critical")
  ) {
    return "READY TO ACT";
  }

  return "NEEDS CONTEXT";
}

function getIncidentDetailConfidence(args: {
  commandId: string;
  flowId: string;
  runId: string;
}): "HIGH CONFIDENCE" | "MEDIUM CONFIDENCE" | "LOW CONFIDENCE" {
  if (args.commandId && args.flowId) return "HIGH CONFIDENCE";
  if (args.commandId || args.runId || args.flowId) return "MEDIUM CONFIDENCE";
  return "LOW CONFIDENCE";
}

function getIncidentDetailTargetSurface(args: {
  commandId: string;
  flowId: string;
  runId: string;
}): string {
  if (args.commandId) return "OPEN COMMAND";
  if (args.flowId) return "OPEN FLOW";
  if (args.runId) return "OPEN RUN";
  return "INCIDENT CONTEXT";
}

function getIncidentDetailDecision(readiness: "READY TO ACT" | "NEEDS CONTEXT" | "WATCH ONLY"): string {
  if (readiness === "READY TO ACT") return "Intervenir via la surface liée";
  if (readiness === "NEEDS CONTEXT") return "Compléter le contexte avant action";
  return "Surveiller sans exécution";
}

function getIncidentDetailPrimaryAction(readiness: "READY TO ACT" | "NEEDS CONTEXT" | "WATCH ONLY"): string {
  if (readiness === "READY TO ACT") return "Ouvrir la command liée";
  if (readiness === "NEEDS CONTEXT") return "Vérifier les liens d’exécution";
  return "Surveiller l’incident";
}

function buildIncidentDetailHref(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "UNKNOWN") search.set(key, value);
  }

  const query = search.toString();
  return query ? \`\${path}?\${query}\` : path;
}

function IncidentDetailOperatorActionConsole({
  incident,
  queueFilter,
}: {
  incident: unknown;
  queueFilter?: string | null;
}) {
  const incidentId = getIncidentDetailConsoleId(incident);
  const status = getIncidentDetailConsoleStatus(incident);
  const severity = getIncidentDetailConsoleSeverity(incident);
  const workspaceId = getIncidentDetailConsoleWorkspace(incident);
  const commandId = getIncidentDetailConsoleCommandId(incident);
  const runId = getIncidentDetailConsoleRunId(incident);
  const flowId = getIncidentDetailConsoleFlowId(incident);
  const eventId = getIncidentDetailConsoleEventId(incident);

  const readiness = getIncidentDetailReadiness({
    status,
    severity,
    commandId,
  });

  const confidence = getIncidentDetailConfidence({
    commandId,
    flowId,
    runId,
  });

  const targetSurface = getIncidentDetailTargetSurface({
    commandId,
    flowId,
    runId,
  });

  const decision = getIncidentDetailDecision(readiness);
  const primaryAction = getIncidentDetailPrimaryAction(readiness);

  const incidentsHref = buildIncidentDetailHref("/incidents", {
    workspace_id: workspaceId,
  });

  const queueHref = buildIncidentDetailHref("/incidents", {
    workspace_id: workspaceId,
    queue: queueFilter || "now",
  });

  const allQueuesHref = buildIncidentDetailHref("/incidents", {
    workspace_id: workspaceId,
    queue: "all",
  });

  const commandHref = commandId
    ? buildIncidentDetailHref(\`/commands/\${encodeURIComponent(commandId)}\`, {
        workspace_id: workspaceId,
        flow_id: flowId,
        root_event_id: eventId,
      })
    : "";

  const flowHref = flowId
    ? buildIncidentDetailHref(\`/flows/\${encodeURIComponent(flowId)}\`, {
        workspace_id: workspaceId,
        root_event_id: eventId,
      })
    : "";

  const runHref = runId
    ? buildIncidentDetailHref(\`/runs/\${encodeURIComponent(runId)}\`, {
        workspace_id: workspaceId,
        flow_id: flowId,
      })
    : "";

  const actionHref = commandHref || flowHref || runHref || incidentsHref;

  const readinessClassName =
    readiness === "READY TO ACT"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : readiness === "NEEDS CONTEXT"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-sky-400/25 bg-sky-500/10 text-sky-200";

  return (
    <section className="w-full rounded-[2rem] border border-cyan-400/20 bg-cyan-950/15 p-4 shadow-[0_0_80px_rgba(34,211,238,0.08)] sm:p-6">
      {/* Incident Detail V3.0-operator-action-console */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/60">
            Operator Action Console
          </p>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Console opérateur incident
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Lecture décisionnelle locale : aucune action exécutée, aucune écriture base, aucun appel worker.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Incident
            </p>
            <p className="mt-3 break-words text-base font-semibold text-white">
              {incidentId}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Statut / sévérité
            </p>
            <p className="mt-3 text-base font-semibold text-white">
              {status} · {severity}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Workspace
            </p>
            <p className="mt-3 break-words text-base font-semibold text-white">
              {workspaceId}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/70">
              Décision opérateur
            </p>
            <p className="mt-3 text-xl font-semibold text-white">
              {decision}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                {targetSurface}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200">
                {confidence}
              </span>
            </div>
          </div>

          <div className={\`rounded-3xl border p-4 \${readinessClassName}\`}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-70">
              Action Readiness
            </p>
            <p className="mt-3 text-xl font-semibold text-white">
              {readiness}
            </p>
            <p className="mt-3 text-sm leading-6 opacity-80">
              {primaryAction}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200/70">
            Linked Execution Path
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            {[
              ["Incident", incidentId],
              ["Command", commandId || "No linked command"],
              ["Run", runId || "No linked run"],
              ["Flow", flowId || "No linked flow"],
              ["Event", eventId || "No linked event"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  {label}
                </p>
                <p className="mt-2 break-words text-sm font-medium text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-zinc-400">
            Incident → Command → Run → Flow → Event
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <a
            href={actionHref}
            className="inline-flex items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
          >
            {primaryAction}
          </a>

          {commandHref ? (
            <a
              href={commandHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir la command liée
            </a>
          ) : null}

          {flowHref ? (
            <a
              href={flowHref}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir le flow lié
            </a>
          ) : null}

          <a
            href={incidentsHref}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Retour Incidents
          </a>

          {queueFilter ? (
            <a
              href={queueHref}
              className="inline-flex items-center justify-center rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15"
            >
              Retour file active
            </a>
          ) : null}

          <a
            href={allQueuesHref}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Retour All queues
          </a>
        </div>
      </div>
    </section>
  );
}
`;

const exportDefaultIndex = source.indexOf("export default");

if (exportDefaultIndex === -1) {
  console.error("export default introuvable dans la page détail. Patch arrêté.");
  console.error(`Fichier : ${targetFile}`);
  process.exit(1);
}

source =
  source.slice(0, exportDefaultIndex) +
  componentCode +
  "\n" +
  source.slice(exportDefaultIndex);

const returnIndex = source.indexOf("return (", exportDefaultIndex + componentCode.length);

if (returnIndex === -1) {
  console.error("return ( introuvable après export default. Patch arrêté.");
  console.error(`Fichier : ${targetFile}`);
  process.exit(1);
}

const sectionIndex = source.indexOf("<SectionCard", returnIndex);
const shellCloseIndex = source.indexOf("</ControlPlaneShell>", returnIndex);

const consoleCall = `
          ${markerJsx}
          <IncidentDetailOperatorActionConsole
            incident={${incidentVar}}
            queueFilter={${queueExpr}}
          />

`;

if (sectionIndex !== -1) {
  source =
    source.slice(0, sectionIndex) +
    consoleCall +
    source.slice(sectionIndex);
} else if (shellCloseIndex !== -1) {
  source =
    source.slice(0, shellCloseIndex) +
    consoleCall +
    source.slice(shellCloseIndex);
} else {
  console.error("Point d'insertion JSX introuvable. Patch arrêté.");
  console.error("Ni <SectionCard ni </ControlPlaneShell> trouvé après return.");
  console.error(`Fichier : ${targetFile}`);
  process.exit(1);
}

fs.writeFileSync(targetFile, source, "utf8");

console.log("");
console.log("Patch Incident Detail V3.0 appliqué.");
console.log(`Fichier modifié : ${targetFile}`);
console.log(`Variable incident utilisée : ${incidentVar}`);
console.log(`Variable queue utilisée : ${queueExpr}`);
console.log("Ajout : Operator Action Console, Action Readiness, Linked Execution Path.");
console.log("Aucune logique métier, mutation, endpoint, fetch ou écriture base modifiée.");
