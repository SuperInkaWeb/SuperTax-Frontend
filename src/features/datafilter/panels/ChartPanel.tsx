import { useMutation } from "@tanstack/react-query"
import { BarChartHorizontal } from "lucide-react"
import { useState } from "react"

import { pivotPreview } from "@/features/datafilter/api"
import { cleanNumber, formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { Aggregation, FilterGroup } from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

const TOP_OPTIONS = [10, 20, 30, 50]
const AGGREGATIONS: Array<{ value: Aggregation; label: string }> = [
  { value: "count", label: "Conteo de filas" },
  { value: "sum", label: "Suma" },
  { value: "avg", label: "Promedio" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
  { value: "count_distinct", label: "Conteo único" },
]

interface ChartData {
  title: string
  measureLabel: string
  bars: Array<{ label: string; value: number }>
}

/** Gráfico de barras del top-N de una categoría por una métrica (reutiliza el pivote). */
export function ChartPanel({ datasetId, columns, filter }: PanelProps) {
  const [category, setCategory] = useState(columns[0] ?? "")
  const [aggregation, setAggregation] = useState<Aggregation>("count")
  const [measureColumn, setMeasureColumn] = useState("")
  const [topN, setTopN] = useState(20)
  const [error, setError] = useState<string | null>(null)

  const needsColumn = aggregation !== "count"

  const generar = useMutation({
    mutationFn: async (): Promise<ChartData> => {
      const response = await pivotPreview(datasetId, {
        filter,
        group_by: [category],
        measures: [{ aggregation, column: needsColumn ? measureColumn : null }],
        pivot_column: null,
        sort: { measure_index: 0, direction: "desc" },
        limit: topN,
        offset: 0,
      })
      const [labelKey, valueKey] = response.columns
      const bars = response.rows.map((row) => ({
        label: row[labelKey] == null ? "(vacío)" : String(row[labelKey]),
        value: Number(row[valueKey]) || 0,
      }))
      const measureLabel = needsColumn
        ? `${AGGREGATIONS.find((a) => a.value === aggregation)?.label} de ${measureColumn}`
        : "Conteo de filas"
      return { title: `${measureLabel} por ${category}`, measureLabel, bars }
    },
    onError: (e) => setError(apiError(e, "No se pudo generar el gráfico")),
  })

  function alGenerar() {
    if (!category) return setError("Elige una categoría.")
    if (needsColumn && !measureColumn) return setError("Elige la columna de la métrica.")
    setError(null)
    generar.mutate()
  }

  const chart = generar.data
  const maxValue = chart && chart.bars.length > 0 ? Math.max(...chart.bars.map((b) => b.value)) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Categoría (eje)</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1">
            {columns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Métrica</Label>
          <Select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value as Aggregation)}
            className="mt-1"
          >
            {AGGREGATIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Columna</Label>
          <Select
            value={measureColumn}
            disabled={!needsColumn}
            onChange={(e) => setMeasureColumn(e.target.value)}
            className="mt-1"
          >
            <option value="">{needsColumn ? "Elige columna…" : "(no aplica)"}</option>
            {columns.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Mostrar</Label>
          <Select value={topN} onChange={(e) => setTopN(Number(e.target.value))} className="mt-1">
            {TOP_OPTIONS.map((o) => (
              <option key={o} value={o}>
                Top {o}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Button onClick={alGenerar} disabled={generar.isPending}>
        <BarChartHorizontal className="size-4" />
        Generar gráfico
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {generar.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : chart ? (
        <div>
          <p className="mb-3 text-sm font-medium">{chart.title}</p>
          {chart.bars.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin datos para graficar.</p>
          ) : (
            <ul className="space-y-2">
              {chart.bars.map((bar, index) => (
                <li key={`${bar.label}-${index}`} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-xs" title={bar.label}>
                    {bar.label}
                  </span>
                  <span className="relative h-5 flex-1 overflow-hidden rounded bg-muted">
                    <span
                      className="absolute inset-y-0 left-0 rounded bg-primary/80"
                      style={{ width: `${maxValue > 0 ? (Math.max(bar.value, 0) / maxValue) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {cleanNumber(bar.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            {formatRows(chart.bars.length)} categorías · {chart.measureLabel}
          </p>
        </div>
      ) : null}
    </div>
  )
}
