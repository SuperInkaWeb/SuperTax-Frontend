import { Download } from "lucide-react"

import { valorCampo } from "@/features/scanner/filas"
import { Button } from "@/shared/ui/button"

interface Props {
  /** Filas ya aplanadas: cada una con `archivo` + los campos/columnas. */
  filas: Record<string, unknown>[]
  columnas: string[]
  camposLabels: Record<string, string>
}

function escapar(v: string): string {
  return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v
}

export function BotonExportar({ filas, columnas, camposLabels }: Props) {
  const vacio = filas.length === 0 || columnas.length === 0

  function exportar() {
    if (vacio) return
    const cabecera = ["Archivo", ...columnas.map((c) => camposLabels[c] ?? c)].join(",")
    const cuerpo = filas.map((f) =>
      [
        escapar(valorCampo(f.archivo)),
        ...columnas.map((c) => escapar(valorCampo(f[c]))),
      ].join(","),
    )
    const csv = [cabecera, ...cuerpo].join("\r\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `documentos_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button size="sm" variant="outline" onClick={exportar} disabled={vacio}>
      <Download className="size-4" />
      Exportar CSV
    </Button>
  )
}
