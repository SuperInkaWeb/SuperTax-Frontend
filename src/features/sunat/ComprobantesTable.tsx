import { Card, CardContent } from "@/shared/ui/card"

import type { Comprobante } from "@/features/sunat/api"

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
  const todos =
    comprobantes.length > 0 && comprobantes.every((c) => seleccionados.has(c.id))

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={todos}
                  onChange={(e) => onToggleTodos(e.target.checked)}
                />
              </th>
              <th className="p-3">Comprobante</th>
              <th className="p-3">RUC emisor</th>
              <th className="p-3">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {comprobantes.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(c.id)}
                    onChange={() => onToggle(c.id)}
                  />
                </td>
                <td className="p-3 font-medium">
                  {c.serie}-{c.numero}
                </td>
                <td className="p-3">{c.ruc}</td>
                <td className="p-3">{c.tipo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
