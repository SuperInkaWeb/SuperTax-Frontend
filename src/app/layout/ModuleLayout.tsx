import { Home } from "lucide-react"
import { Outlet, useLocation } from "react-router-dom"

import { PageHeader } from "@/shared/ui/page-header"
import { NavTabs } from "@/shared/ui/tabs"

import type { Crumb } from "@/shared/ui/breadcrumbs"
import type { TabItem } from "@/shared/ui/tabs"
import type { LucideIcon } from "lucide-react"

interface ModuleLayoutProps {
  icon: LucideIcon
  title: string
  description: string
  /** Ruta base del módulo (índice), p. ej. "/sunat". */
  basePath: string
  /** Etiqueta corta del módulo para el breadcrumb (p. ej. "SUNAT"). */
  breadcrumbLabel: string
  tabs: TabItem[]
}

/**
 * Layout común de los módulos (SUNAT/SIRE/Escaneo): encabezado con breadcrumbs
 * + navegación por pestañas + contenido. Unifica el patrón que antes estaba
 * duplicado en cada layout. El breadcrumb añade la sección activa según la ruta.
 */
export function ModuleLayout({
  icon,
  title,
  description,
  basePath,
  breadcrumbLabel,
  tabs,
}: ModuleLayoutProps) {
  const { pathname } = useLocation()
  const activa = [...tabs]
    .reverse()
    .find((t) => (t.end ? pathname === t.to : pathname.startsWith(t.to)))

  const breadcrumbs: Crumb[] = [
    { label: "Inicio", to: "/dashboard", icon: Home },
    { label: breadcrumbLabel, to: basePath },
  ]
  if (activa && activa.to !== basePath) {
    breadcrumbs.push({ label: activa.label })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={icon}
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <NavTabs items={tabs} />
      <Outlet />
    </div>
  )
}
