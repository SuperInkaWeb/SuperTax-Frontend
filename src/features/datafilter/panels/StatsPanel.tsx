import { useMutation } from "@tanstack/react-query"
import { BarChart3 } from "lucide-react"
import { useState } from "react"

import { columnStats } from "@/features/datafilter/api"
import { formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { ColumnStats, FilterGroup } from "@/features/datafilter/types"

interface PanelProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{valor}</p>
    </div>
  )
}

function num(valor: number | null): string {
  return valor == null ? "—" : valor.toLocaleString("es-PE")
}

export function StatsPanel({ datasetId, columns, filter }: PanelProps) {
  const [column, setColumn] = useState(columns[0] ?? "")

  const ver = useMutation({
    mutationFn: () => columnStats(datasetId, { filter, column }),
  })
  const stats: ColumnStats | undefined = ver.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Select value={column} onChange={(e) => setColumn(e.target.value)} className="w-56">
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Button onClick={() => ver.mutate()} disabled={!column || ver.isPending}>
          <BarChart3 className="size-4" />
          Ver estadísticas
        </Button>
      </div>

      {ver.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : ver.isError ? (
        <p className="text-sm text-destructive">{apiError(ver.error, "No se pudo calcular")}</p>
      ) : stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato label="Filas" valor={num(stats.total)} />
            <Dato label="No vacíos" valor={num(stats.non_null)} />
            <Dato label="Vacíos" valor={num(stats.nulls)} />
            <Dato label="Distintos" valor={num(stats.distinct)} />
            <Dato label="Mínimo" valor={String(stats.minimum ?? "—")} />
            <Dato label="Máximo" valor={String(stats.maximum ?? "—")} />
            {stats.is_numeric && <Dato label="Suma" valor={num(stats.total_sum)} />}
            {stats.is_numeric && <Dato label="Promedio" valor={num(stats.average)} />}
          </div>

          <Card>
            <CardContent className="pt-5">
              <p className="mb-2 text-sm font-medium">Valores más frecuentes</p>
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Valor</th>
                    <th className="p-2 text-right">Frecuencia</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_values.map((t) => (
                    <tr key={t.value} className="border-b last:border-0">
                      <td className="p-2">{t.value}</td>
                      <td className="p-2 text-right tabular-nums">{formatRows(t.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Elige una columna y pulsa “Ver estadísticas”.
        </p>
      )}
    </div>
  )
}
