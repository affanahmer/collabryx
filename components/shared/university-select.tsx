"use client"

import { useState, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { glass } from "@/lib/utils/glass-variants"
import { universitiesDatabase, type University } from "@/lib/data/universities-database"

interface UniversitySelectProps {
  value?: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  className?: string
}

export function UniversitySelect({
  value = "",
  onChange,
  error,
  disabled = false,
  className,
}: UniversitySelectProps) {
  const [searchQuery, setSearchQuery] = useState(value || "")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isCustom, setIsCustom] = useState(false)

  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || isCustom) return []
    const q = searchQuery.toLowerCase()
    return universitiesDatabase
      .filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.domain.toLowerCase().includes(q) ||
        u.country.toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, [searchQuery, isCustom])

  const handleSelect = (university: University) => {
    setSearchQuery(university.name)
    onChange(university.name)
    setShowSuggestions(false)
    setIsCustom(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    onChange(val)
    setShowSuggestions(true)
    setIsCustom(false)
  }

  const handleBlur = () => {
    // Delay hiding suggestions so click can register
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const handleFocus = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(true)
    }
  }

  const handleUseCustom = () => {
    setIsCustom(true)
    setShowSuggestions(false)
  }

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor="university" className="text-sm font-semibold text-foreground">
        University / School <span className="text-muted-foreground font-normal">(Optional)</span>
      </Label>
      <Input
        id="university"
        type="text"
        value={searchQuery}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search for your university..."
        disabled={disabled}
        autoComplete="off"
        aria-label="University search"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        className={cn(
          "h-11 text-sm mt-1.5",
          glass("input"),
          error && "border-destructive focus:border-destructive"
        )}
      />
      {error && (
        <p className="text-xs text-destructive font-medium mt-1" role="alert">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className={cn(
            "absolute z-50 mt-1 w-full rounded-xl border border-border/50 shadow-xl overflow-hidden",
            "bg-background/95 backdrop-blur-xl"
          )}
          role="listbox"
        >
          {suggestions.map((u) => (
            <li
              key={u.id}
              role="option"
              aria-selected={searchQuery === u.name}
              className={cn(
                "px-4 py-3 cursor-pointer text-sm transition-colors",
                "hover:bg-primary/10 hover:text-primary",
                "border-b border-border/10 last:border-b-0"
              )}
              onMouseDown={() => handleSelect(u)}
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {u.city ? `${u.city}, ` : ""}{u.country} · {u.domain}
              </div>
            </li>
          ))}
          {suggestions.length < universitiesDatabase.length && (
            <li
              role="option"
              aria-selected={false}
              className={cn(
                "px-4 py-2.5 cursor-pointer text-xs text-center transition-colors",
                "text-muted-foreground hover:text-primary hover:bg-primary/5",
                "border-t border-border/10"
              )}
              onMouseDown={handleUseCustom}
            >
              Can&apos;t find your university? <span className="font-semibold underline">Type it manually</span>
            </li>
          )}
        </ul>
      )}

      {showSuggestions && searchQuery.trim() && suggestions.length === 0 && !isCustom && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-xl border border-border/50 shadow-xl overflow-hidden",
            "bg-background/95 backdrop-blur-xl"
          )}
        >
          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
            No universities found.
          </div>
          <button
            type="button"
            className="w-full px-4 py-2.5 text-xs text-center border-t border-border/10 text-primary hover:bg-primary/5 font-semibold transition-colors"
            onMouseDown={handleUseCustom}
          >
            Add &ldquo;{searchQuery}&rdquo; as custom university
          </button>
        </div>
      )}
    </div>
  )
}
