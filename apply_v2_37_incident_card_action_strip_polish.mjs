import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.37-incident-card-action-strip-polish */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.37-incident-card-action-strip-polish")) {
  console.log("V2.37 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const firstIncidentLabel = "BOSAI INCIDENT";
const firstIncidentIndex = source.indexOf(firstIncidentLabel);

if (firstIncidentIndex === -1) {
  console.error("Label BOSAI INCIDENT introuvable. Patch V2.37 arrêté.");
  process.exit(1);
}

const segmentStart = Math.max(0, firstIncidentIndex - 2500);
const segmentEnd = Math.min(source.length, firstIncidentIndex + 32000);

let before = source.slice(0, segmentStart);
let segment = source.slice(segmentStart, segmentEnd);
let after = source.slice(segmentEnd);

const dynamicAnchor = `export const dynamic = "force-dynamic";`;

if (source.includes(dynamicAnchor)) {
  source = source.replace(dynamicAnchor, `${dynamicAnchor}\n\n${markerAsTsComment}`);
  before = source.slice(0, segmentStart + markerAsTsComment.length + 2);
  segment = source.slice(
    segmentStart + markerAsTsComment.length + 2,
    segmentEnd + markerAsTsComment.length + 2,
  );
  after = source.slice(segmentEnd + markerAsTsComment.length + 2);
} else {
  before = `${markerAsTsComment}\n${before}`;
}

let replacements = 0;

function replaceAllScoped(label, oldText, newText) {
  if (!segment.includes(oldText)) {
    console.log(`Non trouvé, ignoré : ${label}`);
    return;
  }

  const count = segment.split(oldText).length - 1;
  segment = segment.replaceAll(oldText, newText);
  replacements += count;
  console.log(`OK: ${label} (${count})`);
}

/**
 * Polish visuel mobile des badges/actions.
 * Scope limité à la zone des cartes BOSAI INCIDENT.
 */

replaceAllScoped(
  "badges pills plus compacts",
  `rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5`,
  `rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5`,
);

replaceAllScoped(
  "badges pills emerald compacts",
  `rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5`,
  `rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5`,
);

replaceAllScoped(
  "badges pills rose compacts",
  `rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1.5`,
  `rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5`,
);

replaceAllScoped(
  "badges pills amber compacts",
  `rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5`,
  `rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5`,
);

replaceAllScoped(
  "action links compacts",
  `inline-flex items-center justify-center rounded-full px-4 py-2 text-sm`,
  `inline-flex items-center justify-center rounded-full px-3 py-2 text-sm sm:px-4`,
);

replaceAllScoped(
  "action links large compacts",
  `inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm`,
  `inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm sm:px-5 sm:py-2.5`,
);

replaceAllScoped(
  "action strip gap compact",
  `flex flex-wrap gap-3`,
  `flex flex-wrap gap-2.5 sm:gap-3`,
);

replaceAllScoped(
  "action strip gap compact 2",
  `flex flex-wrap items-center gap-3`,
  `flex flex-wrap items-center gap-2.5 sm:gap-3`,
);

replaceAllScoped(
  "incident footer gap compact",
  `mt-5 flex flex-wrap`,
  `mt-4 flex flex-wrap sm:mt-5`,
);

replaceAllScoped(
  "incident footer gap compact 2",
  `mt-4 flex flex-wrap`,
  `mt-3 flex flex-wrap sm:mt-4`,
);

/**
 * Ajout d’un anchor JSX visible près des cartes incidents.
 */
const localIncidentIndex = segment.indexOf(firstIncidentLabel);

if (localIncidentIndex !== -1) {
  const localMarker = `{/* V2.37-card-action-strip-anchor */}`;
  if (!segment.includes(localMarker)) {
    segment =
      segment.slice(0, localIncidentIndex) +
      `${localMarker}\n` +
      segment.slice(localIncidentIndex);
  }
}

source = before + segment + after;

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.37 appliqué sur :");
console.log(filePath);
console.log(`Remplacements visuels appliqués : ${replacements}`);
console.log("Aucun changement logique, fetch, routing, compteur ou lien.");
