# Onboarding Frontend — UX Robustness & Edge Case Fixes

## Scope
17 fixes across 7 files, targeting broken interactions, accessibility violations, schema alignment, and visual polish. No new packages, no config changes.

---

## Fix 1 — `InlineSearchableCombobox`: Dropdown Positioning (CRITICAL)

**Problem:** The results dropdown uses `absolute top-full left-0` but no consumer enforces `position: relative` on the parent. The dropdown anchors to the nearest positioned ancestor (e.g., `<body>`), rendering results in the wrong place.

**File:** `components/features/onboarding/step-interests-goals.tsx`
- Line 66: Goals `<div className="space-y-4">` → needs `relative`
- Line 104: Interests `<div className="space-y-4 pt-6 ...">` → needs `relative`

**File:** `components/features/onboarding/step-experience.tsx`
- Line 96: Job title `<div className="grid gap-2">` → needs `relative`

**Fix:** Add `relative` to each parent container wrapping `InlineSearchableCombobox`:
```tsx
// step-interests-goals.tsx line 66
<div className="space-y-4 relative" aria-labelledby="step-heading">

// step-interests-goals.tsx line 104
<div className="space-y-4 pt-6 border-t border-border/20 relative">

// step-experience.tsx line 96
<div className="grid gap-2 relative">
```

---

## Fix 2 — `InlineSearchableCombobox`: Duplicate HTML IDs (ACCESSIBILITY)

**Problem:** `id="combobox-dropdown"` and `id="combobox-label"` are hardcoded. Two instances on `step-interests-goals` create duplicate IDs (WCAG 4.1.1 failure). `aria-controls` and `aria-labelledby` point to wrong elements in screen readers.

**File:** `components/ui/inline-searchable-combobox.tsx`

**Fix:** Use `React.useId()` for unique IDs per instance:
```tsx
export function InlineSearchableCombobox({...}) {
  const instanceId = React.useId()
  const dropdownId = `${instanceId}-dropdown`
  const labelId = `${instanceId}-label`
  // ...
```
Then replace all 4 hardcoded occurrences:
- `id="combobox-dropdown"` → `id={dropdownId}`
- `id="combobox-label"` → `id={labelId}`  
- `aria-labelledby="combobox-label"` → `aria-labelledby={labelId}`
- `aria-controls="combobox-dropdown"` → `aria-controls={dropdownId}`

---

## Fix 3 — Client/Server Zod Schema Alignment (DATA INTEGRITY)

**Problem:** `page.tsx` client schemas differ from `lib/validations/onboarding.ts` server schemas:
- `fullName`: client rejects hyphens/apostrophes (`/^[A-Za-z\s]+$/`), server allows them (`/^[a-zA-Z\s'-]+$/`). Users with names like "O'Brien" get blocked.
- `headline`: client max 100 with restrictive regex, server max 200 unrestricted

**File:** `app/(auth)/onboarding/page.tsx`

**Fix:** Align client schemas to match server (server = source of truth):
```tsx
// basicInfoSchema — replace fullName regex
regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")

// basicInfoSchema — replace headline (remove regex, extend max)
headline: z.string()
  .min(5, "Headline must be at least 5 characters.")
  .max(200, "Headline must be less than 200 characters."),
```

Also update `step-basic-info.tsx` inline validations to match:
- Line 83: fullName pattern → `/^[a-zA-Z\s'-]+$/` with updated message
- Line 159: headline validate → remove `noSpecialChars` validation or soften to match

---

## Fix 4 — `InlineSearchableCombobox`: Escape Key Handler (KEYBOARD)

**Problem:** No Escape key handler. When the dropdown is open and user presses Escape, nothing happens. `handleKeyDown` only handles Enter.

**File:** `components/ui/inline-searchable-combobox.tsx`, function `handleKeyDown`

**Fix:** Add Escape handling before the Enter check:
```tsx
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === "Escape") {
    e.preventDefault()
    setSearch("")
    inputRef.current?.blur()
    return
  }
  if (e.key === "Enter") {
    // ...existing Enter logic
  }
}
```

