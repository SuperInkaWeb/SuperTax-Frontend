import { NavLink, Outlet } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

const TABS = [
  { to: "/scanner", label: "Subir documento", end: true },
  { to: "/scanner/documentos", label: "Documentos", end: false },
]

export function ScannerLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Escaneo de documentos</h1>
        <p className="text-sm text-muted-foreground">
          Sube comprobantes o planillas y extrae sus campos automáticamente.
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
