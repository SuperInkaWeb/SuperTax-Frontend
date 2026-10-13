import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { dedupePreview, downloadDedupe, saveDedupe } from "@/features/datafilter/api"
import { ResultView } from "@/features/datafilter/components/ResultView"
import { formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"

import type { Delimiter, DedupeResponse, DownloadFormat, FilterGroup } from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

const PAGINA = 100

export function DedupePanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const [claves, setClaves] = useState<string[]>([])
  const [descargando, setDescargando] = useState(false)

  const ver = useMutation({
    mutationFn: () =>
      dedupePreview(datasetId, { filter, key_columns: claves, limit: PAGINA, offset: 0 }),
  })
  const res: DedupeResponse | undefined = ver.data

  const guardar = useMutation({
    mutationFn: (name: string) => saveDedupe(datasetId, { filter, key_columns: claves, name }),
    onSuccess: () => {
      toast.success("Guardando… aparecerá en Datasets al terminar")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar")),
  })

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadDedupe(datasetId, { filter, key_columns: claves, format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  function alternar(col: string) {
    setClaves((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))
  }

  const countLabel =
    res == null ? "filas" : `filas únicas (de ${formatRows(res.total_original)})`

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Columnas clave (define qué hace duplicada una fila). Sin selección = fila completa idéntica.
        </p>
        <div className="flex flex-wrap gap-2">
          {columns.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                checked={claves.includes(c)}
                onChange={() => alternar(c)}
              />
              {c}
            </label>
          ))}
        </div>
        <Button onClick={() => ver.mutate()} disabled={ver.isPending}>
          <Copy className="size-4" />
          Ver sin duplicados
        </Button>
      </div>

      <ResultView
        loading={ver.isPending}
        error={ver.isError ? apiError(ver.error, "No se pudo quitar duplicados") : null}
        columns={res?.columns ?? []}
        rows={res?.rows ?? []}
        total={res?.total_matched ?? null}
        countLabel={countLabel}
        onDownload={descargar}
        downloading={descargando}
        onSave={(name) => guardar.mutate(name)}
        saving={guardar.isPending}
        placeholder="Elige columnas clave (o ninguna) y pulsa “Ver sin duplicados”."
      />
    </div>
  )
}