---

## Fix 5 — Company Field Validation Mismatch (FALSE ERROR)

**Problem:** `step-experience.tsx` registers company with `required: "Company name is required"` but Zod schema only requires `title || company` via `.refine()`. Adding title alone triggers a false red border on company.

**File:** `components/features/onboarding/step-experience.tsx`, lines 99-109

**Fix:** Remove `required` from company register, keep minLength only:
```tsx
{...register(`experiences.${index}.company`, {
  minLength: { value: 2, message: "Company name must be at least 2 characters" },
  maxLength: { value: 100, message: "Company name must be less than 100 characters" }
})}
```

Also surface the Zod `.refine()` error per card. Add below the `<GlassCard>` wrapper, after the fields section:
```tsx
{getExperienceError(index)?.refine && (
  <p className="text-xs text-destructive font-medium mt-2" role="alert">
    {getExperienceError(index)!.refine!.message as string}
  </p>
)}
```
Wait — `errors.experiences[index]` needs type narrowing. The refine error lives on the array item itself. Check if RHF surfaces it via the `root` property. If not, add manual validation:
```tsx
{!getExperienceError(index)?.title && !getExperienceError(index)?.company &&
  !watch(`experiences.${index}.title`) && !watch(`experiences.${index}.company`) &&
  expFields.length > 0 && (
  <p className="text-xs text-destructive font-medium mt-2">
    At least job title or company is required
  </p>
)}
```
Simpler: remove the required on company, and trust Zod refine at submission. The form mode is `onBlur` so refine errors won't show inline anyway — it's a submit-time validation.

---

## Fix 6 — Layout Shift on First Selection (CLS)

**Problem:** Both comboboxes conditionally render the badge container with `{selected.length > 0 && (...)`. First selection causes a layout jump as the badge area appears.

**Files:** 
- `components/ui/inline-searchable-combobox.tsx`, line 131
- `components/ui/searchable-combobox.tsx`, line 139

**Fix:** Always render the badge container, but hide it visually when empty using `invisible` to preserve layout space:
```tsx
<div 
  className={cn(
    "flex flex-wrap gap-2 min-h-[48px] p-2 rounded-lg",
    glass("subtle"),
    selected.length === 0 && "invisible"  // preserve space, hide visually
  )}
  role="list"
  aria-label="Selected options"
>
  {selectedOptions.map(...)}
</div>
```
Apply same pattern to `searchable-combobox.tsx` badge container (line 139).

---

## Fix 7 — Stepper Connecting Line Visual Fix (POLISH)

**Problem:** `left-[10%] right-[10%]` hardcodes margins, so the line never touches the first/last icon edges.

**File:** `components/features/onboarding/stepper.tsx`, line 68

**Fix:** Calculate dynamic positioning using step count:
```tsx
{/* Replace existing left-[10%] right-[10%] with: */}
<div 
  className="absolute top-6 -translate-y-1/2 z-10"
  style={{ 
    left: `${100 / (steps.length * 2)}%`,
    right: `${100 / (steps.length * 2)}%`
  }}
>
  <div className={cn("w-full h-1 rounded-full", glass("divider"))} />
  <div
    className={cn(
      "absolute left-0 top-0 h-1 rounded-full transition-all duration-500 ease-in-out",
      "bg-primary/20 dark:bg-primary/30"
    )}
    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
  />
</div>
```

---

## Fix 8 — Location Input: Show Error, Don't Clear (USER-HOSTILE)

**Problem:** `step-basic-info.tsx` onBlur handler calls `setValue('location', '', { shouldValidate: true })` — destroying user input when format is wrong.

**File:** `components/features/onboarding/step-basic-info.tsx`, lines 87-101

**Fix:** Add local error state instead of clearing:
```tsx
const [locationFormatError, setLocationFormatError] = React.useState<string | null>(null)

// Replace onBlur:
onBlur={(e) => {
  const value = e.target.value
  if (value) {
    const validation = validateLocation(value)
    setLocationFormatError(validation !== true ? validation : null)
  } else {
    setLocationFormatError(null)
  }
}}

// Add below the input (after the hint):
{locationFormatError && (
  <p className="text-xs text-amber-500 font-medium mt-1">{locationFormatError}</p>
)}
```

