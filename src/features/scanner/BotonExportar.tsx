import { Download } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { exportarDocumentosExcel } from "@/features/scanner/api"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"

interface Props {
  /** Filas ya aplanadas: cada una con `archivo` + los campos/columnas. */
  filas: Record<string, unknown>[]
  columnas: string[]
  camposLabels: Record<string, string>
}

export function BotonExportar({ filas, columnas, camposLabels }: Props) {
  const [cargando, setCargando] = useState(false)
  const vacio = filas.length === 0 || columnas.length === 0

  async function exportar() {
    if (vacio) return
    setCargando(true)
    try {
      await exportarDocumentosExcel(filas, columnas, camposLabels)
    } catch (e) {
      toast.error(apiError(e, "No se pudo exportar el Excel"))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={exportar} disabled={vacio || cargando}>
      <Download className="size-4" />
      {cargando ? "Generando…" : "Exportar Excel"}
    </Button>
  )
}
