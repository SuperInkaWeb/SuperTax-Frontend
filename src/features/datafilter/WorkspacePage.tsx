import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Database } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { downloadDataset, getDataset, previewDataset } from "@/features/datafilter/api"
import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { FilterPanel } from "@/features/datafilter/components/FilterPanel"
import { PreviewTable } from "@/features/datafilter/components/PreviewTable"
import { formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { PageHeader } from "@/shared/ui/page-header"
import { Spinner } from "@/shared/ui/spinner"

import type { Delimiter, DownloadFormat, FilterGroup } from "@/features/datafilter/types"
import type { Crumb } from "@/shared/ui/breadcrumbs"

const PAGINA = 100

export function WorkspacePage() {
  const { datasetId } = useParams()
  const id = Number(datasetId)
  const [filter, setFilter] = useState<FilterGroup | null>(null)
  const [offset, setOffset] = useState(0)
  const [descargando, setDescargando] = useState(false)

  const detalle = useQuery({
    queryKey: ["datafilter", "dataset", id],
    queryFn: () => getDataset(id),
    enabled: Number.isFinite(id),
  })

  const vista = useQuery({
    queryKey: ["datafilter", "preview", id, filter, offset],
    queryFn: () =>
      previewDataset(id, { filter, select: [], sort: [], limit: PAGINA, offset }),
    enabled: detalle.data?.status === "ready",
  })

  const breadcrumbs: Crumb[] = [
    { label: "Inicio", to: "/dashboard" },
    { label: "DataFilter", to: "/datafilter" },
    { label: detalle.data?.original_filename ?? "Dataset" },
  ]

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadDataset(id, { filter, select: [], sort: [], format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

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
  const total = vista.data?.total_matched ?? 0
  const desde = total === 0 ? 0 : offset + 1
  const hasta = Math.min(offset + PAGINA, total)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Database}
        title={ds.original_filename}
        description={`${formatRows(ds.row_count)} filas · ${ds.columns.length} columnas`}
        breadcrumbs={breadcrumbs}
      />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <FilterPanel
            columns={columnas}
            onApply={(f) => {
              setFilter(f)
              setOffset(0)
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {formatRows(total)} coincidencias
            </p>
            <DownloadBar onDownload={descargar} pending={descargando} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {vista.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : vista.isError ? (
            <p className="p-4 text-sm text-destructive">
              {apiError(vista.error, "No se pudo cargar la vista previa")}
            </p>
          ) : (
            <PreviewTable columns={vista.data?.columns ?? []} rows={vista.data?.rows ?? []} />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {desde}–{hasta} de {formatRows(total)}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGINA))}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={hasta >= total}
            onClick={() => setOffset((o) => o + PAGINA)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
