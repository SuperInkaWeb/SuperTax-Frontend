import { Copy } from "lucide-react"
import { useState } from "react"

import { dedupePreview, downloadDedupe, saveDedupe } from "@/features/datafilter/api"
import { Button } from "@/shared/ui/button"

import type { ToolProps } from "@/features/datafilter/components/tool"

const LIMIT = 100

/** Configuración de "Quitar duplicados" (el resultado se muestra al centro). */
export function DedupePanel({ datasetId, columns, filter, onPreview }: ToolProps) {
  const [claves, setClaves] = useState<string[]>([])

  function alternar(col: string) {
    setClaves((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))
  }

  function ejecutar() {
    const key_columns = claves
    onPreview(
      (offset, sort) =>
        dedupePreview(datasetId, {
          filter, key_columns,
          order_column: sort?.column ?? null, order_direction: sort?.direction,
          limit: LIMIT, offset,
        }),
      {
        countLabel: "filas únicas",
        sortable: true,
        download: (format, delimiter) =>
          downloadDedupe(datasetId, { filter, key_columns, format, delimiter }),
        save: async (name) => {
          await saveDedupe(datasetId, { filter, key_columns, name })
        },
      },
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Columnas clave (define qué hace duplicada una fila). Sin selección = fila completa idéntica.
      </p>
      <div className="flex flex-wrap gap-2">
        {columns.map((c) => (
          <label
            key={c}
            className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
          >
            <input type="checkbox" checked={claves.includes(c)} onChange={() => alternar(c)} />
            {c}
          </label>
        ))}
      </div>
      <Button onClick={ejecutar}>
        <Copy className="size-4" />
        Ver sin duplicados
      </Button>
    </div>
  )
}
