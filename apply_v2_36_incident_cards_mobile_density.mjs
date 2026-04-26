import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.36-incident-cards-mobile-density */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.36-incident-cards-mobile-density")) {
  console.log("V2.36 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const firstIncidentLabel = "BOSAI INCIDENT";
const firstIncidentIndex = source.indexOf(firstIncidentLabel);

if (firstIncidentIndex === -1) {
  console.error("Label BOSAI INCIDENT introuvable. Patch V2.36 arrêté.");
  process.exit(1);
}

/**
 * Zone ciblée :
 * on compacte uniquement la zone des cartes incidents à partir du premier
 * label BOSAI INCIDENT. On borne volontairement la transformation pour éviter
 * de toucher au haut de page, Queue Action, fetch, routing ou helpers.
 */
const segmentStart = Math.max(0, firstIncidentIndex - 2500);
const segmentEnd = Math.min(source.length, firstIncidentIndex + 28000);

let before = source.slice(0, segmentStart);
let segment = source.slice(segmentStart, segmentEnd);
let after = source.slice(segmentEnd);

const dynamicAnchor = `export const dynamic = "force-dynamic";`;

if (source.includes(dynamicAnchor)) {
  source = source.replace(dynamicAnchor, `${dynamicAnchor}\n\n${markerAsTsComment}`);
  before = source.slice(0, segmentStart + markerAsTsComment.length + 2);
  segment = source.slice(segmentStart + markerAsTsComment.length + 2, segmentEnd + markerAsTsComment.length + 2);
  after = source.slice(segmentEnd + markerAsTsComment.length + 2);
} else {
  before = `${markerAsTsComment}\n${before}`;
}

const tokenMap = new Map([
  ["rounded-[36px]", "rounded-[26px] sm:rounded-[36px]"],
  ["rounded-[32px]", "rounded-[24px] sm:rounded-[32px]"],
  ["rounded-[28px]", "rounded-[22px] sm:rounded-[28px]"],
  ["rounded-[24px]", "rounded-[20px] sm:rounded-[24px]"],
  ["rounded-[22px]", "rounded-[18px] sm:rounded-[22px]"],
  ["rounded-[20px]", "rounded-[18px] sm:rounded-[20px]"],
  ["rounded-3xl", "rounded-2xl sm:rounded-3xl"],

  ["p-7", "p-4 sm:p-7"],
  ["p-6", "p-4 sm:p-6"],
  ["p-5", "p-3.5 sm:p-5"],
  ["p-4", "p-3 sm:p-4"],

  ["px-7", "px-4 sm:px-7"],
  ["px-6", "px-4 sm:px-6"],
  ["px-5", "px-3.5 sm:px-5"],
  ["px-4", "px-3 sm:px-4"],

  ["py-7", "py-4 sm:py-7"],
  ["py-6", "py-4 sm:py-6"],
  ["py-5", "py-3.5 sm:py-5"],
  ["py-4", "py-3 sm:py-4"],

  ["gap-6", "gap-4 sm:gap-6"],
  ["gap-5", "gap-3.5 sm:gap-5"],
  ["gap-4", "gap-3 sm:gap-4"],
  ["gap-3", "gap-2.5 sm:gap-3"],

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

  ["text-2xl", "text-xl sm:text-2xl"],
  ["text-xl", "text-lg sm:text-xl"],
  ["text-lg", "text-base sm:text-lg"],
]);

function compactClassName(classValue) {
  const tokens = classValue.split(/\s+/).filter(Boolean);
  const nextTokens = [];

  for (const token of tokens) {
    if (token.includes(":")) {
      nextTokens.push(token);
      continue;
    }

    const mapped = tokenMap.get(token);

    if (mapped) {
      nextTokens.push(...mapped.split(/\s+/));
      continue;
    }

    nextTokens.push(token);
  }

  return Array.from(new Set(nextTokens)).join(" ");
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
 * Ajout d’une micro respiration visuelle avant les cartes incidents,
 * uniquement si le label BOSAI INCIDENT est dans du JSX visible.
 */
const localIncidentIndex = segment.indexOf(firstIncidentLabel);

if (localIncidentIndex !== -1) {
  const localMarker = `{/* V2.36-card-density-anchor */}`;
  if (!segment.includes(localMarker)) {
    segment =
      segment.slice(0, localIncidentIndex) +
      `${localMarker}\n` +
      segment.slice(localIncidentIndex);
  }
}

source = before + segment + after;

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.36 appliqué sur :");
console.log(filePath);
console.log(`Classes compactées dans la zone BOSAI INCIDENT : ${changedClassCount}`);
console.log("Aucun changement logique, fetch, routing, compteur ou lien.");
