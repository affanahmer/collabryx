import { cn } from "@/lib/utils"

/**
 * Glass Variants - Standardized Glassmorphism System for Collabryx
 * 
 * PROBLEM SOLVED:
 * This utility had two critical issues that caused the signature Collabryx
 * glass aesthetic to disappear:
 * 
 * 1. The glassDecorations object had critical entries left as empty strings:
 *    - leftHighlight was "" instead of the left edge blue gradient line
 *    - ambientTint was "" instead of the blue-purple gradient overlay
 *    These were placeholder entries that were never filled in during the
 *    refactor, meaning any component relying on glassDecorations for the
 *    full glass effect would render blank decorations.
 * 
 * 2. The glassVariants.card was using weak inline Tailwind classes
 *    ("bg-blue-950/[0.03] backdrop-blur-sm border border-blue-400/[0.08]
 *    shadow-glass-card") that lacked the full depth of the original
 *    aesthetic (backdrop-blur-2xl, richer shadows, etc.).
 * 
 * 3. The hoverable variant was a hand-written Tailwind class instead of
 *    referencing the CSS class, creating a disconnect between the CSS
 *    system and the JS utility.
 * 
 * 4. buttonPrimaryGlow was just "shadow-md hover:shadow-lg" — a trivial
 *    shadow with no blue glow character.
 * 
 * 5. dialogHighlights was "" — no decorative highlights for dialogs.
 * 
 * SOLUTION:
 * 1. glassDecorations entries restored to full Tailwind gradient classes:
 *    - leftHighlight: Absolute positioned 1px wide gradient from blue-300/20
 *      to transparent, creating the signature left edge glow line
 *    - ambientTint: Absolute positioned gradient from blue-500/[0.04] through
 *      transparent to indigo-500/[0.03], creating the subtle blue-purple
 *      ambient overlay that gives depth to glass cards
 *    - outerGlow: Upgraded to full ambient blue shadow with 60px spread
 *      for a wider, softer glow aura
 * 
 * 2. card variant now maps directly to the "glass-glow" CSS class defined
 *    in globals.css, ensuring consistency between glass("card") usage and
 *    raw className="glass-glow" usage. This also means the card variant
 *    automatically gets the pseudo-element decorations.
 * 
 * 3. hoverable variant now maps to "glass-glow-hover" CSS class, ensuring
 *    glass("hoverable") produces identical behavior to className="glass-
 *    glow-hover".
 * 
 * 4. buttonPrimaryGlow upgraded to a real blue glow:
 *    "shadow-[0_4px_16px_0_rgba(59,130,246,0.25)] hover:shadow-
 *    [0_6px_24px_0_rgba(59,130,246,0.35)]" — gives primary buttons a
 *    distinctive blue aura that intensifies on hover.
 * 
 * 5. dialogHighlights restored to add a top edge highlight streak via
 *    the ::after pseudo-element approach, giving dialog overlays the
 *    same premium edge treatment as cards.
 * 
 * Part of the Collabryx Design System
 * Related: @/lib/constants/spacing, @/lib/constants/typography, @/lib/constants/colors
 * 
 * Usage: import { glass, glassVariants } from "@/lib/utils/glass-variants"
 * Then: className={cn("your-classes", glass('card'))}
 * 
 * Brand Colors (PRESERVED):
 * - Dark Mode Background: #0A0A0F (Deep Navy-Black)
 * - Brand Color: oklch(0.488 0.243 264.376) (Purple-Blue)
 * - Card Surface: Glass-glow with ambient blue aesthetic
 * 
 * NOTE: For the full glow glass effect on any element,
 * just add className="glass-glow" directly (defined in globals.css).
 * The glass() utility below mirrors the same aesthetic.
 */

