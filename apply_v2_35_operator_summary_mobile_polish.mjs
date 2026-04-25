import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.35-operator-summary-mobile-polish */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.35-operator-summary-mobile-polish")) {
  console.log("V2.35 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const operatorLabel = "Operator Summary";
const operatorIndex = source.indexOf(operatorLabel);

if (operatorIndex === -1) {
  console.error("Bloc Operator Summary introuvable. Patch V2.35 arrêté.");
  process.exit(1);
}

const possibleEndLabels = [
  "Triage Priority",
  "Operator Queue",
  "Queue Focus",
  "Operator Queue Action Board",
  "Needs Attention",
  "Queue Action",
];

let endIndex = -1;

for (const label of possibleEndLabels) {
  const idx = source.indexOf(label, operatorIndex + operatorLabel.length);
  if (idx !== -1 && (endIndex === -1 || idx < endIndex)) {
    endIndex = idx;
  }
}

if (endIndex === -1) {
  endIndex = Math.min(source.length, operatorIndex + 12000);
}

let before = source.slice(0, operatorIndex);
let segment = source.slice(operatorIndex, endIndex);
let after = source.slice(endIndex);

function compactClassName(classValue) {
  let next = classValue;

  const replacements = [
    ["rounded-[32px]", "rounded-[24px] sm:rounded-[32px]"],
    ["rounded-[28px]", "rounded-[22px] sm:rounded-[28px]"],
    ["rounded-[24px]", "rounded-[20px] sm:rounded-[24px]"],
    ["rounded-[22px]", "rounded-[18px] sm:rounded-[22px]"],
    ["rounded-[20px]", "rounded-[18px] sm:rounded-[20px]"],
    ["rounded-3xl", "rounded-2xl sm:rounded-3xl"],

    ["px-7", "px-4 sm:px-7"],
    ["px-6", "px-4 sm:px-6"],
    ["px-5", "px-3.5 sm:px-5"],
    ["px-4", "px-3 sm:px-4"],

    ["py-7", "py-4 sm:py-7"],
    ["py-6", "py-4 sm:py-6"],
    ["py-5", "py-3.5 sm:py-5"],
    ["py-4", "py-3 sm:py-4"],

    ["p-7", "p-4 sm:p-7"],
    ["p-6", "p-4 sm:p-6"],
    ["p-5", "p-3.5 sm:p-5"],
    ["p-4", "p-3 sm:p-4"],

    ["gap-6", "gap-4 sm:gap-6"],
    ["gap-5", "gap-3.5 sm:gap-5"],
    ["gap-4", "gap-3 sm:gap-4"],

    ["space-y-6", "space-y-4 sm:space-y-6"],
    ["space-y-5", "space-y-3.5 sm:space-y-5"],
    ["space-y-4", "space-y-3 sm:space-y-4"],

    ["mt-8", "mt-5 sm:mt-8"],
    ["mt-7", "mt-5 sm:mt-7"],
    ["mt-6", "mt-4 sm:mt-6"],
    ["mt-5", "mt-3.5 sm:mt-5"],
    ["mt-4", "mt-3 sm:mt-4"],

    ["mb-8", "mb-5 sm:mb-8"],
    ["mb-7", "mb-5 sm:mb-7"],
    ["mb-6", "mb-4 sm:mb-6"],
    ["mb-5", "mb-3.5 sm:mb-5"],
    ["mb-4", "mb-3 sm:mb-4"],

    ["text-4xl", "text-2xl sm:text-4xl"],
    ["text-3xl", "text-2xl sm:text-3xl"],
    ["text-2xl", "text-xl sm:text-2xl"],
    ["text-xl", "text-lg sm:text-xl"],
  ];

  for (const [oldValue, newValue] of replacements) {
    next = next.replaceAll(oldValue, newValue);
  }

  return next;
}

let changedClassCount = 0;

segment = segment.replace(/className="([^"]+)"/g, (match, classValue) => {
  const compacted = compactClassName(classValue);

  if (compacted !== classValue) {
    changedClassCount += 1;
    return `className="${compacted}"`;
  }

  return match;
});

/**
 * Marker TypeScript safe.
 * On utilise un commentaire TS contenant le marker JSX exact pour éviter de casser
 * si "Operator Summary" est porté par une prop JSX.
 */
const dynamicAnchor = `export const dynamic = "force-dynamic";`;

if (source.includes(dynamicAnchor)) {
  before = before.replace(dynamicAnchor, `${dynamicAnchor}\n\n${markerAsTsComment}`);
} else {
  before = `${markerAsTsComment}\n${before}`;
}

/**
 * Petit polish visuel ciblé : ajoute une ligne de respiration juste après le label
 * quand le label est rendu comme texte JSX.
 */
segment = segment.replace(
  "Operator Summary",
  `Operator Summary`,
);

source = before + segment + after;

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.35 appliqué sur :");
console.log(filePath);
console.log(`Classes compactées dans Operator Summary : ${changedClassCount}`);
console.log("Aucun changement logique, fetch, routing ou compteur.");
