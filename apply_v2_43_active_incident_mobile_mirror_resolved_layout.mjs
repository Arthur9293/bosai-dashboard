import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.43-active-incident-mobile-mirror-resolved-layout */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.43-active-incident-mobile-mirror-resolved-layout")) {
  console.log("V2.43 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const dynamicAnchor = `export const dynamic = "force-dynamic";`;

if (source.includes(dynamicAnchor)) {
  source = source.replace(dynamicAnchor, `${dynamicAnchor}\n\n${markerAsTsComment}`);
} else {
  source = `${markerAsTsComment}\n${source}`;
}

const incidentStreamIndex = source.indexOf("Incident Stream");

if (incidentStreamIndex === -1) {
  console.error("Incident Stream introuvable. Patch V2.43 arrêté.");
  process.exit(1);
}

const resolvedCandidates = [
  "Resolved incidents",
  "Resolved Incidents",
  "RESOLVED INCIDENTS",
];

let resolvedIndex = -1;

for (const candidate of resolvedCandidates) {
  const index = source.indexOf(candidate, incidentStreamIndex + 1);
  if (index !== -1) {
    resolvedIndex = index;
    break;
  }
}

if (resolvedIndex === -1) {
  console.error("Section Resolved incidents introuvable. Patch V2.43 arrêté pour éviter de toucher trop large.");
  process.exit(1);
}

const before = source.slice(0, incidentStreamIndex);
let activeSegment = source.slice(incidentStreamIndex, resolvedIndex);
const resolvedAndAfter = source.slice(resolvedIndex);

let changes = 0;

function replaceAllActive(label, oldText, newText) {
  const count = activeSegment.split(oldText).length - 1;

  if (count > 0) {
    activeSegment = activeSegment.replaceAll(oldText, newText);
    changes += count;
    console.log(`OK ${label}: ${count}`);
  } else {
    console.log(`Ignoré ${label}: introuvable`);
  }
}

/**
 * V2.43
 * Scope strict :
 * - uniquement Incident Stream
 * - avant Resolved incidents
 *
 * But :
 * - les cartes actives BOSAI INCIDENT doivent se comporter comme les cartes resolved sur mobile
 * - aucune logique métier modifiée
 * - aucun lien modifié
 * - aucun compteur modifié
 */

/**
 * 1) Forcer le comportement mobile resolved-like :
 * une seule colonne mobile, pas de largeur fixe, pas de débordement.
 */
activeSegment = activeSegment.replace(/className="([^"]+)"/g, (match, classValue) => {
  const original = classValue;

  let tokens = classValue.split(/\s+/).filter(Boolean);

  const has = (pattern) => tokens.some((token) => pattern.test(token));

  const isRounded = has(/^rounded/) || has(/^sm:rounded/) || has(/^md:rounded/) || has(/^lg:rounded/);
  const isBorder = has(/^border/) || has(/^border-/) || has(/^sm:border/) || has(/^md:border/);
  const isGrid = tokens.includes("grid") || has(/:grid$/);
  const isFlex = tokens.includes("flex") || tokens.includes("inline-flex") || has(/:flex$/);
  const isInlineFlex = tokens.includes("inline-flex");
  const isCardLike = isRounded && isBorder;

  const shouldNormalize =
    isCardLike ||
    isGrid ||
    isFlex ||
    original.includes("BOSAI") ||
    original.includes("gap-");

  if (!shouldNormalize) {
    return match;
  }

  /**
   * Supprimer les causes classiques d'overflow mobile.
   */
  tokens = tokens.filter((token) => {
    if (/^min-w-\[[^\]]+\]$/.test(token)) return false;
    if (/^w-\[[^\]]+\]$/.test(token)) return false;
    if (/^max-w-\[[^\]]+\]$/.test(token)) return false;
    if (token === "max-w-none") return false;
    if (token === "overflow-hidden") return false;
    if (token === "whitespace-nowrap") return false;
    if (token === "sm:whitespace-nowrap") return false;
    if (token === "md:whitespace-nowrap") return false;
    return true;
  });

  const set = new Set(tokens);

  /**
   * Base mobile : même logique que resolved.
   */
  set.add("min-w-0");
  set.add("max-w-full");
  set.add("box-border");

  if (isCardLike || isGrid) {
    set.add("w-full");
  }

  if (isCardLike) {
    set.add("overflow-visible");
  }

  if (isGrid) {
    set.add("grid-cols-1");
  }

  if (isFlex) {
    set.add("flex-wrap");
    set.add("min-w-0");
    set.add("max-w-full");
  }

  if (isInlineFlex) {
    set.add("max-w-full");
    set.add("whitespace-normal");
    set.add("break-words");
  }

  const next = Array.from(set).join(" ");

  if (next !== original) {
    changes += 1;
    return `className="${next}"`;
  }

  return match;
});

