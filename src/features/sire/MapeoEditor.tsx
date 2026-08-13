import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"

import type { AnalisisArchivo, MapeoConfig } from "@/features/sire/api"

interface Props {
  analisis: AnalisisArchivo
  onGuardar: (config: MapeoConfig) => void
  guardando: boolean
}

export function MapeoEditor({ analisis, onGuardar, guardando }: Props) {
  const [columnas, setColumnas] = useState<Record<string, number>>(
    analisis.config.columnas ?? {},
  )

  function asignar(campo: string, idx: number) {
    setColumnas((prev) => {
      const next = { ...prev }
      if (idx < 0) delete next[campo]
      else next[campo] = idx
      return next
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Asigna cada campo a una columna del archivo (los marcados con * son obligatorios).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {analisis.campos.map((c) => (
          <div key={c.campo} className="space-y-1.5">
            <Label htmlFor={`map-${c.campo}`}>
              {c.etiqueta}
              {c.obligatorio ? " *" : ""}
            </Label>
            <Select
              id={`map-${c.campo}`}
              value={columnas[c.campo] ?? -1}
              onChange={(e) => asignar(c.campo, Number(e.target.value))}
            >
              <option value={-1}>— sin asignar —</option>
              {analisis.columnas_archivo.map((col) => (
                <option key={col.idx} value={col.idx}>
                  Columna {col.idx + 1} ({col.muestras.slice(0, 2).join(", ")})
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      <Button
        onClick={() => onGuardar({ ...analisis.config, columnas })}
        disabled={guardando}
      >
        {guardando ? "Guardando…" : "Guardar formato"}
      </Button>
    </div>
  )
}
