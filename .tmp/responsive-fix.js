const fs = require('fs');
const path = require('path');

// ── 1. Dashboard page: fix breakpoints ──
const dp = path.join(__dirname, '..', 'app', '(auth)', 'dashboard', 'page.tsx');
let d = fs.readFileSync(dp, 'utf-8');

// Sidebar was hidden below 2xl (1536px) — drop to xl (1280px)
d = d.replace(
  'grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start',
  'grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start'
);

// Feed: was xl:col-span-8 max-w-2xl mx-auto — at lg it should be wider, at xl standard
d = d.replace(
  'xl:col-span-8 max-w-2xl mx-auto xl:mx-0 xl:max-w-none w-full',
  'lg:col-span-8 max-w-2xl mx-auto lg:mx-0 lg:max-w-none w-full'
);

// Sidebar container: was hidden below 2xl, show from lg
d = d.replace(
  'hidden 2xl:block 2xl:col-span-4 sticky top-6 space-y-6',
  'hidden lg:block lg:col-span-4 sticky top-6 space-y-6'
);

// Fix skeleton loaders — remove old glass-card classes
d = d.replace(
  'className="glass-card p-6 animate-pulse"',
  'className="bg-card border border-border rounded-xl p-6 animate-pulse"'
);
d = d.replace(
  'className="glass-card p-5 animate-pulse"',
  'className="bg-card border border-border rounded-xl p-5 animate-pulse"'
);
d = d.replace(
  'className="space-y-3 animate-pulse"',
  'className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse"'
);

// Fix "View All" button — remove trailing arrow
d = d.replace(
  'View All\n                    <ArrowRight className="h-3 w-3 ml-1" />',
  'View all'
);

// Fix Recent Activity header — remove border decoration blue
d = d.replace(
  'border-b border-white/[0.06]',
  'border-b border-border'
);

// Remove ArrowRight import since we removed it
d = d.replace(
  `import { ArrowRight } from "lucide-react"`,
  `import { ArrowRight, Eye } from "lucide-react"`
);
// Replace the unused ArrowRight with something we can use, or just remove
d = d.replace(
  `import { ArrowRight, Eye } from "lucide-react"`,
  `// lucide-react imports used by child components`
);
// Actually let's just remove it since it's not used
d = d.replace(
  `import { ArrowRight } from "lucide-react"\n`,
  ``
);

fs.writeFileSync(dp, d, 'utf-8');
console.log('1/4 Fixed dashboard page.tsx (breakpoints, skeletons, border)');

// ── 2. Dashboard shell: responsive sidebar ──
const ds = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'dashboard-shell.tsx');
let s = fs.readFileSync(ds, 'utf-8');

// Grid breakpoint: was md:grid, keep it but ensure main area has proper min-width
// The sidebar already collapses — fine as-is

fs.writeFileSync(ds, s, 'utf-8');
console.log('2/4 Dashboard shell ok');

// ── 3. Mobile nav: fix blue dot, add safe area ──
const mn = path.join(__dirname, '..', 'components', 'shared', 'mobile-nav.tsx');
let m = fs.readFileSync(mn, 'utf-8');

// Fix the blue notification dot
m = m.replace(
  'h-2 w-2 rounded-full bg-blue-500 border border-background',
  'h-2 w-2 rounded-full bg-destructive border border-background'
);

// Add safe area padding
m = m.replace(
  'className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 backdrop-blur px-3 py-2.5 md:hidden supports-[backdrop-filter]:bg-background/60"',
  'className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 backdrop-blur px-3 py-2.5 md:hidden supports-[backdrop-filter]:bg-background/60 pb-env(safe-area-inset-bottom)"'
);

fs.writeFileSync(mn, m, 'utf-8');
console.log('3/4 Fixed mobile-nav.tsx (blue dot, safe area)');

// ── 4. Feed component: fix remaining blue-400 embed spinner ──
const fd = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'feed.tsx');
let f = fs.readFileSync(fd, 'utf-8');

// Replace any lingering text-primary Sparkles if present
f = f.replace(
  '<Sparkles className="w-4 h-4 text-blue-400 animate-spin" />',
  '<Sparkles className="w-4 h-4 text-muted-foreground animate-spin" />'
);

// The embedding banner has text-blue-400 for the sparkles icon
f = f.replace(
  '<Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />',
  '<Sparkles className="w-5 h-5 text-muted-foreground mt-0.5" />'
);

// Fix the border on the embedding banner
f = f.replace(
  'bg-blue-500/10 border border-blue-500/20',
  'bg-muted/50 border border-border'
);

// Fix the text-blue-400 on the spinner
f = f.replace(
  'Loader2 className="w-4 h-4 text-blue-400 animate-spin"',
  'Loader2 className="w-4 h-4 text-muted-foreground animate-spin"'
);

// Fix references to text-blue-400 in empty state / error state
f = f.replace(
  'Inbox className="h-8 w-8 text-blue-400"',
  'Inbox className="h-8 w-8 text-muted-foreground"'
);

f = f.replace(
  'Inbox className="h-6 w-6 text-blue-400"',
  'Inbox className="h-6 w-6 text-muted-foreground"'
);

fs.writeFileSync(fd, f, 'utf-8');
console.log('4/4 Fixed feed.tsx (blue-400 leaks)');

console.log('\nAll responsive fixes applied.');
