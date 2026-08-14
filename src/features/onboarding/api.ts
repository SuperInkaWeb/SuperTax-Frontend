import { api } from "@/shared/lib/api/client"

export interface SolicitudAccesoInput {
  nombre: string
  email: string
  empresa_nombre: string
  ruc: string
  telefono?: string
  mensaje?: string
}

/**
 * Solicitud pública de acceso: crea una AccessRequest pendiente que el
 * SuperAdmin revisará. No requiere sesión (el interceptor no adjunta token
 * si no hay usuario autenticado).
 */
export async function crearSolicitudAcceso(input: SolicitudAccesoInput): Promise<void> {
  await api.post("/api/access-requests", input)
}
