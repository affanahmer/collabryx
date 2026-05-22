const fs = require('fs');
const path = require('path');

// Fix suggestions-sidebar.tsx
const sp = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'suggestions-sidebar.tsx');
let s = fs.readFileSync(sp, 'utf-8');

// 1. De-emphasize match percentage: text-2xl → text-sm + muted + no leading-none
s = s.replace(
  '<span className="text-2xl font-bold text-primary leading-none">',
  '<span className="text-sm font-semibold text-muted-foreground">'
);

// 2. Remove the AI badge "(AI)" — it's redundant with the header
s = s.replace(
  /<Badge[^>]*>[\s\S]*?✨ AI<\/Badge>/,
  ''
);

// 3. Remove Sparkles icon from Smart Matches header
s = s.replace(
  '<Sparkles className="h-4 w-4 text-primary" />',
  ''
);

// 4. Reduce the AI Context Card section — remove Sparkles icon there too
s = s.replace(
  '<Sparkles className="h-4 w-4 text-primary" />\n                        AI',
  'AI'
);

// 5. Change "See All" button — remove arrow, make it text-sm
s = s.replace(
  'See All\n                        <ArrowRight className="h-3 w-3 ml-1" />',
  'See all'
);

// 6. Strip blue tint: replace text-primary on match link with text-muted-foreground
s = s.replace(
  'className="h-8 px-3 text-sm text-muted-foreground hover:text-primary font-medium transition-colors"',
  'className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"'
);

// 7. Reduce the profile completion card prominence — remove Avatar blue tint bg
s = s.replace(
  'bg-primary/10 text-primary font-bold',
  'bg-muted text-muted-foreground font-semibold'
);

// 8. Remove Inbox icon from empty state — keep the text
s = s.replace(
  '<Inbox className="h-6 w-6 text-blue-400" />',
  ''
);

fs.writeFileSync(sp, s, 'utf-8');
console.log('Fixed suggestions-sidebar.tsx');

// Fix ai-context-card.tsx — remove Sparkles icon
const ac = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'ai-context-card.tsx');
let a = fs.readFileSync(ac, 'utf-8');

a = a.replace(
  '<Sparkles className="h-3.5 w-3.5 text-primary" />',
  ''
);

// Remove the flex gap around matching label since icon is gone
a = a.replace(
  '<span className="text-sm font-medium">Matching on:</span>',
  '<span className="text-sm font-medium text-muted-foreground">Matching on</span>'
);

fs.writeFileSync(ac, a, 'utf-8');
console.log('Fixed ai-context-card.tsx');

// Fix post-card.tsx — reduce transition, remove glass hover
const pc = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'posts', 'post-card.tsx');
let p = fs.readFileSync(pc, 'utf-8');

p = p.replace(
  '"transition-all duration-300 ease-in-out opacity-100"',
  '"transition-all duration-150 opacity-100"'
);

fs.writeFileSync(pc, p, 'utf-8');
console.log('Fixed post-card.tsx');

// Verify no blue hue edges remain in glass-variants (leftover)
const gv = path.join(__dirname, '..', 'lib', 'utils', 'glass-variants.ts');
let g = fs.readFileSync(gv, 'utf-8');

// Check for remaining blue-400 or blue-500 references
const blueMatches = g.match(/blue-\d/g);
if (blueMatches) {
  console.log(`Remaining blue-* references: ${blueMatches.length}`);
} else {
  console.log('All blue references cleared from glass-variants.ts');
}

console.log('\nStrip pass complete.');