---

## Fix 9 — `displayName` Inline Regex Allows Empty (FALSE ERROR)

**Problem:** `step-basic-info.tsx` registers displayName with `pattern: /^[a-z0-9_]+$/` (uses `+` = one or more). If user types then deletes, empty field triggers pattern error. The field is optional — empty should be valid.

**File:** `components/features/onboarding/step-basic-info.tsx`, line 130

**Fix:** Change `+` to `*` (zero or more):
```tsx
pattern: {
  value: /^[a-z0-9_]*$/,
  message: "Display name can only contain lowercase letters, numbers, and underscores"
}
```

---

## Fix 10 — SessionStorage Write Storm (PERFORMANCE)

**Problem:** Every `formValues` change writes to `sessionStorage` synchronously. Typing "Software Developer" fires 20 `setItem` calls.

**File:** `app/(auth)/onboarding/page.tsx`, lines 196-207

**Fix:** Debounce using the existing `useDebounce` hook:
```tsx
// Add import at top:
import { useDebounce } from "@/hooks/use-debounce"

// In component (before the persistence effect):
const debouncedValues = useDebounce(formValues, 800)

// Change the effect dependency:
useEffect(() => {
  if (currentStep > 0 && hasUnsavedChanges) {
    try {
      sessionStorage.setItem("onboarding_draft", JSON.stringify({
        values: debouncedValues,
        step: currentStep,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.warn("Failed to persist form data:", error)
    }
  }
}, [debouncedValues, currentStep, hasUnsavedChanges])
```

---

## Fix 11 — "Skip & Complete" Only on Meaningful Steps (UX)

**Problem:** Button shows on Step 1 with label "Skip & Complete" but fails validation (no skills/interests yet). Misleading aria-label says "Skip experience step" but it's on basic info step.

**File:** `app/(auth)/onboarding/page.tsx`, lines 677-688

**Fix:** Only show on steps 3+ (after skills and interests are populated):
```tsx
{currentStep >= 3 && (
  <Button
    type="button"
    variant="outline"
    onClick={handleSkipExperience}
    disabled={isSubmitting}
    className="min-w-[120px] border-primary/20 text-primary hover:bg-primary/10"
    aria-label="Complete profile without experience details"
  >
    {isSubmitting ? (
      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
    ) : (
      "Skip & Complete"
    )}
  </Button>
)}
```

---

## Fix 12 — Completion Percentage Reflects Actual Data (UX)

**Problem:** `onSubmit` hardcodes `Math.min(25 + 75, 100)` = always 100%. Meaningless progress dialog.

**File:** `app/(auth)/onboarding/page.tsx`, lines 318-324

**Fix:** Calculate from actual data entered:
```tsx
// Replace:
const calculatedPercentage = 25
setCompletionPercentage(Math.min(calculatedPercentage + 75, 100))

// With:
let calculatedPercentage = 25 // base for basic info
if (data.skills?.length) calculatedPercentage += 25
if (data.interests?.length) calculatedPercentage += 15
if (data.goals?.length) calculatedPercentage += 10
if (data.experiences?.length) calculatedPercentage += 15
if (data.links?.length) calculatedPercentage += 10
setCompletionPercentage(Math.min(calculatedPercentage, 100))
```

---

## Fix 13 — Email Verification Check Robustness (BUG)

**Problem:** `!== null && !== undefined` check treats all truthy values as "verified" — empty string `""` would pass. Doesn't handle timestamp sentinel values.

**File:** `app/(auth)/onboarding/page.tsx`, line 128

**Fix:**
```tsx
// Replace:
const emailIsVerified = user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined

// With:
const emailIsVerified = !!user?.email_confirmed_at
```

---

## Fix 14 — Custom Values Don't Render as Badges (SILENT DATA LOSS IN UI)

