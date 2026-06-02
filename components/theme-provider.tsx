"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === "system" ? getSystemTheme() : theme
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  // Also set cookie for SSR awareness (max-age 1 year)
  const isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
  document.cookie = `${STORAGE_KEY}=${theme}; path=/; max-age=31536000; SameSite=Lax${isProduction ? '; Secure' : ''}`
  return resolved
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (!stored || !['light','dark','system'].includes(stored)) return 'system'
      return stored ?? defaultTheme
    } catch {
      return defaultTheme
    }
  })

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    const resolved = applyTheme(theme)
    setResolvedTheme(resolved)

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? "dark" : "light"
        document.documentElement.classList.remove("light", "dark")
        document.documentElement.classList.add(newResolved)
        setResolvedTheme(newResolved)
      }
      media.addEventListener("change", handler)
      return () => media.removeEventListener("change", handler)
    }
  }, [theme])

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      if (disableTransitionOnChange) {
        const css = document.createElement("style")
        css.textContent = "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;transition:none!important}"
        document.head.appendChild(css)
        window.requestAnimationFrame(() => {
          document.head.removeChild(css)
        })
      }
      try {
        localStorage.setItem(STORAGE_KEY, newTheme)
      } catch {
        // localStorage unavailable
      }
      setThemeState(newTheme)
    },
    [disableTransitionOnChange]
  )

  const value = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
