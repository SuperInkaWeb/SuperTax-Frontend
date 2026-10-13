import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { downloadDataset, previewDataset } from "@/features/datafilter/api"
import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { PreviewTable } from "@/features/datafilter/components/PreviewTable"
import { formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

import type { Delimiter, DownloadFormat, FilterGroup } from "@/features/datafilter/types"

interface DatosPanelProps {
  datasetId: number
  filter: FilterGroup | null
}

const PAGINA = 100

/** Vista de datos: filas que cumplen el filtro, paginadas, con descarga. */
export function DatosPanel({ datasetId, filter }: DatosPanelProps) {
  const [offset, setOffset] = useState(0)
  const [descargando, setDescargando] = useState(false)

  // Al cambiar el filtro desde el padre, volver a la primera página.
  const [filtroPrevio, setFiltroPrevio] = useState(filter)
  if (filtroPrevio !== filter) {
    setFiltroPrevio(filter)
    setOffset(0)
  }

  const vista = useQuery({
    queryKey: ["datafilter", "preview", datasetId, filter, offset],
    queryFn: () => previewDataset(datasetId, { filter, select: [], sort: [], limit: PAGINA, offset }),
  })

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadDataset(datasetId, { filter, select: [], sort: [], format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  const total = vista.data?.total_matched ?? 0
  const desde = total === 0 ? 0 : offset + 1
  const hasta = Math.min(offset + PAGINA, total)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{formatRows(total)} coincidencias</p>
        <DownloadBar onDownload={descargar} pending={descargando} />
      </div>

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
