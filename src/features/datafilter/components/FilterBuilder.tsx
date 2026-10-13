import { Filter } from "lucide-react"
import { useState } from "react"

import { FilterGroupEditor } from "@/features/datafilter/components/FilterGroupEditor"
import { createGroup, rootToFilter } from "@/features/datafilter/lib/filters"
import { Button } from "@/shared/ui/button"

import type { GroupDraft } from "@/features/datafilter/lib/filters"
import type { ColumnInfo, FilterGroup } from "@/features/datafilter/types"

interface FilterBuilderProps {
  datasetId: number
  columns: ColumnInfo[]
  onApply: (filter: FilterGroup | null) => void
}

/** Constructor de filtros con grupos anidables (AND/OR) y selector de valores. */
export function FilterBuilder({ datasetId, columns, onApply }: FilterBuilderProps) {
  const [root, setRoot] = useState<GroupDraft>(createGroup)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="size-4" />
        Filtros
      </div>
      <FilterGroupEditor
        node={root}
        datasetId={datasetId}
        columns={columns}
        depth={0}
        onChange={setRoot}
      />
      <div className="flex gap-2 border-t pt-3">
        <Button size="sm" onClick={() => onApply(rootToFilter(root, columns))}>
          Aplicar filtros
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setRoot(createGroup())
            onApply(null)
          }}
        >
          Limpiar
        </Button>
      </div>
    </div>
  )
}
