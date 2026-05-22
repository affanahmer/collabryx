# Smell Report: Collabryx Dashboard (Feed + Sidebar + Notifications)

**Score: 3/10 — IDENTITY FAILURE**

---

## Heuristics

| Odor | Score (1=absent, 0=detected) |
|---|---|
| Tech gradient | 1 |
| Generic tech hue | 0 |
| Feature tile grid | 0 |
| Accent rail | 0 |
| Unearned blur | 0 |
| Stat monument | 0 |
| Icon topper | 0 |
| Bounce everywhere | 0 |
| Default type | 1 |
| Center stack | 1 |
| **Total** | **3/10** |

---

## Dominant Smell: Unearned Blur (glass overload)

**Pattern:** The entire UI is wrapped in glassmorphism. `glass-variants.ts` defines **20+ tiers** of blur effects — card, overlay, dropdown, bubble, subtle, input, button ghost, button primary, button glow, badge, divider, header, footer, skill card, proficiency ring, pulse, shine, etc. Every component uses `backdrop-blur-2xl`, blue-tinted borders, top highlight streaks, left edge highlights, and ambient blue gradients.

**Reflex:** Glassmorphism was chosen as a blanket visual system, not as a deliberate accent. The question "does this surface need blur to communicate its role?" was never asked. Post cards, suggestion cards, context banners, buttons, badges, and dividers all get the same frosted treatment.

**Why it weakens this brief:** Collabryx is a collaboration platform — the job is to compare profiles, monitor activity, and connect. Blur does not help any of those jobs. It adds visual weight to every surface equally, erasing hierarchy. The user cannot tell which element deserves their attention because everything is equally "special."

**Fix:** relayout — remove glass from background surfaces and generic cards. Reserve blur for attention-plane elements only (modals, overlays, hover states). Use flat surfaces for content cards and let the content itself create hierarchy.

---

## Smell 2: Generic Tech Hue (blue-purple default)

**Pattern:** Brand color is described as `oklch(0.488 0.243 264.376)` — a purple-blue. Every accent in the UI follows: `blue-400/10` borders, `blue-950/[0.05]` backgrounds, `blue-300/30` highlights, `blue-500/10` badges, `blue-400` spinner. The entire color system is a single blue family.

**Reflex:** Blue-purple is the default "tech collaboration platform" hue. It signals nothing specific about Collabryx — it could be any SaaS, any startup, any developer tool.

**Why it weakens this brief:** A collaboration platform connecting founders and teammates needs warmth, trust, and energy. Blue-purple communicates "safe and corporate." The color doesn't help users feel the excitement of finding a co-founder or the energy of launching a project.

**Fix:** recolor — introduce a warmer accent tier. Keep blue as a secondary/supporting role if needed, but let a warmer or more saturated hue carry the primary identity work.

---

## Smell 3: Feature Tile Grid (equal-card disease)

**Pattern:** The feed renders all posts as identical `PostCard` components in a vertical stack. Each card occupies the same visual weight — same padding, same glass treatment, same header structure. The suggestions sidebar has three equal match cards.

**Reflex:** When every item is equally important, nothing is prioritized. The layout comes from the loop (`.map()`) rather than from editorial judgment about what matters.

**Why it weakens this brief:** A feed should direct attention to high-value content. Pinned posts, posts from connected users, posts with high engagement — these should look different from less relevant content. The current feed has `sortPostsByPriority()` but the visual treatment is identical for all.

**Fix:** relayout — vary post card importance visually. Pinned posts get a stronger treatment. High-match posts get more presence.

---

## Smell 4: Stat Monument (oversized match percentage)

**Pattern:** Match cards display `{match.matchPercentage}%` in `text-2xl font-bold text-primary` — an oversized number that dominates the card. The actual content (who the person is, their role, why they match) takes secondary visual weight below the number.

**Reflex:** The number is treated as the primary evidence because it's easy to compute and display. But a match percentage alone is not the evidence the user needs — it's a confidence score, not a reason.

**Fix:** relayout — de-emphasize the percentage. Use a smaller badge or thin progress bar. Let the person's name, shared skills, and common interests carry the visual weight. Reserve large numbers for when the evidence behind them is visible.

---

## Smell 5: Icon Topper (Sparkles on everything)

**Pattern:** The `Sparkles` icon appears on:
- AI Context Card (header)
- Smart Matches section header
- Embedding status banner

`Bot` icon on AI mentor card. `Inbox` on empty states. Every section heading is topped with a rounded icon.

**Reflex:** Icons are being used to "decorate" section headers — a common template pattern. Each icon is the first thing the user sees, but they carry no information the heading doesn't already convey.

**Fix:** refine — remove decorative icons from section headers. Keep icons only when they communicate a functional state (bell for notifications, trash for delete, user-plus for connect).

---

## Smell 6: Accent Rail (unread state as border)

**Pattern:** Unread notifications get `border-l-4 border-l-primary` — a colored stripe on the left edge. This is a classic accent rail that pretends to be a structural decision.

**Reflex:** The left border adds no information beyond what the unread dot already communicates. It's decoration dressed as organization.

**Fix:** refine — remove the accent rail. The unread dot + background tint is sufficient. Or use the border-l only when the dot is absent.

---

## Smell 7: Bounce Everywhere (500ms transitions)

**Pattern:** Glass cards have `transition-all duration-500 ease-in-out` and `hover:shadow-[...] hover:-translate-y-1`. The hover lift + 500ms transition is applied globally — every card, every skill tile, every interactive element.

**Reflex:** The long transition + lift was chosen because it looks polished in isolation, but applied universally it creates a sluggish feel. The user has to wait through 500ms animations just to scroll past cards.

**Fix:** motion — use 200-300ms for hover states on content cards. Reserve 400-500ms for entrance animations and modals only.

---

## Summary

| # | Smell | Severity | Tool |
|---|---|---|---|
| 1 | Unearned blur (glass overload) | 🔴 High | relayout |
| 2 | Generic tech hue (blue-purple) | 🔴 High | recolor |
| 3 | Feature tile grid (equal cards) | 🟡 Medium | relayout |
| 4 | Stat monument (match %) | 🟡 Medium | relayout |
| 5 | Icon topper (Sparkles spam) | 🟢 Low | refine |
| 6 | Accent rail (border-l unread) | 🟢 Low | refine |
| 7 | Bounce everywhere (500ms) | 🟢 Low | motion |