/**
 * 2) Les anciennes grilles actives doivent rester 1 colonne sur mobile.
 * On repousse les colonnes au très grand écran seulement.
 */
activeSegment = activeSegment.replace(
  /\b(?:sm|md|lg|xl|2xl):grid-cols-([2-6])\b/g,
  (match, cols) => {
    changes += 1;
    return `min-[1800px]:grid-cols-${cols}`;
  },
);

activeSegment = activeSegment.replace(
  /\bgrid-cols-([2-6])\b/g,
  (match, cols) => {
    changes += 1;
    return `grid-cols-1 min-[1800px]:grid-cols-${cols}`;
  },
);

/**
 * 3) Badges actifs : DO NOW / OPEN COMMAND / ACTION READY doivent rester dans la carte.
 */
replaceAllActive(
  "badge inline-flex clamp",
  "inline-flex",
  "inline-flex max-w-full min-w-0 whitespace-normal break-words",
);

replaceAllActive(
  "nowrap hard mobile cleanup",
  "whitespace-nowrap",
  "whitespace-normal",
);

replaceAllActive(
  "sm nowrap hard mobile cleanup",
  "sm:whitespace-nowrap",
  "whitespace-normal",
);

replaceAllActive(
  "flex row wrap",
  "flex items-center gap-2",
  "flex flex-wrap items-center gap-2 min-w-0 max-w-full",
);

replaceAllActive(
  "flex row wrap 3",
  "flex items-center gap-3",
  "flex flex-wrap items-center gap-3 min-w-0 max-w-full",
);

replaceAllActive(
  "flex gap wrap 2",
  "flex gap-2",
  "flex flex-wrap gap-2 min-w-0 max-w-full",
);

replaceAllActive(
  "flex gap wrap 3",
  "flex gap-3",
  "flex flex-wrap gap-3 min-w-0 max-w-full",
);

/**
 * 4) Mobile padding proche du rendu resolved.
 * Plus de sécurité horizontale sur iPhone.
 */
replaceAllActive(
  "mobile card p-6 -> p-4",
  "p-6",
  "p-4 sm:p-6",
);

replaceAllActive(
  "mobile card p-5 -> p-4",
  "p-5",
  "p-4 sm:p-5",
);

replaceAllActive(
  "mobile card px-6 -> px-4",
  "px-6",
  "px-4 sm:px-6",
);

replaceAllActive(
  "mobile card px-5 -> px-4",
  "px-5",
  "px-4 sm:px-5",
);

/**
 * 5) Textes longs : URL / IDs / reason / note.
 */
replaceAllActive(
  "overflow wrap anywhere",
  "[overflow-wrap:anywhere]",
  "[overflow-wrap:anywhere] break-words min-w-0 max-w-full",
);

replaceAllActive(
  "duplicate break words cleanup",
  "break-words break-words",
  "break-words",
);

replaceAllActive(
  "duplicate min-w cleanup",
  "min-w-0 min-w-0",
  "min-w-0",
);

replaceAllActive(
  "duplicate max-w cleanup",
  "max-w-full max-w-full",
  "max-w-full",
);

replaceAllActive(
  "duplicate flex-wrap cleanup",
  "flex-wrap flex-wrap",
  "flex-wrap",
);

/**
 * 6) Anchor visible.
 */
if (!activeSegment.includes("{/* V2.43-active-mobile-mirror-anchor */}")) {
  activeSegment =
    "{/* V2.43-active-mobile-mirror-anchor */}\n" +
    activeSegment;

  changes += 1;
  console.log("OK anchor V2.43 ajouté près de Incident Stream");
}

source = before + activeSegment + resolvedAndAfter;

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.43 appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Scope : Incident Stream uniquement, avant Resolved incidents.");
console.log("Objectif : miroir mobile du rendu Resolved incidents sur les cartes actives BOSAI INCIDENT.");
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
