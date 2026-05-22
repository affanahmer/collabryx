const fs = require('fs');
const path = require('path');

const gv = path.join(__dirname, '..', 'lib', 'utils', 'glass-variants.ts');
let g = fs.readFileSync(gv, 'utf-8');

// Line 75: subtle variant
g = g.replace(
  'subtle: "bg-blue-950/[0.03] backdrop-blur-xl border-white/[0.06]"',
  'subtle: "bg-muted/30 backdrop-blur-xl border-border/60"'
);

// Line 143: badgeInfo
g = g.replace(
  'badgeInfo: "bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 text-blue-700 dark:text-blue-400"',
  'badgeInfo: "bg-muted border border-border text-muted-foreground"'
);

// Lines 43-44: dialogHighlights (these are in the empty string now, but the BEFORE/AFTER pseudo-el comments remain in the old var)
// Let's check if dialogHighlights replacement actually took
if (g.includes('dialogHighlights: ""')) {
  console.log('dialogHighlights already cleaned');
} else {
  // Replace the old multiline one
  g = g.replace(
    /dialogHighlights: `[\s\S]*?`,/,
    'dialogHighlights: "",'
  );
}

// Line 227: topHighlight decoration
g = g.replace(
  'topHighlight: "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent pointer-events-none"',
  'topHighlight: "absolute inset-x-0 top-0 h-px bg-border pointer-events-none"'
);

// Line 230: leftHighlight decoration
g = g.replace(
  'leftHighlight: "absolute inset-y-0 left-0 w-px bg-gradient-to-b from-blue-300/20 via-transparent to-transparent pointer-events-none"',
  'leftHighlight: ""'
);

// Clean up dialogHighlights if it still has the old content
const dhMatch = g.match(/dialogHighlights: "(.+?)"/);
if (dhMatch && dhMatch[1].length > 5) {
  g = g.replace(/dialogHighlights: ".+?"/, 'dialogHighlights: ""');
}

fs.writeFileSync(gv, g, 'utf-8');

const remaining = (g.match(/blue-\d/g) || []).length;
console.log(`Blue references remaining: ${remaining}`);
console.log('Cleanup done.');
