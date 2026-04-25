#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const targetPath = path.join(process.cwd(), "app", "incidents", "page.tsx");
const backupPath = path.join(process.cwd(), "app", "incidents", "page.tsx.backup-before-v2-20");
const completeCopyPath = path.join(process.cwd(), "app", "incidents", "page.v2-20.complete.tsx");

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function ok(message) {
  console.log(`✅ ${message}`);
}

function replaceOnce(source, anchor, replacement, label) {
  if (!source.includes(anchor)) {
    fail(`Anchor introuvable pour: ${label}`);
  }

  return source.replace(anchor, replacement);
}

if (!fs.existsSync(targetPath)) {
  fail(`Fichier introuvable: ${targetPath}`);
}

let source = fs.readFileSync(targetPath, "utf8");

if (!source.includes("function getOperatorQueueProgressLabel(")) {
  fail("Baseline V2.19 non détectée: getOperatorQueueProgressLabel est introuvable.");
}

if (!source.includes("function getOperatorQueueRemainingLabel(")) {
  fail("Baseline V2.19 non détectée: getOperatorQueueRemainingLabel est introuvable.");
}

if (!source.includes("Operator Progress")) {
  fail("Baseline V2.19 non détectée: bloc Operator Progress introuvable.");
}

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, source, "utf8");
  ok(`Backup créé: ${backupPath}`);
} else {
  ok(`Backup déjà présent: ${backupPath}`);
}

const helpersAnchor = `function getPluralLabel(
  count: number,
  singular: string,
  plural: string,
): string {
  return \`${"${count} ${count > 1 ? plural : singular}"}\`;
}`;

const helpersBlock = `function getOperatorQueuePreviousFilter(
  filter: OperatorQueueFilter,
): OperatorQueueFilter {
  if (filter === "now") return "watch";
  if (filter === "next") return "now";
  if (filter === "context") return "next";
  if (filter === "watch") return "context";

  return "all";
}

function getOperatorQueueNextFilter(
  filter: OperatorQueueFilter,
): OperatorQueueFilter {
  if (filter === "now") return "next";
  if (filter === "next") return "context";
  if (filter === "context") return "watch";
  if (filter === "watch") return "now";

  return "all";
}

function getOperatorQueuePositionLabel(
  filter: OperatorQueueFilter,
): string {
  if (filter === "now") return "File 1 / 4";
  if (filter === "next") return "File 2 / 4";
  if (filter === "context") return "File 3 / 4";
  if (filter === "watch") return "File 4 / 4";

  return "Toutes les files";
}

`;

if (!source.includes("function getOperatorQueuePreviousFilter(")) {
  source = replaceOnce(
    source,
    helpersAnchor,
    helpersBlock + helpersAnchor,
    "helpers V2.20 avant getPluralLabel",
  );
  ok("Helpers V2.20 ajoutés.");
} else {
  ok("Helpers V2.20 déjà présents.");
}

const constantsAnchor = `const queueFocusedFirstIncidentHref = getQueueFocusedFirstIncidentHref({
    incidents: queueFocusedIncidents,
    activeWorkspaceId,
  });`;

const constantsBlock = `const queueFocusedFirstIncidentHref = getQueueFocusedFirstIncidentHref({
    incidents: queueFocusedIncidents,
    activeWorkspaceId,
  });

  const previousQueueFilter = getOperatorQueuePreviousFilter(operatorQueueFilter);
  const nextQueueFilter = getOperatorQueueNextFilter(operatorQueueFilter);

  const previousQueueHref = getOperatorQueueFilterHref({
    filter: previousQueueFilter,
    activeWorkspaceId,
    flowId,
    rootEventId,
    sourceRecordId,
    commandId,
  });

  const nextQueueHref = getOperatorQueueFilterHref({
    filter: nextQueueFilter,
    activeWorkspaceId,
    flowId,
    rootEventId,
    sourceRecordId,
    commandId,
  });`;

if (!source.includes("const previousQueueHref = getOperatorQueueFilterHref({")) {
  source = replaceOnce(
    source,
    constantsAnchor,
    constantsBlock,
    "constantes previousQueueHref / nextQueueHref",
  );
  ok("Constantes V2.20 ajoutées.");
} else {
  ok("Constantes V2.20 déjà présentes.");
}

const progressBlock = `<div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className={metaLabelClassName()}>Operator Progress</div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Position
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              Premier incident prêt
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              Reste à traiter
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getOperatorQueueRemainingLabel(queueFocusedIncidents.length)}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                              File active
                            </div>
                            <div className="mt-2 text-sm font-medium text-zinc-100">
                              {getOperatorQueueProgressLabel(operatorQueueFilter)}
                            </div>
                          </div>
                        </div>
                      </div>`;

const navigationBlock = `<div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className={metaLabelClassName()}>Queue Navigation</div>

                        <div className="mt-2 text-sm font-medium text-zinc-100">
                          {getOperatorQueuePositionLabel(operatorQueueFilter)}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <Link
                            href={previousQueueHref}
                            className={actionLinkClassName("soft")}
                          >
                            File précédente
                          </Link>

                          <Link
                            href={nextQueueHref}
                            className={actionLinkClassName("soft")}
                          >
                            File suivante
                          </Link>

                          <Link href={allQueuesHref} className={actionLinkClassName("soft")}>
                            All queues
                          </Link>
                        </div>
                      </div>`;

if (!source.includes("Queue Navigation")) {
  source = replaceOnce(
    source,
    progressBlock,
    `${progressBlock}

                      ${navigationBlock}`,
    "bloc Queue Navigation après Operator Progress",
  );
  ok("Bloc Queue Navigation V2.20 ajouté.");
} else {
  ok("Bloc Queue Navigation déjà présent.");
}

const requiredChecks = [
  "function getOperatorQueuePreviousFilter(",
  "function getOperatorQueueNextFilter(",
  "function getOperatorQueuePositionLabel(",
  "const previousQueueHref = getOperatorQueueFilterHref({",
  "const nextQueueHref = getOperatorQueueFilterHref({",
  "Queue Navigation",
  "File précédente",
  "File suivante",
  "All queues",
];

for (const check of requiredChecks) {
  if (!source.includes(check)) {
    fail(`Check final échoué: ${check}`);
  }
}

fs.writeFileSync(targetPath, source, "utf8");
fs.writeFileSync(completeCopyPath, source, "utf8");

console.log("\n✅ Fichier complet V2.20 généré.");
console.log(`✅ Fichier remplacé: ${targetPath}`);
console.log(`✅ Copie complète: ${completeCopyPath}`);
console.log("Commande suivante: npm run build\n");
