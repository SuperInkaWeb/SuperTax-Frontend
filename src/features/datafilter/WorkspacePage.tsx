import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, BarChart3, Calculator, Copy, Database, Replace, Table2, TableProperties } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { getDataset } from "@/features/datafilter/api"
import { AnalysisTabs } from "@/features/datafilter/components/AnalysisTabs"
import { FilterPanel } from "@/features/datafilter/components/FilterPanel"
import { formatRows } from "@/features/datafilter/lib"
import { ComputePanel } from "@/features/datafilter/panels/ComputePanel"
import { DatosPanel } from "@/features/datafilter/panels/DatosPanel"
import { DedupePanel } from "@/features/datafilter/panels/DedupePanel"
import { PivotPanel } from "@/features/datafilter/panels/PivotPanel"
import { ReplacePanel } from "@/features/datafilter/panels/ReplacePanel"
import { StatsPanel } from "@/features/datafilter/panels/StatsPanel"
import { buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { PageHeader } from "@/shared/ui/page-header"
import { Spinner } from "@/shared/ui/spinner"

import type { ToolTab } from "@/features/datafilter/components/AnalysisTabs"
import type { FilterGroup } from "@/features/datafilter/types"
import type { Crumb } from "@/shared/ui/breadcrumbs"

const TABS: ToolTab[] = [
  { id: "datos", label: "Datos", icon: TableProperties },
  { id: "columnas", label: "Columnas calculadas", icon: Calculator },
  { id: "reemplazar", label: "Reemplazar", icon: Replace },
  { id: "duplicados", label: "Duplicados", icon: Copy },
  { id: "pivote", label: "Pivote", icon: Table2 },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
]

export function WorkspacePage() {
  const { datasetId } = useParams()
  const id = Number(datasetId)
  const [filter, setFilter] = useState<FilterGroup | null>(null)
  const [tab, setTab] = useState("datos")

  const detalle = useQuery({
    queryKey: ["datafilter", "dataset", id],
    queryFn: () => getDataset(id),
    enabled: Number.isFinite(id),
  })

  if (detalle.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }
  if (detalle.isError || !detalle.data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudo abrir el dataset"
        description="Puede que no exista o que aún se esté procesando."
        action={
          <Link to="/datafilter" className={buttonVariants({ variant: "outline" })}>
            Volver a datasets
          </Link>
        }
      />
    )
  }

  const ds = detalle.data
  const columnas = ds.columns.map((c) => c.name)
  const breadcrumbs: Crumb[] = [
    { label: "Inicio", to: "/dashboard" },
    { label: "DataFilter", to: "/datafilter" },
    { label: ds.original_filename },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Database}
        title={ds.original_filename}
        description={`${formatRows(ds.row_count)} filas · ${ds.columns.length} columnas`}
        breadcrumbs={breadcrumbs}
      />

      <Card>
        <CardContent className="pt-5">
          <FilterPanel columns={columnas} onApply={setFilter} />
        </CardContent>
      </Card>

      <AnalysisTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "datos" && <DatosPanel datasetId={id} filter={filter} />}
      {tab === "columnas" && <ComputePanel datasetId={id} columns={columnas} filter={filter} />}
      {tab === "reemplazar" && <ReplacePanel datasetId={id} columns={columnas} filter={filter} />}
      {tab === "duplicados" && <DedupePanel datasetId={id} columns={columnas} filter={filter} />}
      {tab === "pivote" && <PivotPanel datasetId={id} columns={columnas} filter={filter} />}
      {tab === "estadisticas" && <StatsPanel datasetId={id} columns={columnas} filter={filter} />}
    </div>
  )
}
