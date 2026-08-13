import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

interface Props {
  campos: Record<string, unknown>
  onGuardar: (campos: Record<string, unknown>) => void
  guardando: boolean
}

function esEscalar(v: unknown): boolean {
  return v === null || typeof v !== "object"
}

export function CamposEditor({ campos, onGuardar, guardando }: Props) {
  const escalares = Object.entries(campos).filter(([, v]) => esEscalar(v))
  const complejos = Object.entries(campos).filter(([, v]) => !esEscalar(v))

  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(escalares.map(([k, v]) => [k, v == null ? "" : String(v)])),
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {escalares.map(([k]) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`campo-${k}`}>{k}</Label>
            <Input
              id={`campo-${k}`}
              value={valores[k] ?? ""}
              onChange={(e) => setValores((prev) => ({ ...prev, [k]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {complejos.map(([k, v]) => (
        <div key={k} className="space-y-1.5">
          <Label>{k}</Label>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(v, null, 2)}
          </pre>
        </div>
      ))}

      <Button onClick={() => onGuardar(valores)} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar campos"}
      </Button>
    </div>
  )
}
