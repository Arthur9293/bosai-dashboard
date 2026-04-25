import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const startMarker = "{/* V2.33-final-visual-balance */}";
const endMarker = "{/* V2.32-dedup-polish: CTA final doublon supprimé. Action conservée dans Queue Next Step Router. */}";
const v34Marker = "{/* V2.34-mobile-compact-pass */}";

if (!source.includes(startMarker)) {
  console.error("Marker V2.33 introuvable. Patch V2.34 arrêté.");
  process.exit(1);
}

if (source.includes(v34Marker)) {
  console.log("V2.34 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const startIndex = source.indexOf(startMarker);
const endIndex = source.indexOf(endMarker, startIndex);

if (endIndex === -1) {
  console.error("Marker V2.32 de fin introuvable après V2.33. Patch V2.34 arrêté.");
  process.exit(1);
}

let before = source.slice(0, startIndex);
let segment = source.slice(startIndex, endIndex);
let after = source.slice(endIndex);

function replaceInSegment(label, oldText, newText) {
  if (!segment.includes(oldText)) {
    console.log(`Non trouvé, ignoré : ${label}`);
    return;
  }

  segment = segment.replace(oldText, newText);
  console.log(`OK: ${label}`);
}

/**
 * 1) Ajouter marker V2.34 et réduire la respiration verticale du footer.
 */
replaceInSegment(
  "marker V2.34",
  startMarker,
  `${startMarker}
                            ${v34Marker}`,
);

replaceInSegment(
  "wrapper footer mobile compact",
  `mt-6 rounded-[24px] border border-sky-400/15 bg-gradient-to-br from-sky-400/[0.08] via-white/[0.035] to-emerald-400/[0.06] px-4 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.025)]`,
  `mt-5 rounded-[22px] border border-sky-400/15 bg-gradient-to-br from-sky-400/[0.08] via-white/[0.035] to-emerald-400/[0.06] px-3 py-4 shadow-[0_0_0_1px_rgba(255,255,255,0.025)] sm:px-4 sm:py-5`,
);

replaceInSegment(
  "séparateur haut compact",
  `mb-4 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent`,
  `mb-3 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent sm:mb-4`,
);

/**
 * 2) Titre plus compact sur mobile.
 */
replaceInSegment(
  "titre footer compact",
  `mt-3 max-w-[34rem] text-xl font-semibold leading-tight tracking-tight text-white`,
  `mt-2 max-w-[34rem] text-lg font-semibold leading-tight tracking-tight text-white sm:mt-3 sm:text-xl`,
);

/**
 * 3) Grille et cartes internes plus compactes.
 */
replaceInSegment(
  "grid interne compact",
  `mt-5 grid gap-4 sm:grid-cols-2`,
  `mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4`,
);

segment = segment.replaceAll(
  `rounded-[18px] border border-white/10 bg-black/25 px-4 py-4`,
  `rounded-[16px] border border-white/10 bg-black/25 px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4`,
);

segment = segment.replaceAll(
  `rounded-[18px] border border-emerald-400/15 bg-emerald-400/[0.045] px-4 py-4`,
  `rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.045] px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4`,
);

segment = segment.replaceAll(
  `rounded-[18px] border border-sky-400/10 bg-sky-400/[0.035] px-4 py-4`,
  `rounded-[16px] border border-sky-400/10 bg-sky-400/[0.035] px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-4`,
);

/**
 * 4) Espacements internes réduits sur mobile.
 */
segment = segment.replaceAll(`mt-5 rounded-[16px]`, `mt-4 rounded-[16px]`);
segment = segment.replaceAll(`mt-4 rounded-[16px]`, `mt-3 rounded-[16px]`);
segment = segment.replaceAll(`mt-4 rounded-[18px]`, `mt-3 rounded-[16px] sm:mt-4 sm:rounded-[18px]`);
segment = segment.replaceAll(`mt-5 rounded-[18px]`, `mt-4 rounded-[16px] sm:mt-5 sm:rounded-[18px]`);

segment = segment.replaceAll(
  `mt-2 text-sm font-medium leading-6 text-zinc-100`,
  `mt-2 text-sm font-medium leading-6 text-zinc-100 sm:leading-6`,
);

segment = segment.replaceAll(
  `mt-2 text-sm font-medium text-zinc-100`,
  `mt-1.5 text-sm font-medium text-zinc-100 sm:mt-2`,
);

/**
 * 5) Séparateur final plus compact.
 */
replaceInSegment(
  "séparateur final compact",
  `my-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent`,
  `my-4 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent sm:my-5`,
);

source = before + segment + after;

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.34 appliqué sur :");
console.log(filePath);
console.log("Mobile compact pass appliqué sans changement logique.");
