import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"

import type { ResultadoComprobante } from "@/features/sunat/api"

type Tone = "success" | "info" | "danger"

function tono(estado: string): Tone {
  if (estado === "OK") return "success"
  if (estado === "Parcial") return "info"
  return "danger"
}

interface Props {
  resultados: ResultadoComprobante[]
  onReintentar: () => void
  reintentando: boolean
}

export function ResultadosTable({ resultados, onReintentar, reintentando }: Props) {
  const hayFaltantes = resultados.some(
    (r) => r.estado === "Parcial" || r.estado.startsWith("Error"),
  )

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Resultados</span>
          {hayFaltantes && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReintentar}
              disabled={reintentando}
            >
              {reintentando ? "Reintentando…" : "Reintentar faltantes"}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-2">Comprobante</th>
                <th className="p-2">Estado</th>
                <th className="p-2">PDF</th>
                <th className="p-2">XML</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{r.id}</td>
                  <td className="p-2">
                    <Badge tone={tono(r.estado)}>{r.estado}</Badge>
                  </td>
                  <td className="p-2">{r.pdf ? "✓" : "—"}</td>
                  <td className="p-2">{r.xml ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
