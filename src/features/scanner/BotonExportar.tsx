import { Download } from "lucide-react"

import { valorCampo } from "@/features/scanner/filas"
import { Button } from "@/shared/ui/button"

import type { Documento } from "@/features/scanner/api"

interface Props {
  docs: Documento[]
  columnas: string[]
  camposLabels: Record<string, string>
}

function escapar(v: string): string {
  return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v
}

export function BotonExportar({ docs, columnas, camposLabels }: Props) {
  function exportar() {
    if (!docs.length || !columnas.length) return
    const cabecera = ["archivo", ...columnas.map((c) => camposLabels[c] ?? c)].join(",")
    const filas = docs.map((d) =>
      [escapar(d.nombre_archivo), ...columnas.map((c) => escapar(valorCampo(d.campos[c])))].join(","),
    )
    const csv = [cabecera, ...filas].join("\r\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `documentos_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button size="sm" variant="outline" onClick={exportar} disabled={!docs.length || !columnas.length}>
      <Download className="size-4" />
      Exportar CSV
    </Button>
  )
}
