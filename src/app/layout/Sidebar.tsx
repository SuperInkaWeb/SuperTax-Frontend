import { Download, FileSpreadsheet, LayoutDashboard, ScanLine } from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

const ITEMS = [
  { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, enabled: true },
  { to: "/sire", label: "SIRE", icon: FileSpreadsheet, enabled: true },
  { to: "/sunat", label: "SUNAT", icon: Download, enabled: false },
  { to: "/scanner", label: "Escaneo", icon: ScanLine, enabled: false },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center px-6 text-lg font-semibold">Plataforma</div>
      <nav className="flex flex-col gap-1 px-3">
        {ITEMS.map(({ to, label, icon: Icon, enabled }) =>
          enabled ? (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50",
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ) : (
            <span
              key={to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/35"
            >
              <Icon className="size-4" />
              {label}
              <span className="ml-auto text-[10px] uppercase tracking-wide">pronto</span>
            </span>
          ),
        )}
      </nav>
    </aside>
  )
}
