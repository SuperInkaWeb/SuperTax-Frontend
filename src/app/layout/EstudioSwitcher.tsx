import { Plus } from "lucide-react"
import { useEffect, useState } from "react"

import { CrearEstudioDialog } from "@/features/company/CrearEstudioDialog"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useActiveEstudio } from "@/shared/stores/activeEstudio"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"

/** Selector de estudio activo (multi-estudio). El <select> aparece solo si el
 * usuario administra/ve más de un estudio; el botón "Crear estudio" está siempre
 * disponible. Al cambiar de estudio, fija como empresa activa la primera de él. */
export function EstudioSwitcher() {
  // Se selecciona el usuario (referencia estable) y se derivan los arrays fuera
  // del selector para no crear uno nuevo en cada render (React #185).
  const user = useAuthStore((s) => s.user)
  const estudios = user?.estudios ?? []
  const companies = user?.companies ?? []
  const estudioId = useActiveEstudio((s) => s.estudioId)
  const setEstudioId = useActiveEstudio((s) => s.setEstudioId)
  const companyId = useActiveCompany((s) => s.companyId)
  const setCompanyId = useActiveCompany((s) => s.setCompanyId)
  const [creando, setCreando] = useState(false)

  // Auto-resuelve el estudio activo si falta o ya no existe: toma el de la empresa
  // activa; si no, el primero. Así el filtro de empresas siempre es coherente.
  useEffect(() => {
    if (estudios.length === 0) return
    if (estudioId != null && estudios.some((e) => e.id === estudioId)) return
    const empresaActiva = companies.find((c) => c.id === companyId)
    const preferido = empresaActiva?.estudio_id ?? null
    const destino =
      preferido != null && estudios.some((e) => e.id === preferido)
        ? preferido
        : estudios[0].id
    setEstudioId(destino)
  }, [estudios, estudioId, companies, companyId, setEstudioId])

  const cambiarEstudio = (id: number) => {
    setEstudioId(id)
    const primera = companies.find((c) => c.estudio_id === id)
    setCompanyId(primera ? primera.id : null)
  }

  return (
    <div className="flex items-center gap-2">
      {estudios.length > 1 && (
        <select
          aria-label="Estudio activo"
          className="max-w-[14rem] truncate rounded-md border bg-background px-3 py-1.5 text-sm"
          value={estudioId ?? ""}
          onChange={(e) => cambiarEstudio(Number(e.target.value))}
        >
          {estudios.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      )}

      <Button size="sm" variant="outline" onClick={() => setCreando(true)}>
        <Plus className="size-4" />
        Estudio
      </Button>

      {creando && <CrearEstudioDialog onClose={() => setCreando(false)} />}
    </div>
  )
}
