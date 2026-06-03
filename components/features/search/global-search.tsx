"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Users, FileText, Tag, Heart, Loader2, CornerDownLeft, Sparkles, ShieldAlert, ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"
import { formatInitials } from "@/lib/utils/format-initials"
import { useGlobalSearch } from "@/hooks/use-global-search"

interface GlobalSearchProps {
  className?: string
  isCollapsed?: boolean
  onExpand?: () => void
}

const matchBadge: Record<string, { label: string; className: string }> = {
  name: { label: "Profile", className: "bg-primary/10 text-primary border-primary/20" },
  skill: { label: "Skill", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  interest: { label: "Interest", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
}

export function GlobalSearch({ className, isCollapsed = false, onExpand }: GlobalSearchProps) {
  const router = useRouter()
  const { query, setQuery, results, isFetching, hasResults, isEmpty, isBlocked, suggestions } = useGlobalSearch()
  const [open, setOpen] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const allItems = React.useMemo(() => {
    const items: Array<{
      id: string
      type: "person"
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
        type: "person",
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
        type: "person",
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
    if (query.length >= 2 && (hasResults || isBlocked)) {
      setOpen(true)
    } else if (query.length < 2) {
      setOpen(false)
    }
  }, [query, hasResults, isBlocked])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery("")
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
    } else if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleCollapsedClick = () => {
    if (onExpand) onExpand()
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={handleCollapsedClick}
        className={cn(
          "w-full flex items-center justify-center rounded-xl py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 cursor-pointer",
          className
        )}
        aria-label="Search"
      >
        <Search className="h-[1.15rem] w-[1.15rem]" />
      </button>
    )
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
    <Popover open={open} onOpenChange={(v) => { if (!v) setOpen(false) }}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (query.length >= 2 && (hasResults || isBlocked)) setOpen(true) }}
            placeholder="Search people, skills, posts..."
            className={cn(
              "w-full h-9 pl-9 pr-14 rounded-lg text-sm outline-hidden transition-all duration-200",
              "bg-muted/50 border border-transparent",
              "placeholder:text-foreground/30",
              "focus:bg-muted focus:border-border focus:ring-2 focus:ring-primary/15",
              "text-foreground"
            )}
            aria-label="Search"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground/30">
            <CornerDownLeft className="h-2.5 w-2.5" />
            K
          </kbd>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-96 p-0 overflow-hidden",
          glass("overlay"),
          "bg-card/95 backdrop-blur-xl shadow-glass-overlay"
        )}
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Offensive content blocked */}
        {isBlocked && (
          <div className="px-3 py-6 text-center">
            <ShieldAlert className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">Search blocked</p>
            <p className="text-xs text-foreground/40 mt-1">This search term is not allowed</p>
          </div>
        )}

        {/* Loading */}
        {isFetching && query.length >= 2 && !isBlocked && (
          <div className="flex items-center gap-2 px-3 py-6 justify-center text-sm text-foreground/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {/* Empty with suggestions */}
        {isEmpty && !isBlocked && (
          <div className="px-3 py-6 text-center">
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
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/50 transition-colors text-left group"
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-foreground/30 group-hover:text-primary transition-colors" />
                    <span className="text-foreground/70 group-hover:text-foreground">{s.suggestion}</span>
                    <span className="text-[10px] text-foreground/30 ml-auto capitalize">{s.source_type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {hasResults && !isFetching && !isBlocked && (
          <div className="max-h-80 overflow-y-auto">
            {/* Fuzzy match indicator */}
            {hasAnyFuzzy && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 bg-amber-500/[0.03]">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                  Showing fuzzy matches for &ldquo;{query}&rdquo;
                </span>
              </div>
            )}

            {sections.map((section) => {
              if (section.items.length === 0) return null
              return (
                <div key={section.key}>
                  <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
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
                          "w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-150",
                          isSelected
                            ? "bg-primary/10 text-primary shadow-[0_0_16px_rgba(99,102,241,0.06)]"
                            : "text-foreground hover:bg-muted/50"
                        )}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/50">
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
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