**Problem:** Both comboboxes derive `selectedOptions` from `options.filter(opt => selected.includes(opt.id))`. Custom values added via `onAddCustom` are not in the options array, so they never render as badges. In `step-interests-goals.tsx`, custom industries are invisible. In `step-skills.tsx`, custom skills (id: `custom-SkillName`) are invisible.

**Files:** 
- `components/ui/inline-searchable-combobox.tsx`, line 123
- `components/ui/searchable-combobox.tsx`, line 131

**Fix:** Add an optional `getSelectedLabel` prop for label resolution, and always include custom entries in display:
```tsx
// Add to both interfaces:
getSelectedLabel?: (id: string) => string
```

Then update `selectedOptions` derivation in both files:
```tsx
const selectedOptions = React.useMemo(() => {
  const known = options.filter(opt => selected.includes(opt.id))
  const customIds = selected.filter(id => !options.some(opt => opt.id === id))
  const custom = customIds.map(id => ({
    id,
    label: getSelectedLabel ? getSelectedLabel(id) : id,
    description: undefined,
    category: undefined,
    keywords: undefined,
  }))
  return [...known, ...custom]
}, [options, selected, getSelectedLabel])
```

In `step-skills.tsx`, pass the label resolver:
```tsx
<SearchableCombobox
  options={skillOptions}
  selected={skills.map(s => s.id)}
  getSelectedLabel={(id) => skills.find(s => s.id === id)?.label || id}
  // ... other props
/>
```

In `step-interests-goals.tsx` and `step-experience.tsx`, no `getSelectedLabel` needed — custom values are raw strings where `id === label`.

Also, same CLS fix (#6): the badge container should always render with `invisible` when empty to preserve layout space.

---

## Fix 15 — `displayName` Auto-Extraction Never Fires (MISSING FEATURE)

**Problem:** `StepBasicInfo` has auto-extraction logic (`watch("fullName")` → compute `displayName` → call `onNameExtracted`) but `page.tsx` never passes the `onNameExtracted` prop (line 623: `<StepBasicInfo userName={userName} />`).

**File:** `app/(auth)/onboarding/page.tsx`, line 623

**Fix:** Pass the callback to auto-populate displayName:
```tsx
<StepBasicInfo 
  userName={userName} 
  onNameExtracted={(displayName) => {
    const current = methods.getValues("displayName")
    if (!current) {
      methods.setValue("displayName", displayName, { shouldValidate: false, shouldDirty: false })
    }
  }}
/>
```

---

## Fix 16 — `fullName` Overwrite by Async `fetchUser` (RACE CONDITION)

**Problem:** `useEffect` at line 271 fires `setValue("fullName", userName)` after `fetchUser` resolves. If the user has already typed a different name, their input gets overwritten silently.

**File:** `app/(auth)/onboarding/page.tsx`, lines 270-273

**Fix:** Only set if field is still empty or matches the original prefill:
```tsx
useEffect(() => {
  if (userName) {
    const currentValue = methods.getValues("fullName")
    // Only auto-fill if field hasn't been touched by user
    if (!currentValue || currentValue === "") {
      methods.setValue("fullName", userName, { shouldValidate: true, shouldDirty: false })
    }
  }
}, [userName, methods])
```

---

## Fix 17 — Drag-and-Drop: Visual Drop Target Indicator (POLISH)

**Problem:** `SkillsList` reorders on dragOver but has no visual indicator showing where the item will land. Only the dragged item gets `opacity-60`.

**File:** `components/features/onboarding/step-skills.tsx`, in SkillsList render, lines 68-73

**Fix:** Add a border indicator on the target position:
```tsx
className={cn(
  "flex flex-col md:flex-row md:items-center gap-3 md:gap-2 p-4 md:p-3 rounded-lg bg-muted/30 border border-border/30 hover:border-border/50 transition-colors duration-200 cursor-grab active:cursor-grabbing",
  draggedIndex === index && "opacity-60",
  draggedIndex !== null && draggedIndex !== index && "ring-2 ring-primary/30 border-primary/50"
)}
```

---

---

## Fix 18 — Dead Role-Based Skill Suggestions (DEAD CODE)

**Problem:** `step-skills.tsx` line 123: `watch("role") || watch("looking_for")?.[0] || null`. The `role` field is never registered in the Zod schema or the form. `looking_for` maps to `goals` in the form data and is always an array. The check always falls through to `POPULAR_SKILLS`. The role-based suggestion feature (`ROLE_SKILL_SUGGESTIONS`) is dead code.

**File:** `components/features/onboarding/step-skills.tsx`, line 123

**Fix:** Either:
A) Remove the dead `watch("role")` and simplify to just use answers from previous steps (e.g., watch the headline for role detection)
B) Keep the data structure but add role as a derived value from headline or add a role field

