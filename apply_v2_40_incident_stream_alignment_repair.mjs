import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.40-incident-stream-alignment-repair */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.40-incident-stream-alignment-repair")) {
  console.log("V2.40 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const dynamicAnchor = `export const dynamic = "force-dynamic";`;

if (source.includes(dynamicAnchor)) {
  source = source.replace(dynamicAnchor, `${dynamicAnchor}\n\n${markerAsTsComment}`);
} else {
  source = `${markerAsTsComment}\n${source}`;
}

const streamIndex = source.indexOf("Incident Stream");

if (streamIndex === -1) {
  console.error("Incident Stream introuvable. Patch V2.40 arrêté.");
  process.exit(1);
}

/**
 * Scope volontairement limité :
 * uniquement la zone après Incident Stream, donc la liste / cartes incidents.
 * On ne touche pas Operator Summary, Queue Action, ni le haut de page.
 */
let before = source.slice(0, streamIndex);
let segment = source.slice(streamIndex);

let changes = 0;

function replaceAllSegment(label, oldText, newText) {
  const count = segment.split(oldText).length - 1;

  if (count > 0) {
    segment = segment.replaceAll(oldText, newText);
    changes += count;
    console.log(`OK ${label}: ${count}`);
  } else {
    console.log(`Ignoré ${label}: introuvable`);
  }
}

/**
 * 1) Stopper les grilles trop précoces dans le flux incidents.
 * Les cartes doivent rester en 1 colonne sur mobile + desktop compact.
 * Le multi-colonnes revient uniquement sur très grand écran.
 */
replaceAllSegment(
  "base grid-cols-2 -> ultra-wide only",
  "grid-cols-2",
  "grid-cols-1 min-[1800px]:grid-cols-2",
);

replaceAllSegment(
  "sm:grid-cols-2 -> ultra-wide only",
  "sm:grid-cols-2",
  "min-[1800px]:grid-cols-2",
);

replaceAllSegment(
  "md:grid-cols-2 -> ultra-wide only",
  "md:grid-cols-2",
  "min-[1800px]:grid-cols-2",
);

replaceAllSegment(
  "lg:grid-cols-2 -> ultra-wide only",
  "lg:grid-cols-2",
  "min-[1800px]:grid-cols-2",
);

replaceAllSegment(
  "xl:grid-cols-2 -> ultra-wide only",
  "xl:grid-cols-2",
  "min-[1800px]:grid-cols-2",
);

replaceAllSegment(
  "2xl:grid-cols-2 -> ultra-wide only",
  "2xl:grid-cols-2",
  "min-[1800px]:grid-cols-2",
);

/**
 * 2) Réparer les sous-grilles Investigation / Control.
 * Elles doivent suivre le rendu lisible des cartes resolved :
 * pile verticale sur mobile / laptop, colonnes seulement très large.
 */
replaceAllSegment(
  "base grid-cols-3 -> ultra-wide only",
  "grid-cols-3",
  "grid-cols-1 min-[1800px]:grid-cols-3",
);

replaceAllSegment(
  "sm:grid-cols-3 -> ultra-wide only",
  "sm:grid-cols-3",
  "min-[1800px]:grid-cols-3",
);

replaceAllSegment(
  "md:grid-cols-3 -> ultra-wide only",
  "md:grid-cols-3",
  "min-[1800px]:grid-cols-3",
);

replaceAllSegment(
  "lg:grid-cols-3 -> ultra-wide only",
  "lg:grid-cols-3",
  "min-[1800px]:grid-cols-3",
);

replaceAllSegment(
  "xl:grid-cols-3 -> ultra-wide only",
  "xl:grid-cols-3",
  "min-[1800px]:grid-cols-3",
);

replaceAllSegment(
  "2xl:grid-cols-3 -> ultra-wide only",
  "2xl:grid-cols-3",
  "min-[1800px]:grid-cols-3",
);

/**
 * 3) Réparer les signaux STATUS / SEVERITY / SLA / WORKSPACE.
 * Même règle : lisible d’abord, densité seulement très grand écran.
 */
replaceAllSegment(
  "base grid-cols-4 -> ultra-wide only",
  "grid-cols-4",
  "grid-cols-1 min-[1800px]:grid-cols-4",
);

replaceAllSegment(
  "sm:grid-cols-4 -> ultra-wide only",
  "sm:grid-cols-4",
  "min-[1800px]:grid-cols-4",
);

replaceAllSegment(
  "md:grid-cols-4 -> ultra-wide only",
  "md:grid-cols-4",
  "min-[1800px]:grid-cols-4",
);

replaceAllSegment(
  "lg:grid-cols-4 -> ultra-wide only",
  "lg:grid-cols-4",
  "min-[1800px]:grid-cols-4",
);

replaceAllSegment(
  "xl:grid-cols-4 -> ultra-wide only",
  "xl:grid-cols-4",
  "min-[1800px]:grid-cols-4",
);

replaceAllSegment(
  "2xl:grid-cols-4 -> ultra-wide only",
  "2xl:grid-cols-4",
  "min-[1800px]:grid-cols-4",
);

/**
 * 4) Empêcher les cartes / sous-cartes de déborder ou se compresser.
 * Ajout idempotent de min-w-0 / w-full sur les className du flux incidents.
 */
segment = segment.replace(/className="([^"]+)"/g, (match, classValue) => {
  let next = classValue;

  const shouldStabilize =
    next.includes("rounded") &&
    next.includes("border") &&
    !next.includes("V2.40-ignore");

  if (!shouldStabilize) {
    return match;
  }

  const tokens = new Set(next.split(/\s+/).filter(Boolean));

  tokens.add("min-w-0");
  tokens.add("w-full");

  next = Array.from(tokens).join(" ");

  if (next !== classValue) {
    changes += 1;
    return `className="${next}"`;
  }

  return match;
});

/**
 * 5) Texte long : URL / reason / note / record IDs.
 */
replaceAllSegment(
  "overflow wrap strong",
  "[overflow-wrap:anywhere]",
  "[overflow-wrap:anywhere] break-words",
);

replaceAllSegment(
  "duplicate break words cleanup",
  "break-words break-words",
  "break-words",
);

/**
 * 6) Anchor visible.
 */
if (!segment.includes("{/* V2.40-stream-alignment-anchor */}")) {
  segment =
    "{/* V2.40-stream-alignment-anchor */}\n" +
    segment;

  changes += 1;
  console.log("OK anchor V2.40 ajouté près de Incident Stream");
}

source = before + segment;

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.40 appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Scope : uniquement après Incident Stream.");
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
