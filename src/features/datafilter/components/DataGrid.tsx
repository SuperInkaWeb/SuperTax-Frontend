import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useMemo, useRef, useState } from "react"

import { MAX_SHEET_ROWS, useSheetData } from "@/features/datafilter/hooks/useSheetData"
import { formatRows } from "@/features/datafilter/lib"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

import type { FilterGroup, SortSpec } from "@/features/datafilter/types"

const ROW_HEIGHT = 32
const COL_WIDTH = 160
// Tope de celdas a agregar en una selección (evita recorrer rangos gigantes).
const MAX_SELECTION_AGG = 50_000

interface Cell {
  row: number
  col: number
}

interface SelectionStats {
  count: number // celdas no vacías seleccionadas
  sum: number | null // suma de las numéricas (null si no hay)
  average: number | null
}

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  if (typeof valor === "boolean") return valor ? "verdadero" : "falso"
  return String(valor)
}

function indicador(column: string, sort: SortSpec | null): string {
  if (!sort || sort.column !== column) return "↕"
  return sort.direction === "asc" ? "▲" : "▼"
}

/** 2 decimales como máximo, sin ruido de coma flotante. */
function formatDecimal(value: number): string {
  return value.toLocaleString("es-PE", { maximumFractionDigits: 2 })
}

interface DataGridProps {
  datasetId: number
  filter: FilterGroup | null
  sort: SortSpec | null
  search: string
  onSort: (column: string) => void
}

/** Grilla virtualizada con selección de celdas (recuento/suma/promedio tipo Excel). */
export function DataGrid({ datasetId, filter, sort, search, onSort }: DataGridProps) {
  const [bloque, setBloque] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<Cell | null>(null)
  const [active, setActive] = useState<Cell | null>(null)

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

  // Al cambiar filtro/orden/búsqueda/bloque: vuelve arriba y limpia la selección.
  const resetKey = `${datasetId}|${JSON.stringify(filter)}|${sort?.column ?? ""}:${sort?.direction ?? ""}|${search}|${bloque}`
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setAnchor(null)
    setActive(null)
  }, [resetKey])

  function selectCell(row: number, col: number, extend: boolean) {
    setActive({ row, col })
    if (!extend || !anchor) setAnchor({ row, col })
  }

  const rect =
    anchor && active
      ? {
          r0: Math.min(anchor.row, active.row),
          r1: Math.max(anchor.row, active.row),
          c0: Math.min(anchor.col, active.col),
          c1: Math.max(anchor.col, active.col),
        }
      : null

  const selection = useMemo<SelectionStats | null>(() => {
    if (!rect) return null
    const area = (rect.r1 - rect.r0 + 1) * (rect.c1 - rect.c0 + 1)
    if (area <= 1 || area > MAX_SELECTION_AGG) return null
    let count = 0
    let sum = 0
    let numeric = 0
    for (let r = rect.r0; r <= rect.r1; r += 1) {
      const row = getRow(r)
      if (!row) continue
      for (let c = rect.c0; c <= rect.c1; c += 1) {
        const value = row[columns[c]]
        if (value === null || value === undefined || value === "") continue
        count += 1
        if (typeof value !== "boolean") {
          const parsed = typeof value === "number" ? value : Number(value)
          if (!Number.isNaN(parsed)) {
            sum += parsed
            numeric += 1
          }
        }
      }
    }
    return { count, sum: numeric > 0 ? sum : null, average: numeric > 0 ? sum / numeric : null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect?.r0, rect?.r1, rect?.c0, rect?.c1, columns, getRow])

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
          {/* Encabezado sticky (ordenable) */}
          <div className="sticky top-0 z-10 flex border-b bg-muted/50 text-sm font-medium text-muted-foreground">
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
          {/* Cuerpo virtualizado con celdas seleccionables */}
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {items.map((item) => {
              const row = getRow(item.index)
              return (
                <div
                  key={item.key}
                  className="absolute left-0 flex border-b text-sm"
                  style={{ top: item.start, height: ROW_HEIGHT, width: anchoTabla }}
                >
                  {columns.map((c, colIndex) => {
                    const inRange =
                      rect !== null &&
                      item.index >= rect.r0 && item.index <= rect.r1 &&
                      colIndex >= rect.c0 && colIndex <= rect.c1
                    const isActive = active?.row === item.index && active?.col === colIndex
                    return (
                      <div
                        key={c}
                        onClick={(e) => selectCell(item.index, colIndex, e.shiftKey)}
                        className={cn(
                          "cursor-cell truncate border-r px-3 py-1.5 tabular-nums",
                          isActive
                            ? "z-10 bg-primary/10 ring-2 ring-inset ring-primary"
                            : inRange
                              ? "bg-primary/10"
                              : "bg-background",
                        )}
                        style={{ width: COL_WIDTH }}
                        title={row ? celda(row[c]) : ""}
                      >
                        {row ? celda(row[c]) : "…"}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Barra de estado: total + agregados de la selección (estilo Excel) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{formatRows(total)} coincidencias</span>
        {selection && (
          <span className="flex flex-wrap items-center gap-3">
            <span>Recuento: <strong className="text-foreground">{formatRows(selection.count)}</strong></span>
            {selection.sum != null && (
              <span>Suma: <strong className="text-foreground">{formatDecimal(selection.sum)}</strong></span>
            )}
            {selection.average != null && (
              <span>Promedio: <strong className="text-foreground">{formatDecimal(selection.average)}</strong></span>
            )}
          </span>
        )}
        {capped && (
          <span className="flex items-center gap-2">
            <span>Bloque {bloque + 1} (hasta {formatRows(MAX_SHEET_ROWS)} por bloque)</span>
            <Button size="sm" variant="outline" disabled={bloque === 0} onClick={() => setBloque((b) => Math.max(0, b - 1))}>
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
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Haz clic en una celda y mantén Shift para seleccionar un rango y ver recuento, suma y promedio.
      </p>
    </div>
  )
}
