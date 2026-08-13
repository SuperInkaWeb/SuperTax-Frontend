import { useAuth0 } from "@auth0/auth0-react"
import { LogOut } from "lucide-react"

import { CompanySwitcher } from "@/app/layout/CompanySwitcher"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"

export function Topbar() {
  const { logout } = useAuth0()
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
      <CompanySwitcher />
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.nombre ?? user?.email}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar sesión"
          onClick={() =>
            logout({ logoutParams: { returnTo: `${window.location.origin}/login` } })
          }
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  )
}
