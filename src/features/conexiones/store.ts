import { create } from "zustand"

interface ConexionesState {
  open: boolean
  abrir: () => void
  cerrar: () => void
}

/**
 * Estado del panel de Conexiones. Es un overlay global (no una ruta del menú):
 * se abre desde el Topbar o desde las páginas de credenciales de cada módulo.
 */
export const useConexiones = create<ConexionesState>((set) => ({
  open: false,
  abrir: () => set({ open: true }),
  cerrar: () => set({ open: false }),
}))
