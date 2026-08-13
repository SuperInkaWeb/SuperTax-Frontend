import { NavLink, Outlet } from "react-router-dom"

import { cn } from "@/shared/lib/utils"
import { useAuthStore } from "@/shared/stores/auth"

export function AdminLayout() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)

  const tabs = [
    ...(esPlatformAdmin
      ? [
          { to: "/admin", label: "Empresas", end: true },
          { to: "/admin/solicitudes", label: "Solicitudes", end: false },
        ]
      : []),
    { to: "/admin/miembros", label: "Miembros", end: false },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Administración</h1>
        <p className="text-sm text-muted-foreground">
          Empresas, accesos y miembros de la plataforma.
        </p>
      </div>
      <nav className="flex gap-1 border-b">
        {tabs.map((t) => (
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
