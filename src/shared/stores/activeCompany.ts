import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ActiveCompanyState {
  companyId: number | null
  setCompanyId: (id: number | null) => void
}

/** Empresa activa (Modelo B). Persiste en localStorage entre recargas. */
export const useActiveCompany = create<ActiveCompanyState>()(
  persist(
    (set) => ({
      companyId: null,
      setCompanyId: (id) => set({ companyId: id }),
    }),
    { name: "plataforma.activeCompany" },
  ),
)
