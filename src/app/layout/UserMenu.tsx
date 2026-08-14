import { useAuth0 } from "@auth0/auth0-react"
import { ChevronDown, LogOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { useAuthStore } from "@/shared/stores/auth"

export function UserMenu() {
  const { logout } = useAuth0()
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const iniciales =
    user?.nombre
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "?"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
          {iniciales}
        </span>
        <span className="hidden text-sm font-medium sm:block">{user?.nombre}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user?.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="border-t" />
          <button
            type="button"
            onClick={() => logout({ logoutParams: { returnTo: `${window.location.origin}/login` } })}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
