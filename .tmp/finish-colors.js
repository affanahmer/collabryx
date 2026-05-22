const fs = require("fs");

// ── 1. feed.tsx — clean all blue/purple inline colors ──
let f = fs.readFileSync("components/features/dashboard/feed.tsx", "utf-8");

// Fix the embedding banner: removes the blue accent
f = f.replace(
  `<GlassCard innerClassName="p-4 bg-blue-500/10 border border-blue-500/20">`,
  `<GlassCard innerClassName="p-4">`
);

f = f.replace(
  `<Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />`,
  `<Sparkles className="w-5 h-5 text-muted-foreground mt-0.5" />`
);

f = f.replace(
  `<Loader2 className="w-4 h-4 text-blue-400 animate-spin" />`,
  `<Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />`
);

// AI Mentor card: purple-500/10 bg -> neutral
f = f.replace(
  `<div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0 border border-purple-500/20">`,
  `<div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center shrink-0">`
);

f = f.replace(
  `<Bot className="h-5 w-5 text-purple-400" />`,
  `<Bot className="h-5 w-5 text-muted-foreground" />`
);

// Error state: red icon area blue -> muted
f = f.replace(
  `<div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">`,
  `<div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">`
);

f = f.replace(
  `<Inbox className="h-8 w-8 text-blue-400" />`,
  `<Inbox className="h-8 w-8 text-muted-foreground" />`
);

fs.writeFileSync("components/features/dashboard/feed.tsx", f);
console.log("1/3 Cleaned feed.tsx — 7 color leaks fixed");

// ── 2. suggestions-sidebar.tsx — clean blue/amber ──
let s = fs.readFileSync("components/features/dashboard/suggestions-sidebar.tsx", "utf-8");

// Empty state blue background + icon
s = s.replace(
  `className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3"`,
  `className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3"`
);

s = s.replace(
  `<Inbox className="h-6 w-6 text-blue-400" />`,
  `<Inbox className="h-6 w-6 text-muted-foreground" />`
);

// Amber "Incomplete" label -> muted
s = s.replace(
  `<span className="text-sm font-bold text-amber-500">Incomplete</span>`,
  `<span className="text-sm font-bold text-muted-foreground">Incomplete</span>`
);

fs.writeFileSync("components/features/dashboard/suggestions-sidebar.tsx", s);
console.log("2/3 Cleaned suggestions-sidebar.tsx — 3 color leaks fixed");

// ── 3. notification-dropdown.tsx — clean blue/purple/amber icon colors ──
let n = fs.readFileSync("components/shared/notification-dropdown.tsx", "utf-8");

// Replace hardcoded notification type colors with theme tokens
n = n.replace(
  `connect: 'text-blue-500 dark:text-blue-400',`,
  `connect: 'text-primary',`
);

n = n.replace(
  `comment: 'text-purple-500 dark:text-purple-400',`,
  `comment: 'text-muted-foreground',`
);

n = n.replace(
  `match: 'text-amber-500 dark:text-amber-400',`,
  `match: 'text-muted-foreground',`
);

fs.writeFileSync("components/shared/notification-dropdown.tsx", n);
console.log("3/3 Cleaned notification-dropdown.tsx — 3 color leaks fixed");

console.log("\nAll remaining color leaks cleaned.");