**Recommended (A — simple, no new field):**
```tsx
// Replace:
const role = watch("role") || watch("looking_for")?.[0] || null
const roleSuggestions = role ? ROLE_SKILL_SUGGESTIONS[role] || POPULAR_SKILLS : POPULAR_SKILLS

// With:
const headline = watch("headline") || ""
const detectedRole = Object.keys(ROLE_SKILL_SUGGESTIONS).find(role => 
  headline.toLowerCase().includes(role.toLowerCase())
) || null
const roleSuggestions = detectedRole ? ROLE_SKILL_SUGGESTIONS[detectedRole] : POPULAR_SKILLS
```

Then update the suggestion hint text to reflect the detection source:
```tsx
{detectedRole 
  ? `Based on your headline, you might be a ${detectedRole}. Consider adding:`
  : "Popular skills to consider:"
}
```

---

---

## Fix 19 — Double-Click `handleNext` Skips Steps (BUG)

**Problem:** `handleNext` reads `currentStep` from closure. Double-clicking "Next Step" causes both invocations to run `trigger()` for the same step, and both queue `setCurrentStep(prev => prev + 1)`. React batches these within the same event, so `prev` increments twice — jumping from step 2 to step 4, skipping step 3 entirely.

**File:** `app/(auth)/onboarding/page.tsx`, `handleNext` function

**Fix:** Add a transitioning guard:
```tsx
const [isTransitioning, setIsTransitioning] = useState(false)

const handleNext = async () => {
  if (isTransitioning || isSubmitting) return
  setIsTransitioning(true)
  
  try {
    if (currentStep === 0) {
      setCurrentStep(1)
      return
    }
    
    let isStepValid = false
    // ... existing validation ...
    
    if (isStepValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
    }
  } finally {
    setIsTransitioning(false)
  }
}
```

---

## Verification

1. **Dropdown positioning:** Open interests step, type in the industries combobox — results dropdown appears directly below the input, not offset to page top/edge
2. **WCAG:** Run axe DevTools or Lighthouse — no duplicate ID violations for `combobox-dropdown` or `combobox-label`
3. **Name validation:** Type "O'Brien" in full name — passes client validation (previously blocked)
4. **Escape key:** Open InlineSearchableCombobox dropdown, press Escape — search clears, dropdown closes
5. **Company field:** Add experience with only a job title — no red error on empty company field
6. **CLS:** Add first goal/interest in step 3 — page doesn't jump; badge area space is pre-reserved
7. **Location:** Type "San Francisco CA" and blur — inline warning shows, input text preserved (not cleared)
8. **Skip button:** On step 1, verify "Skip & Complete" is hidden. On step 3, verify it appears and works
9. **Progress dialog:** Submit full profile — progress bar shows percentage based on actual data entered, not always 100%
10. **Custom interest:** Type custom industry "Blockchain", press Enter — badge appears immediately
11. **DisplayName:** Check that after typing full name, displayName auto-populates with no user interaction
12. **Race condition:** Type a name in fullName field, wait for fetchUser — name is not overwritten
13. **Drag indicator:** Drag a skill — target position shows ring/border highlight
14. **SessionStorage:** Open DevTools Application tab, type slowly — writes happen every ~800ms, not every keystroke
