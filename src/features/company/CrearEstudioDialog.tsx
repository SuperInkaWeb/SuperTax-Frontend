import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { createEstudio } from "@/features/company/api"
import { apiError } from "@/shared/lib/api/error"
import { getMe } from "@/shared/lib/api/me"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useActiveEstudio } from "@/shared/stores/activeEstudio"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type { FormEvent } from "react"

export function CrearEstudioDialog({ onClose }: { onClose: () => void }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setEstudioId = useActiveEstudio((s) => s.setEstudioId)
  const setCompanyId = useActiveCompany((s) => s.setCompanyId)
  const [nombre, setNombre] = useState("")

  const crear = useMutation({
    mutationFn: () => createEstudio({ nombre }),
    onSuccess: async (nuevo) => {
      // Recarga /me para que el estudio aparezca en el selector y lo deja activo.
      // El estudio nace sin empresas, así que se limpia la empresa activa.
      const me = await getMe()
      setUser(me)
      setEstudioId(nuevo.id)
      setCompanyId(null)
      toast.success("Estudio creado. Ya puedes agregar empresas en él.")
      onClose()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo crear el estudio")),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (nombre.trim().length === 0) {
      toast.error("Escribe un nombre para el estudio")
      return
    }
    crear.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Crear estudio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un estudio agrupa su propia cartera de empresas. Quedarás como su
          administrador y podrás cambiar entre tus estudios desde la barra superior.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-estudio-nombre">Nombre del estudio</Label>
            <Input
              id="nuevo-estudio-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
