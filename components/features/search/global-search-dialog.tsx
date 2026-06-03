"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Users, FileText, Tag, Heart, Loader2, ArrowRight, ShieldAlert, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"
import { formatInitials } from "@/lib/utils/format-initials"
import { useGlobalSearch } from "@/hooks/use-global-search"

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const matchBadge: Record<string, { label: string; className: string }> = {
  name: { label: "Profile", className: "bg-primary/10 text-primary border-primary/20" },
  skill: { label: "Skill", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  interest: { label: "Interest", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter()
  const { query, setQuery, results, isFetching, hasResults, isEmpty, isBlocked, suggestions } = useGlobalSearch()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const allItems = React.useMemo(() => {
    const items: Array<{
      id: string
      matchType: "name" | "skill" | "interest"
      label: string
      subtitle?: string
      avatar?: string | null
      matchedTag?: string | null
      isFuzzy: boolean
      href: string
    }> = []

    results.people.forEach((p) => {
      const subtitleParts: string[] = []
      if (p.headline) subtitleParts.push(p.headline)
      if (p.matched_tag && p.match_type !== "name") {
        subtitleParts.push(p.matched_tag)
      }
      items.push({
        id: p.id,
        matchType: p.match_type,
        label: p.name,
        subtitle: subtitleParts.join(" · ") || undefined,
        avatar: p.avatar_url,
        matchedTag: p.matched_tag,
        isFuzzy: p.is_fuzzy,
        href: `/profile/${p.id}`,
      })
    })

    results.posts.forEach((p) => {
      items.push({
        id: `post-${p.id}`,
        matchType: "name",
        label: p.author_name || "Unknown",
        subtitle: p.content?.slice(0, 120) || undefined,
        avatar: p.author_avatar,
        isFuzzy: p.is_fuzzy,
        href: `/dashboard`,
      })
    })

    return items
  }, [results])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
    }
  }, [open])

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(allItems[selectedIndex].href)
    }
  }

  const sections: Array<{ key: string; label: string; icon: React.ReactNode; items: typeof allItems[0][] }> = [
    {
      key: "name",
      label: "People",
      icon: <Users className="h-3.5 w-3.5 text-foreground/40" />,
      items: allItems.filter((i) => i.matchType === "name"),
    },
    {
      key: "skill",
      label: "By Skill",
      icon: <Tag className="h-3.5 w-3.5 text-foreground/40" />,
      items: allItems.filter((i) => i.matchType === "skill"),
    },
    {
      key: "interest",
      label: "By Interest",
      icon: <Heart className="h-3.5 w-3.5 text-foreground/40" />,
      items: allItems.filter((i) => i.matchType === "interest"),
    },
  ]

  const hasAnyFuzzy = allItems.some((i) => i.isFuzzy)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden",
          glass("overlay"),
          "bg-card/95 backdrop-blur-xl shadow-glass-overlay"
        )}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-foreground/40 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search people, skills, posts..."
            className="flex-1 bg-transparent text-foreground text-sm outline-hidden placeholder:text-foreground/30"
            aria-label="Search"
          />
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground/30">
            esc
          </kbd>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {isBlocked && (
            <div className="px-3 py-12 text-center">
              <ShieldAlert className="h-10 w-10 text-destructive/60 mx-auto mb-3" />
              <p className="text-base text-foreground font-medium">Search blocked</p>
              <p className="text-sm text-foreground/40 mt-1">This search term is not allowed</p>
            </div>
          )}

          {isFetching && query.length >= 2 && !isBlocked && (
            <div className="flex items-center gap-2 px-3 py-12 justify-center text-sm text-foreground/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              Searching...
            </div>
          )}

          {isEmpty && !isBlocked && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-foreground/40">No results for &ldquo;{query}&rdquo;</p>

              {suggestions.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-2 px-1">
                    Did you mean?
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s.suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(s.suggestion)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors text-left group"
                    >
                      <ArrowRight className="h-4 w-4 text-foreground/30 group-hover:text-primary transition-colors" />
                      <span className="text-foreground/70 group-hover:text-foreground">{s.suggestion}</span>
                      <span className="text-[10px] text-foreground/30 ml-auto capitalize">{s.source_type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {query.length < 2 && !isBlocked && (
            <div className="px-3 py-12 text-center">
              <p className="text-sm text-foreground/30">Type at least 2 characters to search</p>
            </div>
          )}

          {hasResults && !isFetching && !isBlocked && (
            <>
              {hasAnyFuzzy && (
                <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/30 bg-amber-500/[0.03]">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                    Showing fuzzy matches for &ldquo;{query}&rdquo;
                  </span>
                </div>
              )}

              {sections.map((section) => {
                if (section.items.length === 0) return null
                return (
                  <div key={section.key}>
                    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                      {section.icon}
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
                        {section.label}
                      </span>
                      <span className="text-[10px] text-foreground/25 ml-auto">
                        {section.items.length}
                      </span>
                    </div>
                    {section.items.map((item) => {
                      const globalIdx = allItems.indexOf(item)
                      const isSelected = globalIdx === selectedIndex
                      const badge = matchBadge[item.matchType]
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item.href)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150",
                            isSelected
                              ? "bg-primary/10 text-primary shadow-[0_0_16px_rgba(99,102,241,0.06)]"
                              : "text-foreground hover:bg-muted/50"
                          )}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                        >
                          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                            <AvatarImage src={item.avatar || undefined} className="object-cover" />
                            <AvatarFallback className="text-[10px] bg-muted text-foreground">
                              {formatInitials(item.label)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{item.label}</p>
                              {item.matchType !== "name" && (
                                <span className={cn("shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-medium", badge.className)}>
                                  {item.matchedTag || badge.label}
                                </span>
                              )}
                              {item.isFuzzy && (
                                <span className="shrink-0 text-[9px] text-amber-500">
                                  <Sparkles className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-xs text-foreground/50 truncate">{item.subtitle}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
