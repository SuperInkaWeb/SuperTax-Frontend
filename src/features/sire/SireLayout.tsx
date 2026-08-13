import { NavLink, Outlet } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

const TABS = [
  { to: "/sire", label: "Conciliaciones", end: true },
  { to: "/sire/nueva", label: "Nueva" },
  { to: "/sire/credenciales", label: "Credenciales" },
  { to: "/sire/formato", label: "Formato de archivo" },
]

export function SireLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">SIRE</h1>
        <p className="text-sm text-muted-foreground">
          Conciliación de compras y ventas contra SUNAT.
        </p>
      </div>
      <nav className="flex gap-1 border-b">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "-mb-px border-b-2 px-3 py-2 text-sm",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