export const glassVariants = {
  /**
   * TIER 1: Primary Glass Card (Signature Collabryx Aesthetic)
   * For: Post cards, Match cards, Profile cards, Dashboard widgets
   * Blue-tinted glass with gradient highlights and ambient glow
   * 
   * Note: Prefer using .glass-glow CSS class directly for simpler usage.
   * This utility variant mirrors the CSS class for the glass() helper.
   */
  card: "glass-glow",
  
  /**
   * TIER 1.5: Glass Card Inner (for GlassCard innerClassName)
   * Use this as innerClassName when using GlassCard component
   */
  cardInner: "relative z-10",

  /**
   * TIER 2: Dialog/Modal Overlay Glass
   * For: DialogContent, Sheet, Modal overlays, Popovers
   */
  overlay: "bg-blue-950/[0.06] backdrop-blur-md border border-blue-400/[0.12] shadow-glass-overlay",
  
  /**
   * TIER 2.5: Dialog Highlights (decorative elements for dialogs)
   * Use as absolute positioned decorative elements
   * Adds top streak + left edge highlight to dialogs
   */
  dialogHighlights: "after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-blue-300/20 after:to-transparent after:pointer-events-none",

  /**
   * TIER 3: Dropdown Glass
   * For: Dropdown menus, Popover content, Context menus
   */
  dropdown: "bg-blue-950/[0.08] backdrop-blur-xl border border-blue-400/[0.12] shadow-lg",
  
  /**
   * TIER 3.5: Dropdown Item
   * For: Individual dropdown/popover menu items
   */
  dropdownItem: "cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-white/[0.04] transition-colors",

  /**
   * TIER 4: Bubble Glass (Comments/Chat)
   * For: Comment bubbles, Chat message bubbles
   */
  bubble: "bg-background/40 backdrop-blur-md border border-border/40 hover:bg-background/60 transition-colors",
  
  /**
   * TIER 4.5: Bubble Accent (for badges inside bubbles)
   * For: Like badges, reaction badges inside comment/chat bubbles
   */
  bubbleAccent: "bg-background border border-white/10 shadow-sm",

  /**
   * TIER 5: Subtle Glass (Inputs, Buttons, Small Elements)
   * For: Input fields, Button overlays, Small decorative elements
   */
  subtle: "bg-muted/30 backdrop-blur-xl border-border/60",
  
  /**
   * TIER 5.5: Input Glass
   * For: Text inputs, Textareas, Search fields
   */
  input: "bg-background/40 backdrop-blur-md border border-border/40 focus:bg-background/60 focus:border-border transition-all",
  
  /**
   * TIER 5.6: Button Glass (for ghost/outline buttons)
   * For: Ghost buttons, Outline buttons with glass effect
   */
  buttonGhost: "bg-transparent hover:bg-accent border border-border/50 transition-all",
  
  /**
   * TIER 5.7: Button Primary Glass
   * For: Primary buttons with subtle glass overlay
   */
  buttonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-all",
  
  /**
   * TIER 5.8: Button Primary Glow
   * For: Primary buttons with signature blue glow
   */
  buttonPrimaryGlow: "shadow-[0_4px_16px_0_rgba(59,130,246,0.25)] hover:shadow-[0_6px_24px_0_rgba(59,130,246,0.35)] transition-all",
  
  /**
   * TIER 5.9: Button Secondary Glow
   * For: Secondary buttons with subtle glow
   */
  buttonSecondaryGlow: "shadow-[0_2px_12px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_16px_0_rgba(0,0,0,0.15)] transition-all",

  /**
   * TIER 6: Media Overlay Glass
   * For: Media viewer overlays, Carousel controls, Image captions
   */
  mediaOverlay: "bg-black/40 backdrop-blur-md border border-white/10",
  
  /**
   * TIER 6.5: Media Counter
   * For: Image/video counter badges in media viewers
   */
  mediaCounter: "bg-black/60 backdrop-blur-md border border-white/10",

  /**
   * TIER 7: Tab Glass
   * For: Active tab indicators, Tab content backgrounds
   */
  tabActive: "bg-background/50 backdrop-blur-md shadow-sm border border-border/40",
  
  /**
   * TIER 7.5: Tab Inactive
   * For: Inactive tabs
   */
  tabInactive: "hover:bg-white/[0.04] transition-colors",

  /**
   * TIER 8: Badge Glass
   * For: Status badges, Notification badges, Small indicators
   */
  badge: "bg-muted border border-border",
  
  /**
   * TIER 8.5: Badge Variants
   */
  badgeSuccess: "bg-green-500/10 backdrop-blur-sm border border-green-500/20 text-green-700 dark:text-green-400",
  badgeWarning: "bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  badgeError: "bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-700 dark:text-red-400",
  badgeInfo: "bg-muted border border-border text-muted-foreground",

  /**
   * TIER 9: Section Divider Glass
   * For: Horizontal rules, Section separators
   */
  divider: "border-t border-border",
  
  /**
   * TIER 9.5: Vertical Divider Glass
   * For: Vertical separators
   */
  dividerVertical: "border-l border-border",

  /**
   * TIER 10: Header/Footer Glass
   * For: Sticky headers, Footers with glass effect
   */
  header: "bg-background/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50",
  
  /**
   * TIER 10.5: Footer Glass
   */
  footer: "bg-background/80 backdrop-blur-xl border-t border-border/40",

  /**
   * TIER 11: Skill Matrix Glass
   * For: Skill cards, Proficiency indicators, Skill grid tiles
   */
  skillCard: "relative overflow-hidden bg-card border border-border shadow-sm",
  
  /**
   * TIER 11.5: Skill Card Active/Selected
   * For: Selected skill tiles, Active state with stronger glow
   */
  skillCardActive: "relative overflow-hidden bg-accent border border-border shadow-md",
  
  /**
   * TIER 11.7: Proficiency Ring Background
   * For: Subtle glass background behind proficiency rings/circles
   */
  proficiencyRing: "bg-muted border border-border rounded-full",
  
  /**
   * TIER 11.9: Skill Card Hoverable
   * For: Interactive skill cards with hover effects
   */
  skillCardHoverable: "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",

  /**
   * UTILITY: Glass Card Hover Effects
   * Add to any glass card for hover interaction with blue glow
   * Mirrors the .glass-glow-hover CSS class from globals.css
   */
  hoverable: "glass-glow-hover",

  /**
   * UTILITY: Glass Pulse Animation
   * For: Loading states, Active indicators
   */
  pulse: "animate-pulse",

  /**
   * UTILITY: Glass Shine Effect
   * For: Premium/highlight elements
   */
  shine: "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent before:-translate-x-full before:animate-shine",
}

