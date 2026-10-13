import { X } from "lucide-react"

import { ValuePicker } from "@/features/datafilter/components/ValuePicker"
import { OPERATOR_OPTIONS, operatorValueKind } from "@/features/datafilter/lib/filters"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type { LeafDraft } from "@/features/datafilter/lib/filters"
import type { ColumnInfo, Operator } from "@/features/datafilter/types"

interface FilterRowProps {
  datasetId: number
  draft: LeafDraft
  columns: ColumnInfo[]
  onChange: (draft: LeafDraft) => void
  onRemove: (id: string) => void
}

export function FilterRow({ datasetId, draft, columns, onChange, onRemove }: FilterRowProps) {
  const kind = operatorValueKind(draft.operator)

  return (
    <div className="grid grid-cols-[1fr_1fr_1.2fr_auto] items-center gap-2">
      <Select value={draft.column} onChange={(e) => onChange({ ...draft, column: e.target.value })}>
        {columns.map((column) => (
          <option key={column.name} value={column.name}>
            {column.name}
          </option>
        ))}
      </Select>

      <Select
        value={draft.operator}
        onChange={(e) => onChange({ ...draft, operator: e.target.value as Operator })}
      >
        {OPERATOR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {kind === "none" ? (
        <span className="px-1 text-xs text-muted-foreground">sin valor</span>
      ) : kind === "list" ? (
        <ValuePicker
          datasetId={datasetId}
          column={draft.column}
          selected={draft.values}
          onChange={(values) => onChange({ ...draft, values })}
        />
      ) : (
        <Input
          value={draft.raw}
          placeholder={kind === "range" ? "desde, hasta" : "valor"}
          onChange={(e) => onChange({ ...draft, raw: e.target.value })}
        />
      )}

      <Button
        size="icon"
        variant="ghost"
        onClick={() => onRemove(draft.id)}
        aria-label="Quitar condición"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
