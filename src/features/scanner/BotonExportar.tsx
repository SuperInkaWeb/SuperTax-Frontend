import { Download, Files } from "lucide-react"
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
  /** Ofrecer también "por documento" (una hoja por archivo). Útil en planillas. */
  porDocumento?: boolean
}

export function BotonExportar({ filas, columnas, camposLabels, porDocumento = false }: Props) {
  const [cargando, setCargando] = useState<"todo" | "documento" | null>(null)
  const vacio = filas.length === 0 || columnas.length === 0

  async function exportar(modo: "todo" | "documento") {
    if (vacio) return
    setCargando(modo)
    try {
      await exportarDocumentosExcel(filas, columnas, camposLabels, modo === "documento")
    } catch (e) {
      toast.error(apiError(e, "No se pudo exportar el Excel"))
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => exportar("todo")}
        disabled={vacio || cargando !== null}
      >
        <Download className="size-4" />
        {cargando === "todo" ? "Generando…" : "Exportar Excel"}
      </Button>
      {porDocumento && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportar("documento")}
          disabled={vacio || cargando !== null}
          title="Una hoja por archivo de origen"
        >
          <Files className="size-4" />
          {cargando === "documento" ? "Generando…" : "Por documento"}
        </Button>
      )}
    </div>
  )
}
