import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ActiveEstudioState {
  estudioId: number | null
  setEstudioId: (id: number | null) => void
}

/** Estudio activo (multi-estudio). Persiste en localStorage entre recargas.
 * Agrupa/filtra la vista (empresas, Equipo, Administradores) por estudio; el
 * aislamiento real sigue siendo por empresa activa. */
export const useActiveEstudio = create<ActiveEstudioState>()(
  persist(
    (set) => ({
      estudioId: null,
      setEstudioId: (id) => set({ estudioId: id }),
    }),
    { name: "plataforma.activeEstudio" },
  ),
)
