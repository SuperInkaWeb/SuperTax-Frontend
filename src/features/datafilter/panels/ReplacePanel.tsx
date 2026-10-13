import { Plus, Replace, X } from "lucide-react"
import { useState } from "react"

import { downloadReplace, replacePreview, saveReplace } from "@/features/datafilter/api"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type { ToolProps } from "@/features/datafilter/components/tool"
import type { MatchMode, ReplacementRule } from "@/features/datafilter/types"

interface Regla {
  id: number
  column: string
  mode: MatchMode
  search: string
  replace: string
  case_sensitive: boolean
}

let contador = 0
const LIMIT = 100

/** Configuración de "Buscar y reemplazar" (el resultado se muestra al centro). */
export function ReplacePanel({ datasetId, columns, filter, onPreview }: ToolProps) {
  const [reglas, setReglas] = useState<Regla[]>([])

  function nueva(): Regla {
    return {
      id: contador++, column: columns[0] ?? "", mode: "exact",
      search: "", replace: "", case_sensitive: true,
    }
  }
  function actualizar(id: number, cambios: Partial<Regla>) {
    setReglas((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)))
  }

  const payload = (): ReplacementRule[] =>
    reglas
      .filter((r) => r.column && r.search)
      .map(({ column, mode, search, replace, case_sensitive }) => ({
        column, mode, search, replace, case_sensitive,
      }))

  function ejecutar() {
    const replacements = payload()
    onPreview(
      (offset, sort) =>
        replacePreview(datasetId, {
          filter, replacements,
          order_column: sort?.column ?? null, order_direction: sort?.direction,
          limit: LIMIT, offset,
        }),
      {
        sortable: true,
        download: (format, delimiter) =>
          downloadReplace(datasetId, { filter, replacements, format, delimiter }),
        save: async (name) => {
          await saveReplace(datasetId, { filter, replacements, name })
        },
      },
    )
  }

  const sinReglas = payload().length === 0

  return (
    <div className="space-y-3">
      {reglas.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2">
          <Select
            value={r.column}
            onChange={(e) => actualizar(r.id, { column: e.target.value })}
            className="w-40"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={r.mode}
            onChange={(e) => actualizar(r.id, { mode: e.target.value as MatchMode })}
            className="w-32"
          >
            <option value="exact">Valor exacto</option>
            <option value="contains">Contiene</option>
          </Select>
          <Input
            value={r.search}
            onChange={(e) => actualizar(r.id, { search: e.target.value })}
            placeholder="buscar"
            className="w-36"
          />
          <Input
            value={r.replace}
            onChange={(e) => actualizar(r.id, { replace: e.target.value })}
            placeholder="reemplazar por"
            className="w-36"
          />
          {r.mode === "exact" && (
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={r.case_sensitive}
                onChange={(e) => actualizar(r.id, { case_sensitive: e.target.checked })}
              />
              May/min
            </label>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setReglas((prev) => prev.filter((x) => x.id !== r.id))}
            aria-label="Quitar regla"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setReglas((prev) => [...prev, nueva()])}
          disabled={columns.length === 0}
        >
          <Plus className="size-4" />
          Añadir regla
        </Button>
        <Button size="sm" onClick={ejecutar} disabled={sinReglas}>
          <Replace className="size-4" />
          Ver resultado
        </Button>
      </div>
    </div>
  )
}
