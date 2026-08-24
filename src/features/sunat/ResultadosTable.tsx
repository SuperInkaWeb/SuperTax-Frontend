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
  onExportar: () => void
}

export function ResultadosTable({ resultados, onReintentar, reintentando, onExportar }: Props) {
  const hayFaltantes = resultados.some(
    (r) => r.estado === "Parcial" || r.estado.startsWith("Error"),
  )

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Resultados</span>
          <div className="flex gap-2">
            {hayFaltantes && (
              <Button size="sm" variant="ghost" onClick={onReintentar} disabled={reintentando}>
                {reintentando ? "Reintentando…" : "Reintentar faltantes"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onExportar}>
              Exportar Excel
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-2">Comprobante</th>
                <th className="p-2">Emisor</th>
                <th className="p-2">PDF</th>
                <th className="p-2">XML</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r) => (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="p-2 font-medium">{r.id}</td>
                  <td className="p-2">{r.emisor ?? "—"}</td>
                  <td className="p-2">{r.pdf ? "✓" : "—"}</td>
                  <td className="p-2">{r.xml ? "✓" : "—"}</td>
                  <td className="p-2">
                    <Badge tone={tono(r.estado)}>{r.estado}</Badge>
                  </td>
                  <td className="max-w-[24rem] p-2 text-xs text-muted-foreground">
                    {r.descripcion ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
