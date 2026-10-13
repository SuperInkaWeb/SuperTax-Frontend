import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, BarChart3, Calculator, Copy, Database, Replace, Table2, TableProperties } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { changeSheet, getDataset } from "@/features/datafilter/api"
import { AnalysisTabs } from "@/features/datafilter/components/AnalysisTabs"
import { FilterPanel } from "@/features/datafilter/components/FilterPanel"
import { enProceso, formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
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
import { Select } from "@/shared/ui/select"
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
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterGroup | null>(null)
  const [tab, setTab] = useState("datos")

  const detalle = useQuery({
    queryKey: ["datafilter", "dataset", id],
    queryFn: () => getDataset(id),
    enabled: Number.isFinite(id),
    refetchInterval: (query) => (query.state.data && enProceso(query.state.data.status) ? 3000 : false),
  })

  const cambiarHoja = useMutation({
    mutationFn: (sheet: string) => changeSheet(id, sheet),
    onSuccess: () => {
      toast.success("Reprocesando con la nueva hoja…")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "dataset", id] })
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo cambiar de hoja")),
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

  const header = (
    <PageHeader
      icon={Database}
      title={ds.original_filename}
      description={`${formatRows(ds.row_count)} filas · ${ds.columns.length} columnas`}
      breadcrumbs={breadcrumbs}
    />
  )

  // Mientras se (re)procesa (p. ej. tras cambiar de hoja) no hay esquema estable.
  if (enProceso(ds.status)) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Database}
          title="Procesando el archivo…"
          description="Esto puede tardar según el tamaño. La vista se abrirá automáticamente al terminar."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      {ds.sheets.length > 1 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-5">
            <span className="text-sm font-medium">Hoja de Excel</span>
            <Select
              value={ds.active_sheet ?? ds.sheets[0]}
              onChange={(e) => cambiarHoja.mutate(e.target.value)}
              disabled={cambiarHoja.isPending}
              className="w-56"
            >
              {ds.sheets.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <span className="text-sm text-muted-foreground">
              Cambiar de hoja re-procesa el archivo.
            </span>
          </CardContent>
        </Card>
      )}

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
