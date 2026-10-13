import { cleanNumber, formatRows } from "@/features/datafilter/lib"
import { Button } from "@/shared/ui/button"

import type { SortDirection } from "@/features/datafilter/types"

export interface ResultSort {
  column: string
  direction: SortDirection
}

function indicador(column: string, sort: ResultSort | null): string {
  if (!sort || sort.column !== column) return "↕"
  return sort.direction === "asc" ? "▲" : "▼"
}

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return "—"
  if (typeof valor === "number") return cleanNumber(valor)
  return String(valor)
}

function totalCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  if (typeof valor === "number") return cleanNumber(valor)
  return String(valor)
}

interface DataTableProps {
  columns: string[]
  rows: Array<Record<string, unknown>>
  total: number
  limit: number
  offset: number
  loading?: boolean
  onPageChange: (offset: number) => void
  totalsRow?: Record<string, unknown> | null
  totalsLabel?: string
  totalOriginal?: number | null
  sort?: ResultSort | null
  onSort?: (column: string) => void
}

/** Tabla paginada de solo lectura para resultados de análisis (orden, totales). */
export function DataTable({
  columns, rows, total, limit, offset, loading, onPageChange,
  totalsRow, totalsLabel = "Total general", totalOriginal, sort, onSort,
}: DataTableProps) {
  const desde = total === 0 ? 0 : offset + 1
  const hasta = Math.min(offset + limit, total)
  const quitadas = totalOriginal != null ? totalOriginal - total : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{formatRows(total)}</strong> filas
          {totalOriginal != null && (
            <span> · quitó {formatRows(quitadas)} de {formatRows(totalOriginal)}</span>
          )}
        </span>
        <span>
          {formatRows(desde)}–{formatRows(hasta)}
        </span>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              {columns.map((c) => (
                <th
                  key={c}
                  className="sticky top-0 z-10 whitespace-nowrap border-b bg-muted/50 px-3 py-2 font-medium text-muted-foreground"
                >
                  {onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(c)}
                      title="Ordenar por esta columna"
                      className="flex w-full items-center justify-between gap-1.5 hover:text-foreground"
                    >
                      <span className="truncate">{c}</span>
                      <span className="text-[10px] opacity-60">{indicador(c, sort ?? null)}</span>
                    </button>
                  ) : (
                    c
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="odd:bg-background even:bg-muted/20">
                  {columns.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-1.5 tabular-nums">
                      {celda(row[c])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totalsRow && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted font-semibold">
                {columns.map((c, i) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2 tabular-nums">
                    {i === 0 && !(c in totalsRow) ? totalsLabel : totalCelda(totalsRow[c])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={offset === 0 || loading}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={offset + limit >= total || loading}
          onClick={() => onPageChange(offset + limit)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
