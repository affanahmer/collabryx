const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'utils', 'glass-variants.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace TIER 1: remove blur+blue from card variant
const tier1Start = content.indexOf('/**\n   * TIER 1: Primary Glass');
const tier2Start = content.indexOf('/**\n   * TIER 1.5:');
if (tier1Start === -1) process.exit(1);

const oldCard = content.slice(tier1Start, tier2Start);

const newCard = `/**
   * TIER 1: Primary Card Surface
   * For: Post cards, Match cards, Profile cards, Dashboard widgets
   * Flat surface with subtle warmth; blur reserved for attention-plane elements only
   */
  card: "relative overflow-hidden bg-gradient-to-br from-amber-950/[0.03] to-amber-900/[0.02] border border-amber-200/10 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_0_0_rgba(255,255,255,0.04)_inset]",

  /**
   * TIER 1.5: Glass Card Inner (for GlassCard innerClassName)
`;

content = content.replace(oldCard, newCard);

// Replace TIER 2 overlay + dialog highlights: remove blur+blue
const overlayStart = content.indexOf('  overlay: "bg-blue-950/');
const overlayEnd = content.indexOf('",', overlayStart) + 2;
const oldOverlay = content.slice(overlayStart, overlayEnd);
const newOverlay = `  overlay: "bg-amber-950/[0.06] border border-amber-200/20 shadow-[0_8px_40px_0_rgba(0,0,0,0.5)]"`;
content = content.replace(oldOverlay, newOverlay);

// Remove dialog highlights (the ::before/::after blue gradients are from the generic hue)
const dhStart = content.indexOf('  dialogHighlights: `');
const dhEnd = content.indexOf('  `,', dhStart) + 3;
const oldDh = content.slice(dhStart, dhEnd);
const newDh = `  dialogHighlights: ""`;
content = content.replace(oldDh, newDh);

// Replace cardInner (just make it simpler)
const ciStart = content.indexOf('  cardInner: "relative z-10"');
if (ciStart > -1) {
  // already fine
}

// Replace hoverable: remove the blue-ambient shadow, keep lift
const hvStart = content.indexOf(`  hoverable: "transition-all duration-500`);
const hvEnd = content.indexOf('",', hvStart) + 2;
const oldHv = content.slice(hvStart, hvEnd);
const newHv = `  hoverable: "transition-all duration-300 hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] hover:-translate-y-0.5"`;
content = content.replace(oldHv, newHv);

// Replace the blue-400 border references in badge variants with amber
const badgeColors = [
  ['badge', '"bg-blue-500/10 backdrop-blur-sm border border-blue-500/20"'],
  ['badgeSuccess', '"bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-700 dark:text-green-400"'],
  ['badgeWarning', '"bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 text-yellow-700 dark:text-yellow-400"'],
  ['badgeError', '"bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-700 dark:text-red-400"'],
];
for (const [key, val] of badgeColors) {
  const keyPos = content.indexOf(`  ${key}: "${val.match(/"([^"]+)"/)[1]}"`);
  if (keyPos > -1) {
    const lineEnd = content.indexOf('\n', keyPos);
    const oldLine = content.slice(keyPos, lineEnd);
    if (key === 'badge') {
      const newLine = `  ${key}: "bg-amber-500/10 border border-amber-200/20"`;
      content = content.replace(oldLine, newLine);
    }
  }
}

// Replace blue divider references
content = content.replace(
  /divider: "border-t border-blue-400\/10 bg-gradient-to-r from-transparent via-blue-500\/\[0\.05\] to-transparent"/,
  `divider: "border-t border-amber-200/10"`
);
content = content.replace(
  /dividerVertical: "border-l border-blue-400\/10 bg-gradient-to-b from-transparent via-blue-500\/\[0\.05\] to-transparent"/,
  `dividerVertical: "border-l border-amber-200/10"`
);

// Replace skillCard variants
const scStart = content.indexOf('  skillCard: "relative overflow-hidden bg-blue-950/');
const scEnd = content.indexOf('  skillCardActive:', scStart);
const oldSc = content.slice(scStart, scEnd);
const newSc = `  skillCard: "relative overflow-hidden bg-gradient-to-br from-amber-950/[0.03] to-amber-900/[0.02] border border-amber-200/10 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]",

  /**
   * TIER 11.5: Skill Card Active/Selected
   */
  skillCardActive: "relative overflow-hidden bg-gradient-to-br from-amber-950/[0.05] to-amber-900/[0.03] border border-amber-200/20 shadow-[0_4px_16px_0_rgba(0,0,0,0.15)]",

  /**
   * TIER 11.7: Proficiency Ring Background
   */
  proficiencyRing: "bg-amber-950/[0.04] border border-amber-200/10 rounded-full",

  /**
   * TIER 11.9: Skill Card Hoverable
   */
  skillCardHoverable: "transition-all duration-300 hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] hover:-translate-y-0.5",

  /**
`;
content = content.replace(oldSc, newSc);

// Replace outerGlow
content = content.replace(
  /outerGlow: "shadow-\[0_4px_32px_0_rgba\(59,130,246,0\.06\)\]"/,
  `outerGlow: "shadow-[0_4px_16px_0_rgba(0,0,0,0.1)]"`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed glass-variants.ts');
