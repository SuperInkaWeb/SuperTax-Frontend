import { Table2 } from "lucide-react"
import { useState } from "react"

import { downloadPivot, pivotPreview, savePivot } from "@/features/datafilter/api"
import { PivotFieldConfig } from "@/features/datafilter/components/PivotFieldConfig"
import { Button } from "@/shared/ui/button"

import type { ToolProps } from "@/features/datafilter/components/tool"
import type { Measure } from "@/features/datafilter/types"

const LIMIT = 100

/** Configuración de la tabla dinámica (el reporte se muestra al centro). */
export function PivotPanel({ datasetId, columns, filter, onPreview }: ToolProps) {
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [measures, setMeasures] = useState<Measure[]>([{ aggregation: "count" }])
  const [pivotColumn, setPivotColumn] = useState("")
  const [percent, setPercent] = useState(false)

  const spec = () => ({
    filter,
    group_by: groupBy,
    measures,
    pivot_column: pivotColumn || null,
    percent_of_total: percent,
  })

  function ejecutar() {
    const base = spec()
    onPreview(
      (offset) => pivotPreview(datasetId, { ...base, limit: LIMIT, offset }),
      {
        countLabel: "filas agrupadas",
        sortable: false,
        totalsLabel: "Total general",
        download: (format, delimiter) => downloadPivot(datasetId, { ...base, format, delimiter }),
        save: async (name) => {
          await savePivot(datasetId, { ...base, name })
        },
      },
    )
  }

  const invalido = groupBy.length === 0 || measures.length === 0

  return (
    <div className="space-y-4">
      <PivotFieldConfig
        columns={columns}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        measures={measures}
        setMeasures={setMeasures}
        pivotColumn={pivotColumn}
        setPivotColumn={setPivotColumn}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={percent} onChange={(e) => setPercent(e.target.checked)} />
          % del total (Suma/Conteo)
        </label>
        <Button onClick={ejecutar} disabled={invalido}>
          <Table2 className="size-4" />
          Ver reporte
        </Button>
      </div>
    </div>
  )
}
