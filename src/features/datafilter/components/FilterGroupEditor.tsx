import { Plus } from "lucide-react"

import { FilterRow } from "@/features/datafilter/components/FilterRow"
import { createGroup, createLeaf } from "@/features/datafilter/lib/filters"
import { Button } from "@/shared/ui/button"
import { Select } from "@/shared/ui/select"

import type { GroupDraft, NodeDraft } from "@/features/datafilter/lib/filters"
import type { ColumnInfo, Combinator } from "@/features/datafilter/types"

const MAX_DEPTH = 5 // alineado con el límite del backend (evita anidamiento excesivo)

interface FilterGroupEditorProps {
  node: GroupDraft
  datasetId: number
  columns: ColumnInfo[]
  depth: number
  onChange: (node: GroupDraft) => void
  onRemove?: (id: string) => void // ausente en la raíz
}

/** Editor recursivo de un grupo de filtros (conector AND/OR + hijos anidables). */
export function FilterGroupEditor({
  node, datasetId, columns, depth, onChange, onRemove,
}: FilterGroupEditorProps) {
  const firstColumn = columns[0]?.name ?? ""
  const isRoot = depth === 0

  function updateChild(updated: NodeDraft) {
    onChange({
      ...node,
      children: node.children.map((child) => (child.id === updated.id ? updated : child)),
    })
  }

  function removeChild(id: string) {
    onChange({ ...node, children: node.children.filter((child) => child.id !== id) })
  }

  return (
    <div className={isRoot ? "space-y-2" : "space-y-2 rounded-lg border bg-muted/30 p-2"}>
      <div className="flex items-center justify-between gap-2">
        {node.children.length > 1 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Combinar con</span>
            <Select
              className="h-8 w-28"
              value={node.combinator}
              onChange={(e) => onChange({ ...node, combinator: e.target.value as Combinator })}
            >
              <option value="and">Y (todas)</option>
              <option value="or">O (alguna)</option>
            </Select>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">{isRoot ? "" : "Grupo"}</span>
        )}
        {onRemove && (
          <Button size="sm" variant="ghost" onClick={() => onRemove(node.id)}>
            Quitar grupo
          </Button>
        )}
      </div>

      {node.children.length === 0 ? (
        <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
          Grupo vacío: agrega una condición o un subgrupo.
        </p>
      ) : (
        <div className="space-y-2">
          {node.children.map((child) =>
            child.type === "condition" ? (
              <FilterRow
                key={child.id}
                datasetId={datasetId}
                draft={child}
                columns={columns}
                onChange={updateChild}
                onRemove={removeChild}
              />
            ) : (
              <FilterGroupEditor
                key={child.id}
                node={child}
                datasetId={datasetId}
                columns={columns}
                depth={depth + 1}
                onChange={updateChild}
                onRemove={removeChild}
              />
            ),
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange({ ...node, children: [...node.children, createLeaf(firstColumn)] })}
          disabled={columns.length === 0}
        >
          <Plus className="size-4" />
          Condición
        </Button>
        {depth < MAX_DEPTH && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ ...node, children: [...node.children, createGroup()] })}
          >
            <Plus className="size-4" />
            Subgrupo ( )
          </Button>
        )}
      </div>
    </div>
  )
}
