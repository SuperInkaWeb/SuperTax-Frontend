import { useState } from "react"

import { STATUS_META, formatBytes, formatRows } from "@/features/datafilter/lib"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"

import type { DatasetSummary } from "@/features/datafilter/types"

interface DatasetListProps {
  datasets: DatasetSummary[]
  selectedId: number | null
  onSelect: (dataset: DatasetSummary) => void
  onDelete: (dataset: DatasetSummary) => void
}

/** Lista de datasets. Eliminar es en dos pasos (el segundo clic, en rojo, confirma). */
export function DatasetList({ datasets, selectedId, onSelect, onDelete }: DatasetListProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  if (datasets.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Nada por aquí. Sube un archivo para empezar.
      </p>
    )
  }

  return (
    <ul className="divide-y">
      {datasets.map((dataset) => {
        const selectable = dataset.status === "ready"
        const isSelected = dataset.id === selectedId
        return (
          <li
            key={dataset.id}
            onClick={() => selectable && onSelect(dataset)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors",
              isSelected ? "bg-accent" : "hover:bg-accent/50",
              selectable ? "cursor-pointer" : "cursor-default",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium" title={dataset.original_filename}>
                  {dataset.original_filename}
                </span>
                <Badge tone={STATUS_META[dataset.status].tone}>
                  {STATUS_META[dataset.status].label}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {dataset.row_count != null ? `${formatRows(dataset.row_count)} filas · ` : ""}
                {formatBytes(dataset.size_bytes)}
              </p>
              {dataset.status === "failed" && dataset.error && (
                <p className="mt-1 text-xs text-destructive">{dataset.error}</p>
              )}
            </div>
            {confirmingId === dataset.id ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white hover:bg-destructive/90"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmingId(null)
                    onDelete(dataset)
                  }}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmingId(null)
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmingId(dataset.id)
                }}
                aria-label={`Eliminar ${dataset.original_filename}`}
              >
                Eliminar
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
