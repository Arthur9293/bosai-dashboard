import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.41-mobile-incident-card-overflow-repair */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.41-mobile-incident-card-overflow-repair")) {
  console.log("V2.41 déjà appliqué. Aucune modification.");
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
  console.error("Incident Stream introuvable. Patch V2.41 arrêté.");
  process.exit(1);
}

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
 * V2.41 — Scope strict :
 * uniquement le flux incidents après Incident Stream.
 * Objectif : réparer le débordement mobile sans toucher desktop validé.
 */

/**
 * 1) Les éléments nowrap débordent sur mobile.
 * On autorise le wrap mobile, puis on garde nowrap à partir de sm si nécessaire.
 */
replaceAllSegment(
  "mobile nowrap repair",
  "whitespace-nowrap",
  "whitespace-normal sm:whitespace-nowrap",
);

/**
 * 2) Les rangées de badges / CTA doivent pouvoir passer à la ligne.
 */
replaceAllSegment(
  "flex gap wrap repair 2",
  "flex gap-2",
  "flex flex-wrap gap-2",
);

replaceAllSegment(
  "flex gap wrap repair 3",
  "flex gap-3",
  "flex flex-wrap gap-3",
);

replaceAllSegment(
  "flex items center gap wrap repair",
  "flex items-center gap-2",
  "flex flex-wrap items-center gap-2",
);

replaceAllSegment(
  "flex items center gap wrap repair 3",
  "flex items-center gap-3",
  "flex flex-wrap items-center gap-3",
);

replaceAllSegment(
  "inline flex badge max width",
  "inline-flex",
  "inline-flex max-w-full",
);

/**
 * 3) Les conteneurs arrondis/bordés du flux incident ne doivent jamais dépasser.
 */
segment = segment.replace(/className="([^"]+)"/g, (match, classValue) => {
  let next = classValue;

  const isCardLike =
    next.includes("rounded") &&
    next.includes("border");

  const isFlexLike =
    next.includes("flex") &&
    (next.includes("gap-") || next.includes("items-center"));

  const isGridLike =
    next.includes("grid") &&
    next.includes("gap-");

  if (!isCardLike && !isFlexLike && !isGridLike) {
    return match;
  }

  const tokens = new Set(next.split(/\s+/).filter(Boolean));

  tokens.add("min-w-0");
  tokens.add("max-w-full");

  if (isCardLike || isGridLike) {
    tokens.add("w-full");
    tokens.add("overflow-hidden");
  }

  if (isFlexLike) {
    tokens.add("flex-wrap");
  }

  next = Array.from(tokens).join(" ");

  if (next !== classValue) {
    changes += 1;
    return `className="${next}"`;
  }

  return match;
});

/**
 * 4) Texte long / URL / record IDs : rester dans la carte.
 */
replaceAllSegment(
  "overflow wrap anywhere",
  "[overflow-wrap:anywhere]",
  "[overflow-wrap:anywhere] break-words",
);

replaceAllSegment(
  "duplicate break words cleanup",
  "break-words break-words",
  "break-words",
);

/**
 * 5) Certains boutons / pills mobiles peuvent dépasser à droite.
 */
replaceAllSegment(
  "mobile button width safety",
  "w-auto",
  "w-auto max-w-full",
);

replaceAllSegment(
  "mobile full width button safety",
  "w-full",
  "w-full max-w-full",
);

/**
 * 6) Réduire légèrement la pression horizontale sur mobile uniquement.
 */
replaceAllSegment(
  "mobile px 6 repair",
  "px-6",
  "px-4 sm:px-6",
);

replaceAllSegment(
  "mobile px 5 repair",
  "px-5",
  "px-4 sm:px-5",
);

replaceAllSegment(
  "mobile p 6 repair",
  "p-6",
  "p-4 sm:p-6",
);

replaceAllSegment(
  "mobile p 5 repair",
  "p-5",
  "p-4 sm:p-5",
);

/**
 * 7) Anchor visible.
 */
if (!segment.includes("{/* V2.41-mobile-overflow-anchor */}")) {
  segment =
    "{/* V2.41-mobile-overflow-anchor */}\n" +
    segment;

  changes += 1;
  console.log("OK anchor V2.41 ajouté près de Incident Stream");
}

source = before + segment;

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.41 appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Scope : uniquement après Incident Stream.");
console.log("Objectif : réparer overflow mobile des cartes BOSAI INCIDENT.");
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
