/** Tabla de solo lectura para vistas previas (filtrado, análisis, pivote). */

function celda(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—"
  return String(valor)
}

interface PreviewTableProps {
  columns: string[]
  rows: Array<Record<string, unknown>>
  /** Fila fija de Total general al pie (pivote); opcional. */
  totals?: Record<string, unknown> | null
}

export function PreviewTable({ columns, rows, totals }: PreviewTableProps) {
  if (columns.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Sin columnas para mostrar.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap p-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {columns.map((c) => (
                <td key={c} className="whitespace-nowrap p-2 tabular-nums">
                  {celda(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot className="border-t-2 font-medium">
            <tr>
              {columns.map((c, i) => (
                <td key={c} className="whitespace-nowrap p-2 tabular-nums">
                  {i === 0 && !(c in totals) ? "Total" : celda(totals[c])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
