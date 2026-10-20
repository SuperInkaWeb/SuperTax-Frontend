import { Check } from "lucide-react"

import { toneComprobante } from "@/features/sunat/estados"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"

import type { ResultadoComprobante } from "@/features/sunat/api"
import type { ColumnDef } from "@tanstack/react-table"

function Marca({ tiene }: { tiene?: boolean }) {
  return tiene ? <Check className="size-4 text-primary" /> : <span className="text-muted-foreground">—</span>
}

const COLUMNAS: ColumnDef<ResultadoComprobante>[] = [
  { header: "Comprobante", cell: ({ row }) => <span className="font-medium">{row.original.id}</span> },
  { header: "Emisor", cell: ({ row }) => row.original.emisor ?? "—" },
  { header: "PDF", cell: ({ row }) => <Marca tiene={row.original.pdf} /> },
  { header: "XML", cell: ({ row }) => <Marca tiene={row.original.xml} /> },
  { header: "Estado", cell: ({ row }) => <Badge tone={toneComprobante(row.original.estado)}>{row.original.estado}</Badge> },
  {
    header: "Descripción",
    cell: ({ row }) => (
      <span className="block max-w-[24rem] text-xs text-muted-foreground">{row.original.descripcion ?? "—"}</span>
    ),
  },
]

interface Props {
  resultados: ResultadoComprobante[]
  onReintentar: () => void
  reintentando: boolean
  onExportar: () => void
}

export function ResultadosTable({ resultados, onReintentar, reintentando, onExportar }: Props) {
  const hayFaltantes = resultados.some((r) => r.estado === "Parcial" || r.estado.startsWith("Error"))

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Resultados</span>
          <div className="flex gap-2">
            {hayFaltantes ? (
              <Button size="sm" variant="ghost" onClick={onReintentar} disabled={reintentando}>
                {reintentando ? "Reintentando…" : "Reintentar faltantes"}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={onExportar}>
              Exportar Excel
            </Button>
          </div>
        </div>
        <DataTable columns={COLUMNAS} data={resultados} getRowId={(r) => r.id} />
      </CardContent>
    </Card>
  )
}
