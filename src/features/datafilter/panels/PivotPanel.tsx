import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Table2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { downloadPivot, pivotPreview, savePivot } from "@/features/datafilter/api"
import { ResultView } from "@/features/datafilter/components/ResultView"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Select } from "@/shared/ui/select"

import type {
  Aggregation,
  Delimiter,
  DownloadFormat,
  FilterGroup,
  Measure,
  PivotResponse,
} from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

const AGREGACIONES: Array<{ value: Aggregation; label: string }> = [
  { value: "count", label: "Conteo" },
  { value: "count_distinct", label: "Únicos" },
  { value: "sum", label: "Suma" },
  { value: "avg", label: "Promedio" },
  { value: "min", label: "Mínimo" },
  { value: "max", label: "Máximo" },
]

interface MedidaUI {
  id: number
  aggregation: Aggregation
  column: string // "" = sin columna (solo válido para Conteo)
}

let contador = 0
const PAGINA = 100

export function PivotPanel({ datasetId, columns, filter }: PanelProps) {
  const queryClient = useQueryClient()
  const [groupBy, setGroupBy] = useState<string[]>(columns[0] ? [columns[0]] : [])
  const [medidas, setMedidas] = useState<MedidaUI[]>([
    { id: contador++, aggregation: "count", column: "" },
  ])
  const [pivotColumn, setPivotColumn] = useState("")
  const [percent, setPercent] = useState(false)
  const [descargando, setDescargando] = useState(false)

  function alternarGrupo(col: string) {
    setGroupBy((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))
  }
  function actualizarMedida(id: number, cambios: Partial<MedidaUI>) {
    setMedidas((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)))
  }

  const measures = (): Measure[] =>
    medidas.map((m) => ({ aggregation: m.aggregation, column: m.column || null }))

  const spec = () => ({
    filter,
    group_by: groupBy,
    measures: measures(),
    pivot_column: pivotColumn || null,
    percent_of_total: percent,
  })

  const ver = useMutation({
    mutationFn: () => pivotPreview(datasetId, { ...spec(), limit: PAGINA, offset: 0 }),
  })
  const res: PivotResponse | undefined = ver.data

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

  const invalido = groupBy.length === 0 || medidas.length === 0

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Agrupar por</p>
          <div className="flex flex-wrap gap-2">
            {columns.map((c) => (
              <label
                key={c}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={groupBy.includes(c)}
                  onChange={() => alternarGrupo(c)}
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Métricas</p>
          {medidas.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2">
              <Select
                value={m.aggregation}
                onChange={(e) => actualizarMedida(m.id, { aggregation: e.target.value as Aggregation })}
                className="w-36"
              >
                {AGREGACIONES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
              <Select
                value={m.column}
                onChange={(e) => actualizarMedida(m.id, { column: e.target.value })}
                className="w-44"
              >
                <option value="">— (filas, solo Conteo)</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setMedidas((prev) => prev.filter((x) => x.id !== m.id))}
                aria-label="Quitar métrica"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setMedidas((prev) => [...prev, { id: contador++, aggregation: "sum", column: columns[0] ?? "" }])
            }
          >
            <Plus className="size-4" />
            Añadir métrica
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Columnas (cross-tab):
            <Select
              value={pivotColumn}
              onChange={(e) => setPivotColumn(e.target.value)}
              className="w-44"
            >
              <option value="">Ninguna</option>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={percent} onChange={(e) => setPercent(e.target.checked)} />
            % del total (Suma/Conteo)
          </label>
          <Button onClick={() => ver.mutate()} disabled={invalido || ver.isPending}>
            <Table2 className="size-4" />
            Ver reporte
          </Button>
        </div>
      </div>

      <ResultView
        loading={ver.isPending}
        error={ver.isError ? apiError(ver.error, "No se pudo generar el reporte") : null}
        columns={res?.columns ?? []}
        rows={res?.rows ?? []}
        total={res?.total_matched ?? null}
        totals={res?.totals}
        countLabel="filas agrupadas"
        onDownload={descargar}
        downloading={descargando}
        onSave={(name) => guardar.mutate(name)}
        saving={guardar.isPending}
        placeholder="Elige agrupación y métricas, luego pulsa “Ver reporte”."
      />
    </div>
  )
}
