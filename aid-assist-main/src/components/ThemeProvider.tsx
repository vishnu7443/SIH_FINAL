import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ReactNode } from "react"

export function ThemeProvider({ 
  children, 
  ...props 
}: {
  children: ReactNode
  attribute?: "class" | "data-theme" | "data-mode"
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  )
}