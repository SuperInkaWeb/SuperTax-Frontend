import { Building2, Inbox, KeyRound, Settings, ShieldCheck, Users, UsersRound } from "lucide-react"

import { ModuleLayout } from "@/app/layout/ModuleLayout"
import { useAuthStore } from "@/shared/stores/auth"

import type { TabItem } from "@/shared/ui/tabs"

export function AdminLayout() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)

  const tabs: TabItem[] = [
    ...(esPlatformAdmin
      ? [
          { to: "/admin", label: "Empresas", icon: Building2, end: true },
          { to: "/admin/solicitudes", label: "Solicitudes", icon: Inbox },
        ]
      : []),
    { to: "/admin/miembros", label: "Miembros", icon: Users },
    { to: "/admin/equipo", label: "Equipo", icon: UsersRound },
    { to: "/admin/administradores", label: "Administradores", icon: ShieldCheck },
    { to: "/admin/solicitudes-acceso", label: "Solicitudes de acceso", icon: KeyRound },
  ]

  return (
    <ModuleLayout
      icon={Settings}
      title="Administración"
      description="Empresas, accesos y miembros de la plataforma."
      basePath="/admin"
      breadcrumbLabel="Administración"
      tabs={tabs}
    />
  )
}
