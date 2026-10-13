import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"

import { Select } from "@/shared/ui/select"

import type { Aggregation, Measure } from "@/features/datafilter/types"
import type { DragEndEvent } from "@dnd-kit/core"
import type { Dispatch, ReactNode, SetStateAction } from "react"

const AGGREGATIONS: Array<{ value: Aggregation; label: string }> = [
  { value: "count", label: "Conteo" },
  { value: "count_distinct", label: "Conteo único" },
  { value: "sum", label: "Suma" },
  { value: "avg", label: "Promedio" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
]

function FieldChip({ name }: { name: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: name })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={
        "cursor-grab touch-none rounded-md border bg-background px-2 py-1 text-xs hover:border-primary active:cursor-grabbing " +
        (isDragging ? "opacity-60" : "")
      }
    >
      {name}
    </button>
  )
}

function ZoneChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Quitar ${label}`} className="hover:text-destructive">
        ×
      </button>
    </span>
  )
}

function DropZone({
  id, title, hint, empty, children,
}: {
  id: string
  title: string
  hint: string
  empty: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium">{title}</span>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div
        ref={setNodeRef}
        className={
          "flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-dashed p-1.5 " +
          (isOver ? "border-primary bg-primary/5" : "border-input bg-background")
        }
      >
        {empty ? (
          <span className="px-1 text-[11px] text-muted-foreground">Arrastra un campo aquí</span>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

interface PivotFieldConfigProps {
  columns: string[]
  groupBy: string[]
  setGroupBy: Dispatch<SetStateAction<string[]>>
  measures: Measure[]
  setMeasures: Dispatch<SetStateAction<Measure[]>>
  pivotColumn: string
  setPivotColumn: Dispatch<SetStateAction<string>>
}

/** Configuración del pivote arrastrando campos a las zonas (Filas/Columnas/Valores). */
export function PivotFieldConfig({
  columns, groupBy, setGroupBy, measures, setMeasures, pivotColumn, setPivotColumn,
}: PivotFieldConfigProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(event: DragEndEvent) {
    const name = String(event.active.id)
    const zone = event.over?.id
    if (!zone) return
    if (zone === "rows") {
      setGroupBy((cur) => (cur.includes(name) ? cur : [...cur, name]))
    } else if (zone === "cols") {
      setPivotColumn(name)
    } else if (zone === "values") {
      setMeasures((cur) => [...cur, { column: name, aggregation: "sum" }])
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-muted/30 p-2">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Campos</p>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((name) => (
              <FieldChip key={name} name={name} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Arrastra un campo a una zona.</p>
        </div>

        <div className="space-y-2">
          <DropZone id="rows" title="Filas" hint="agrupar por" empty={groupBy.length === 0}>
            {groupBy.map((name) => (
              <ZoneChip
                key={name}
                label={name}
                onRemove={() => setGroupBy((cur) => cur.filter((item) => item !== name))}
              />
            ))}
          </DropZone>

          <DropZone id="cols" title="Columnas" hint="cross-tab · una" empty={!pivotColumn}>
            {pivotColumn && <ZoneChip label={pivotColumn} onRemove={() => setPivotColumn("")} />}
          </DropZone>

          <DropZone id="values" title="Valores" hint="métricas" empty={measures.length === 0}>
            {measures.map((measure, index) => (
              <span key={index} className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5">
                <Select
                  className="h-6 w-24 text-xs"
                  value={measure.aggregation}
                  onChange={(e) =>
                    setMeasures((cur) =>
                      cur.map((item, i) =>
                        i === index ? { ...item, aggregation: e.target.value as Aggregation } : item,
                      ),
                    )
                  }
                >
                  {AGGREGATIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <span className="text-xs">{measure.column ?? "filas"}</span>
                <button
                  type="button"
                  onClick={() => setMeasures((cur) => cur.filter((_, i) => i !== index))}
                  aria-label="Quitar métrica"
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setMeasures((cur) => [...cur, { aggregation: "count" }])}
              className="rounded-md border border-dashed border-input px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary"
            >
              + Conteo de filas
            </button>
          </DropZone>
        </div>
      </div>
    </DndContext>
  )
}
