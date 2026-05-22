import { cn } from "@/lib/utils"

/**
 * Glass Variants - Standardized Glassmorphism System for Collabryx
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
 * - Card Surface: Flat with subtle shadow, no blur
 */

export const glassVariants = {
  /**
   * TIER 1: Primary Glass (Signature Collabryx Aesthetic)
   * For: Post cards, Match cards, Profile cards, Dashboard widgets
   */
  card: "relative overflow-hidden bg-card border border-border shadow-sm",
  
  /**
   * TIER 1.5: Glass Card Inner (for GlassCard innerClassName)
   * Use this as innerClassName when using GlassCard component
   */
  cardInner: "relative z-10",

  /**
   * TIER 2: Dialog/Modal Overlay Glass
   * For: DialogContent, Sheet, Modal overlays, Popovers
   * Matches card surface: bg-card border border-border
   */
  overlay: "bg-card/95 border border-border shadow-xl",
  
  /**
   * TIER 2.5: Dialog Highlights (decorative elements for dialogs)
   * Use as absolute positioned decorative elements
   */
  dialogHighlights: "",

  /**
   * TIER 3: Dropdown Glass
   * For: Dropdown menus, Popover content, Context menus
   */
  dropdown: "bg-card/80 backdrop-blur-xl border-border/60 shadow-lg",
  
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
  buttonPrimaryGlow: "shadow-md hover:shadow-lg transition-all",
  
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
   * Add to any glass card for hover interaction
   */
  hoverable: "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",

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
  /** Top highlight streak */
  topHighlight: "absolute inset-x-0 top-0 h-px bg-border pointer-events-none",
  
  /** Left edge highlight */
  leftHighlight: "",
  
  /** Blue ambient tint overlay */
  ambientTint: "",
  
  /** Noise texture overlay (for premium feel) */
  noise: "before:absolute before:inset-0 before:bg-[url('https://grainy-gradients.vercel.app/noise.svg')] before:bg-repeat before:bg-[150px_150px] before:opacity-[0.05] before:mix-blend-overlay before:pointer-events-none",
  
  /** Inner shadow for depth */
  innerShadow: "shadow-inner",
  
  /** Outer glow for emphasis */
  outerGlow: "shadow-md",
}