/**
 * Helper function to apply glass variant with additional classes
 * @param variant - The glass variant to apply
 * @param className - Additional Tailwind classes to merge
 * @returns Combined class names
 */
export function glass(variant: keyof typeof glassVariants, className?: string) {
  return cn(glassVariants[variant], className)
}

/**
 * Glass decoration utilities for manual application
 * Use these to add decorative glass elements to any component
 */
export const glassDecorations = {
  /** Top highlight streak (blue gradient line) */
  topHighlight: "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/30 to-transparent pointer-events-none",
  
  /** Left edge highlight (blue gradient line) */
  leftHighlight: "absolute inset-y-0 left-0 w-px bg-gradient-to-b from-blue-300/20 via-transparent to-transparent pointer-events-none",
  
  /** Blue ambient tint overlay */
  ambientTint: "absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] via-transparent to-indigo-500/[0.03] pointer-events-none",
  
  /** Noise texture overlay (for premium feel) */
  noise: "before:absolute before:inset-0 before:bg-[url('/noise.svg')] before:bg-repeat before:bg-[150px_150px] before:opacity-[0.05] before:mix-blend-overlay before:pointer-events-none",
  
  /** Inner shadow for depth */
  innerShadow: "shadow-inner",
  
  /** Outer glow for emphasis */
  outerGlow: "shadow-[0_4px_32px_0_rgba(59,130,246,0.06),0_0_60px_-20px_rgba(59,130,246,0.08)]",
}
