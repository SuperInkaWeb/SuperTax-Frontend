import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

import { cn } from "@/shared/lib/utils"

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  /** Id estable por fila (para selección y keys). */
  getRowId: (row: T) => string
  /** Habilita el orden por columna en cliente. */
  sortable?: boolean
  onRowClick?: (row: T) => void
  /** Selección por casillas (controlada por el padre). */
  selectable?: boolean
  selected?: Set<string>
  onSelectedChange?: (next: Set<string>) => void
}

/**
 * Tabla de datos única para toda la plataforma: motor headless de TanStack Table
 * (orden en cliente opcional) estilada con los tokens del sistema. La paginación
 * la controla el padre (server-side), por eso aquí solo se renderizan las filas.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  sortable,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    enableSorting: Boolean(sortable),
  })

  const rows = table.getRowModel().rows
  const sel = selected ?? new Set<string>()
  const allSelected = rows.length > 0 && rows.every((r) => sel.has(r.id))

  const toggleAll = () => {
    const next = new Set(sel)
    if (allSelected) rows.forEach((r) => next.delete(r.id))
    else rows.forEach((r) => next.add(r.id))
    onSelectedChange?.(next)
  }
  const toggleOne = (id: string) => {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedChange?.(next)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {selectable ? (
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </th>
            ) : null}
            {table.getHeaderGroups()[0]?.headers.map((h) => {
              const canSort = sortable && h.column.getCanSort()
              const dir = h.column.getIsSorted()
              return (
                <th
                  key={h.id}
                  className={cn("px-2 py-2 font-medium", canSort && "cursor-pointer select-none")}
                  onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {dir === "asc" ? <ChevronUp className="size-3" /> : null}
                    {dir === "desc" ? <ChevronDown className="size-3" /> : null}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn("border-b last:border-0", onRowClick && "cursor-pointer hover:bg-accent")}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {selectable ? (
                <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={sel.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label="Seleccionar fila"
                  />
                </td>
              ) : null}
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
