import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Table2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { downloadPivot, pivotPreview, savePivot } from "@/features/datafilter/api"
import { PivotFieldConfig } from "@/features/datafilter/components/PivotFieldConfig"
import { ResultView } from "@/features/datafilter/components/ResultView"
import { useAnalysisResult } from "@/features/datafilter/hooks/useAnalysisResult"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"

import type { Delimiter, DownloadFormat, FilterGroup, Measure } from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

export function PivotPanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const result = useAnalysisResult()
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [measures, setMeasures] = useState<Measure[]>([{ aggregation: "count" }])
  const [pivotColumn, setPivotColumn] = useState("")
  const [percent, setPercent] = useState(false)
  const [descargando, setDescargando] = useState(false)

  const spec = () => ({
    filter,
    group_by: groupBy,
    measures,
    pivot_column: pivotColumn || null,
    percent_of_total: percent,
  })

  function ejecutar() {
    result.run((offset) => pivotPreview(datasetId, { ...spec(), limit: result.limit, offset }))
  }

  const guardar = useMutation({
    mutationFn: (name: string) => savePivot(datasetId, { ...spec(), name }),
    onSuccess: () => {
      toast.success("Guardando… aparecerá en Datasets al terminar")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar")),
  })

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadPivot(datasetId, { ...spec(), format, delimiter })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
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
        <Button onClick={ejecutar} disabled={invalido || result.loading}>
          <Table2 className="size-4" />
          Ver reporte
        </Button>
      </div>

      <ResultView
        result={result}
        sortable={false}
        onDownload={descargar}
        downloading={descargando}
        onSave={(name) => guardar.mutate(name)}
        saving={guardar.isPending}
        placeholder="Arrastra campos a Filas/Columnas/Valores y pulsa “Ver reporte”."
      />
    </div>
  )
}
