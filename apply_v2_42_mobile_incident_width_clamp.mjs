import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.42-mobile-incident-width-clamp */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.42-mobile-incident-width-clamp")) {
  console.log("V2.42 déjà appliqué. Aucune modification.");
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
  console.error("Incident Stream introuvable. Patch V2.42 arrêté.");
  process.exit(1);
}

const before = source.slice(0, streamIndex);
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
 * V2.42 — Scope strict :
 * uniquement après Incident Stream.
 *
 * Objectif :
 * - supprimer les largeurs fixes / min-width qui provoquent le débordement mobile
 * - forcer les badges à wrap
 * - garder desktop acceptable
 * - ne toucher à aucune logique
 */

/**
 * 1) Nettoyer les min-width / width fixes dans le flux incidents.
 * Cause probable du bug : une sous-carte garde une largeur minimale supérieure au viewport.
 */
segment = segment.replace(/className="([^"]+)"/g, (match, classValue) => {
  let next = classValue;

  const isIncidentArea =
    next.includes("rounded") ||
    next.includes("border") ||
    next.includes("grid") ||
    next.includes("flex") ||
    next.includes("inline-flex");

  if (!isIncidentArea) return match;

  const original = next;

  next = next
    .replace(/\bmin-w-\[[^\]]+\]/g, "min-w-0")
    .replace(/\bw-\[[^\]]+\]/g, "w-full")
    .replace(/\bmax-w-none\b/g, "max-w-full")
    .replace(/\bmax-w-\[[^\]]+\]/g, "max-w-full");

  const tokens = new Set(next.split(/\s+/).filter(Boolean));

  tokens.add("min-w-0");
  tokens.add("max-w-full");

  if (next.includes("rounded") || next.includes("border") || next.includes("grid")) {
    tokens.add("w-full");
    tokens.add("overflow-hidden");
  }

  if (next.includes("flex") || next.includes("inline-flex")) {
    tokens.add("flex-wrap");
  }

  next = Array.from(tokens).join(" ");

  if (next !== original) {
    changes += 1;
    return `className="${next}"`;
  }

  return match;
});

/**
 * 2) Badges / CTA : forcer un vrai wrap mobile.
 */
replaceAllSegment(
  "inline-flex mobile wrap",
  "inline-flex max-w-full",
  "inline-flex max-w-full min-w-0 whitespace-normal break-words",
);

replaceAllSegment(
  "nowrap mobile hard repair",
  "whitespace-nowrap",
  "whitespace-normal sm:whitespace-nowrap",
);

replaceAllSegment(
  "flex row wrap hard repair",
  "flex flex-wrap",
  "flex flex-wrap min-w-0 max-w-full",
);

/**
 * 3) Les rangées de badges doivent utiliser toute la largeur disponible sans pousser la carte.
 */
replaceAllSegment(
  "items center row clamp",
  "items-center gap-2",
  "items-center gap-2 min-w-0 max-w-full",
);

replaceAllSegment(
  "items center row clamp 3",
  "items-center gap-3",
  "items-center gap-3 min-w-0 max-w-full",
);

/**
 * 4) Réduire légèrement les paddings mobiles uniquement dans Incident Stream.
 */
replaceAllSegment(
  "mobile px clamp 4 sm6",
  "px-4 sm:px-6",
  "px-3.5 sm:px-6",
);

replaceAllSegment(
  "mobile p clamp 4 sm6",
  "p-4 sm:p-6",
  "p-3.5 sm:p-6",
);

replaceAllSegment(
  "mobile px clamp 4 sm5",
  "px-4 sm:px-5",
  "px-3.5 sm:px-5",
);

replaceAllSegment(
  "mobile p clamp 4 sm5",
  "p-4 sm:p-5",
  "p-3.5 sm:p-5",
);

/**
 * 5) Texte long : URL, record IDs, tags.
 */
replaceAllSegment(
  "overflow wrap duplicate cleanup",
  "[overflow-wrap:anywhere] break-words",
  "[overflow-wrap:anywhere] break-words min-w-0 max-w-full",
);

replaceAllSegment(
  "duplicate break words cleanup",
  "break-words break-words",
  "break-words",
);

/**
 * 6) Anchor visible.
 */
if (!segment.includes("{/* V2.42-mobile-width-clamp-anchor */}")) {
  segment =
    "{/* V2.42-mobile-width-clamp-anchor */}\n" +
    segment;

  changes += 1;
  console.log("OK anchor V2.42 ajouté près de Incident Stream");
}

source = before + segment;

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.42 appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Scope : uniquement après Incident Stream.");
console.log("Objectif : clamp mobile strict des cartes BOSAI INCIDENT.");
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
