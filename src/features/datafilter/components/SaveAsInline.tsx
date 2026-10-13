import { Save } from "lucide-react"
import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"

interface SaveAsInlineProps {
  onSave: (name: string) => void
  pending?: boolean
}

/** Guardar el resultado como dataset nuevo: pide un nombre y confirma. */
export function SaveAsInline({ onSave, pending }: SaveAsInlineProps) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState("")

  if (!abierto) {
    return (
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <Save className="size-4" />
        Guardar como dataset
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del dataset"
        className="w-56"
        autoFocus
      />
      <Button
        disabled={pending || nombre.trim() === ""}
        onClick={() => {
          onSave(nombre.trim())
          setAbierto(false)
          setNombre("")
        }}
      >
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      <Button variant="ghost" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
    </div>
  )
}
