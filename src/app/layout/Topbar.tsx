import { Menu, Moon, Sun } from "lucide-react"

import { CompanySwitcher } from "@/app/layout/CompanySwitcher"
import { UserMenu } from "@/app/layout/UserMenu"
import { useTheme } from "@/shared/stores/theme"
import { Button } from "@/shared/ui/button"

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggle)

  return (
    <header className="flex h-16 items-center gap-3 border-b bg-card px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <CompanySwitcher />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Cambiar tema" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
