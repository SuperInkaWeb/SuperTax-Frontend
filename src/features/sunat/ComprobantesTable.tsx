import { Card, CardContent } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"

import type { Comprobante } from "@/features/sunat/api"
import type { ColumnDef } from "@tanstack/react-table"

interface Props {
  comprobantes: Comprobante[]
  seleccionados: Set<string>
  onToggle: (id: string) => void
  onToggleTodos: (marcar: boolean) => void
}

export function ComprobantesTable({
  comprobantes,
  seleccionados,
  onToggle,
  onToggleTodos,
}: Props) {
  const todos = comprobantes.length > 0 && comprobantes.every((c) => seleccionados.has(c.id))

  // Columna de selección propia (la API de este componente usa onToggle/onToggleTodos,
  // distinta de la selección interna de DataTable), más las columnas de datos.
  const columnas: ColumnDef<Comprobante>[] = [
    {
      id: "sel",
      header: () => (
        <input
          type="checkbox"
          checked={todos}
          onChange={(e) => onToggleTodos(e.target.checked)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={seleccionados.has(row.original.id)}
          onChange={() => onToggle(row.original.id)}
          aria-label="Seleccionar comprobante"
        />
      ),
    },
    { header: "Comprobante", cell: ({ row }) => <span className="font-medium">{row.original.serie}-{row.original.numero}</span> },
    { header: "Nro Doc Identidad", cell: ({ row }) => row.original.ruc },
    { header: "Tipo", cell: ({ row }) => row.original.tipo },
  ]

  return (
    <Card>
      <CardContent className="p-0">
        <DataTable columns={columnas} data={comprobantes} getRowId={(c) => c.id} />
      </CardContent>
    </Card>
  )
}
