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

function useNavItems(): NavItem[] {
  const user = useAuthStore((s) => s.user)
  const companyId = useActiveCompany((s) => s.companyId)
  const empresa = user?.companies.find((c) => c.id === companyId)
  const modulos = empresa?.modules ?? []
  const puedeAdministrar =
    (user?.is_platform_admin ?? false) || empresa?.role_key === "admin_empresa"

  return [
    { to: "/dashboard", label: "Inicio", icon: LayoutDashboard, visible: true },
    { to: "/sire", label: "SIRE", icon: FileSpreadsheet, visible: modulos.includes("sire") },
    { to: "/sunat", label: "SUNAT", icon: Download, visible: modulos.includes("sunat") },
    { to: "/scanner", label: "Escaneo", icon: ScanLine, visible: modulos.includes("scanner") },
    { to: "/admin", label: "Administración", icon: Settings, visible: puedeAdministrar },
  ]
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const items = useNavItems()
  return (
    <>
      <div className="flex h-16 items-center px-6 text-lg font-semibold">Plataforma</div>
      <nav className="flex flex-col gap-1 px-3">
        {items
          .filter((item) => item.visible)
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              end={to === "/dashboard"}
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
    </>
  )
}

/** Sidebar estático (escritorio). */
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <SidebarContent />
    </aside>
  )
}

/** Drawer del sidebar en móvil. */
export function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <aside
        className="absolute left-0 top-0 flex h-full w-60 flex-col bg-sidebar text-sidebar-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  )
}
