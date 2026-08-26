import { valorCampo } from "@/features/scanner/filas"

import type { FilaRegistro } from "@/features/scanner/filas"

interface Props {
  filas: FilaRegistro[]
  columnas: string[]
  camposLabels: Record<string, string>
}

/** Tabla de documentos multi-registro (asistencia, boleta de pago): una fila por
 *  registro, con el archivo de origen. Solo lectura. */
export function TablaRegistros({ filas, columnas, camposLabels }: Props) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin registros.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="p-2 font-medium">Archivo</th>
            {columnas.map((c) => (
              <th key={c} className="whitespace-nowrap p-2 font-medium">
                {camposLabels[c] ?? c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={`${f.docId}-${i}`} className="border-b align-top last:border-0 hover:bg-muted/40">
              <td className="max-w-[180px] truncate p-2 text-xs text-muted-foreground" title={f.archivo}>
                {f.archivo}
              </td>
              {columnas.map((c) => (
                <td key={c} className="p-2">
                  {valorCampo(f[c]) || <span className="text-muted-foreground/40">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
