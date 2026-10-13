import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { dedupePreview, downloadDedupe, saveDedupe } from "@/features/datafilter/api"
import { ResultView } from "@/features/datafilter/components/ResultView"
import { useAnalysisResult } from "@/features/datafilter/hooks/useAnalysisResult"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"

import type { Delimiter, DownloadFormat, FilterGroup } from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

export function DedupePanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const [claves, setClaves] = useState<string[]>([])
  const [descargando, setDescargando] = useState(false)

  const result = useAnalysisResult()

  function ejecutar() {
    result.run((offset, sort) =>
      dedupePreview(datasetId, {
        filter, key_columns: claves,
        order_column: sort?.column ?? null, order_direction: sort?.direction,
        limit: result.limit, offset,
      }),
    )
  }

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
        <Button onClick={ejecutar} disabled={result.loading}>
          <Copy className="size-4" />
          Ver sin duplicados
        </Button>
      </div>

      <ResultView
        result={result}
        onDownload={descargar}
        downloading={descargando}
        onSave={(name) => guardar.mutate(name)}
        saving={guardar.isPending}
        placeholder="Elige columnas clave (o ninguna) y pulsa “Ver sin duplicados”."
      />
    </div>
  )
}
