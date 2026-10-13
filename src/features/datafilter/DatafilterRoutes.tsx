import { Database, Home } from "lucide-react"
import { Outlet, Route, Routes, useLocation } from "react-router-dom"

import { NotFoundPage } from "@/app/NotFoundPage"
import { DatasetsPage } from "@/features/datafilter/DatasetsPage"
import { WorkspacePage } from "@/features/datafilter/WorkspacePage"
import { PageHeader } from "@/shared/ui/page-header"

import type { Crumb } from "@/shared/ui/breadcrumbs"

/** Encabezado del listado (el workspace trae el suyo con el nombre del dataset). */
function DatafilterShell() {
  const { pathname } = useLocation()
  const enListado = pathname === "/datafilter"
  const breadcrumbs: Crumb[] = [
    { label: "Inicio", to: "/dashboard", icon: Home },
    { label: "DataFilter" },
  ]
  return (
    <div className="space-y-6">
      {enListado && (
        <PageHeader
          icon={Database}
          title="DataFilter"
          description="Sube archivos grandes y fíltralos, analízalos y descarga resultados."
          breadcrumbs={breadcrumbs}
        />
      )}
      <Outlet />
    </div>
  )
}

export function DatafilterRoutes() {
  return (
    <Routes>
      <Route element={<DatafilterShell />}>
        <Route index element={<DatasetsPage />} />
        <Route path=":datasetId" element={<WorkspacePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
