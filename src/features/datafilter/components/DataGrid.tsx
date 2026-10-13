import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useRef, useState } from "react"

import { MAX_SHEET_ROWS, useSheetData } from "@/features/datafilter/hooks/useSheetData"
import { formatRows } from "@/features/datafilter/lib"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

import type { FilterGroup, SortSpec } from "@/features/datafilter/types"

const ROW_HEIGHT = 32
const COL_WIDTH = 160

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  if (typeof valor === "boolean") return valor ? "verdadero" : "falso"
  return String(valor)
}

function indicador(column: string, sort: SortSpec | null): string {
  if (!sort || sort.column !== column) return "↕"
  return sort.direction === "asc" ? "▲" : "▼"
}

interface DataGridProps {
  datasetId: number
  filter: FilterGroup | null
  sort: SortSpec | null
  search: string
  onSort: (column: string) => void
}

/** Grilla virtualizada de datos: scroll fluido sobre millones de filas (windowing). */
export function DataGrid({ datasetId, filter, sort, search, onSort }: DataGridProps) {
  const [bloque, setBloque] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { columns, total, rowCount, capped, loading, error, getRow, ensureRange } = useSheetData(
    datasetId, filter, sort, true, search, bloque * MAX_SHEET_ROWS,
  )

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })
  const items = virtualizer.getVirtualItems()

  useEffect(() => {
    if (items.length > 0) ensureRange(items[0].index, items[items.length - 1].index)
  }, [items, ensureRange])

  // Vuelve arriba al cambiar filtro/orden/búsqueda.
  const resetKey = `${datasetId}|${JSON.stringify(filter)}|${sort?.column ?? ""}:${sort?.direction ?? ""}|${search}`
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [resetKey])

  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>
  if (loading && columns.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }
  if (columns.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
  }

  const anchoTabla = columns.length * COL_WIDTH

  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        className="relative h-[32rem] overflow-auto rounded-lg border"
        style={{ contain: "strict" }}
      >
        <div style={{ width: anchoTabla, minWidth: "100%" }}>
          {/* Encabezado sticky */}
          <div
            className="sticky top-0 z-10 flex border-b bg-muted/50 text-sm font-medium text-muted-foreground"
          >
            {columns.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onSort(c)}
                title="Ordenar por esta columna"
                className="flex items-center justify-between gap-1.5 border-r px-3 py-2 hover:text-foreground"
                style={{ width: COL_WIDTH }}
              >
                <span className="truncate">{c}</span>
                <span className="text-[10px] opacity-60">{indicador(c, sort)}</span>
              </button>
            ))}
          </div>
          {/* Cuerpo virtualizado */}
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {items.map((item) => {
              const row = getRow(item.index)
              return (
                <div
                  key={item.key}
                  className="absolute left-0 flex border-b text-sm odd:bg-background even:bg-muted/20"
                  style={{ top: item.start, height: ROW_HEIGHT, width: anchoTabla }}
                >
                  {columns.map((c) => (
                    <div
                      key={c}
                      className="truncate border-r px-3 py-1.5 tabular-nums"
                      style={{ width: COL_WIDTH }}
                      title={row ? celda(row[c]) : ""}
                    >
                      {row ? celda(row[c]) : "…"}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{formatRows(total)} coincidencias</span>
        {capped && (
          <div className="flex items-center gap-2">
            <span>
              Bloque {bloque + 1} (hasta {formatRows(MAX_SHEET_ROWS)} filas por bloque)
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={bloque === 0}
              onClick={() => setBloque((b) => Math.max(0, b - 1))}
            >
              Bloque anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={total != null && (bloque + 1) * MAX_SHEET_ROWS >= total}
              onClick={() => setBloque((b) => b + 1)}
            >
              Bloque siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
