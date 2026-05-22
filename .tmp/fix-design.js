const fs = require('fs');
const path = require('path');

// 1. Fix glass-variants.ts
const gvPath = path.join(__dirname, '..', 'lib', 'utils', 'glass-variants.ts');
let gv = fs.readFileSync(gvPath, 'utf-8');

// Replace TIER 1 card (remove blur, blue -> amber warmth)
gv = gv.replace(
  'card: "relative overflow-hidden bg-blue-950/[0.05] backdrop-blur-2xl border border-blue-400/10 shadow-[0_4px_32px_0_rgba(59,130,246,0.06),0_1px_0_0_rgba(255,255,255,0.06)_inset] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/30 before:to-transparent before:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-gradient-to-b after:from-blue-300/20 after:via-transparent after:to-transparent after:pointer-events-none"',
  'card: "relative overflow-hidden bg-card border border-border shadow-sm"'
);

// Replace overlay (remove blur)
gv = gv.replace(
  'overlay: "bg-blue-950/[0.05] backdrop-blur-2xl border-blue-500/20 shadow-[0_8px_40px_0_rgba(0,0,0,0.5),0_0_60px_-20px_rgba(59,130,246,0.1)]"',
  'overlay: "bg-card/95 border border-border shadow-xl"'
);

// Replace dialogHighlights (remove blue gradients)
gv = gv.replace(
  '  dialogHighlights: `\n    before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/30 before:to-transparent before:pointer-events-none before:z-0\n    after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-gradient-to-b after:from-blue-300/20 after:via-transparent after:to-transparent after:pointer-events-none after:z-0\n  `',
  '  dialogHighlights: ""'
);

// Replace hoverable (remove blue shadow, shorten duration)
gv = gv.replace(
  'hoverable: "transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(59,130,246,0.12),0_1px_0_0_rgba(255,255,255,0.08)_inset] hover:-translate-y-1"',
  'hoverable: "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"'
);

// Replace badge (remove blue)
gv = gv.replace(
  'badge: "bg-blue-500/10 backdrop-blur-sm border border-blue-500/20"',
  'badge: "bg-muted border border-border"'
);

// Replace skillCard block
gv = gv.replace(
  'skillCard: "relative overflow-hidden bg-blue-950/[0.04] backdrop-blur-xl border border-blue-400/10 shadow-[0_4px_24px_0_rgba(59,130,246,0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/30 before:to-transparent before:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-gradient-to-b after:from-blue-300/20 after:via-transparent after:to-transparent after:pointer-events-none"',
  'skillCard: "relative overflow-hidden bg-card border border-border shadow-sm"'
);

gv = gv.replace(
  'skillCardActive: "relative overflow-hidden bg-blue-950/[0.04] backdrop-blur-xl border border-blue-400/30 shadow-[0_8px_40px_0_rgba(59,130,246,0.15)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-300/30 before:to-transparent before:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-gradient-to-b after:from-blue-300/20 after:via-transparent after:to-transparent after:pointer-events-none"',
  'skillCardActive: "relative overflow-hidden bg-accent border border-border shadow-md"'
);

gv = gv.replace(
  'proficiencyRing: "bg-blue-950/[0.06] backdrop-blur-xl border border-blue-400/15 rounded-full"',
  'proficiencyRing: "bg-muted border border-border rounded-full"'
);

gv = gv.replace(
  'skillCardHoverable: "transition-all duration-500 hover:shadow-[0_8px_40px_0_rgba(59,130,246,0.12)] hover:-translate-y-1"',
  'skillCardHoverable: "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"'
);

// Replace dividers
gv = gv.replace(
  'divider: "border-t border-blue-400/10 bg-gradient-to-r from-transparent via-blue-500/[0.05] to-transparent"',
  'divider: "border-t border-border"'
);
gv = gv.replace(
  'dividerVertical: "border-l border-blue-400/10 bg-gradient-to-b from-transparent via-blue-500/[0.05] to-transparent"',
  'dividerVertical: "border-l border-border"'
);

// Replace outerGlow
gv = gv.replace(
  'outerGlow: "shadow-[0_4px_32px_0_rgba(59,130,246,0.06)]"',
  'outerGlow: "shadow-md"'
);

// Replace buttonGhost
gv = gv.replace(
  'buttonGhost: "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"',
  'buttonGhost: "bg-transparent hover:bg-accent border border-border/50 transition-all"'
);

// Replace buttonPrimary
gv = gv.replace(
  'buttonPrimary: "bg-primary shadow-[0_4px_32px_0_rgba(59,130,246,0.06)] hover:shadow-[0_8px_40px_0_rgba(59,130,246,0.12)] transition-all"',
  'buttonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-all"'
);

// Replace buttonPrimaryGlow
gv = gv.replace(
  'buttonPrimaryGlow: "shadow-[0_4px_20px_0_rgba(59,130,246,0.3)] hover:shadow-[0_6px_28px_0_rgba(59,130,246,0.4)] transition-all"',
  'buttonPrimaryGlow: "shadow-md hover:shadow-lg transition-all"'
);

// Replace noise texture
gv = gv.replace(
  'noise: "before:absolute before:inset-0 before:bg-[url(https://grainy-gradients.vercel.app/noise.svg)] before:bg-repeat before:bg-[150px_150px] before:opacity-[0.05] before:mix-blend-overlay before:pointer-events-none"',
  'noise: ""'
);

// Replace ambientTint
gv = gv.replace(
  'ambientTint: "absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-indigo-500/[0.03] pointer-events-none"',
  'ambientTint: ""'
);

// Replace innerShadow blue references
gv = gv.replace(
  'innerShadow: "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"',
  'innerShadow: "shadow-inner"'
);

fs.writeFileSync(gvPath, gv, 'utf-8');
console.log('1/3 Fixed glass-variants.ts');

// 2. Fix feed.tsx
const feedPath = path.join(__dirname, '..', 'components', 'features', 'dashboard', 'feed.tsx');
let feed = fs.readFileSync(feedPath, 'utf-8');

// Remove the purple border/background from AI Mentor icon
feed = feed.replace(
  'className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center shrink-0 border border-purple-500/20"',
  'className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center shrink-0"'
);

// Reduce transition durations on post cards
feed = feed.replace(
  'transition-all duration-300 ease-in-out opacity-100',
  'transition-all duration-200 opacity-100'
);

fs.writeFileSync(feedPath, feed, 'utf-8');
console.log('2/3 Fixed feed.tsx');

// 3. Fix notification-dropdown.tsx
const notifPath = path.join(__dirname, '..', 'components', 'shared', 'notification-dropdown.tsx');
let notif = fs.readFileSync(notifPath, 'utf-8');

// Remove border-l accent rail on unread
notif = notif.replace(
  '!notification.is_read && "bg-muted/50 border-l-4 border-l-primary"',
  '!notification.is_read && "bg-muted/50"'
);

fs.writeFileSync(notifPath, notif, 'utf-8');
console.log('3/3 Fixed notification-dropdown.tsx');

console.log('\nAll design fixes applied.');
