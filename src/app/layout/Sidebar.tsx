import {
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  ScanLine,
  Settings,
} from "lucide-react"
import { NavLink } from "react-router-dom"

import { cn } from "@/shared/lib/utils"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"

import type { LucideIcon } from "lucide-react"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  visible: boolean
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const companyId = useActiveCompany((s) => s.companyId)
  const empresa = user?.companies.find((c) => c.id === companyId)
  const modulos = empresa?.modules ?? []

  // Administración: SuperAdmin (empresas/solicitudes) o Admin de la empresa
  // activa (gestión de miembros). Los módulos se muestran solo si la empresa
  // los tiene contratados; el backend igual valida (doble puerta).
  const puedeAdministrar =
    (user?.is_platform_admin ?? false) || empresa?.role_key === "admin_empresa"

  const items: NavItem[] = [
    { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, visible: true },
    { to: "/sire", label: "SIRE", icon: FileSpreadsheet, visible: modulos.includes("sire") },
    { to: "/sunat", label: "SUNAT", icon: Download, visible: modulos.includes("sunat") },
    { to: "/scanner", label: "Escaneo", icon: ScanLine, visible: modulos.includes("scanner") },
    { to: "/admin", label: "Administración", icon: Settings, visible: puedeAdministrar },
  ]

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center px-6 text-lg font-semibold">Plataforma</div>
      <nav className="flex flex-col gap-1 px-3">
        {items
          .filter((item) => item.visible)
          .map(({ to, label, icon: Icon }) => (
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
          ))}
      </nav>
    </aside>
  )
}
