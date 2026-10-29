import { api } from "@/shared/lib/api/client"

export interface SolicitudAccesoInput {
  nombre: string
  email: string
  empresa_nombre?: string // solo para RUC libre (razón social del primer cliente)
  ruc: string
  telefono?: string
  mensaje?: string
}

export interface VerificarRucResult {
  existe: boolean
  razon_social: string | null
}

/** Público: ¿el RUC ya está registrado? Devuelve su razón social si existe. */
export async function verificarRuc(ruc: string): Promise<VerificarRucResult> {
  const { data } = await api.get<VerificarRucResult>(
    "/api/access-requests/verificar-ruc",
    { params: { ruc } },
  )
  return data
}

export interface SolicitudAccesoResult {
  // "estudio_nuevo": RUC libre → la revisa el SuperAdmin.
  // "acceso_empresa": el RUC ya existe → la revisa el admin del estudio dueño.
  tipo: "estudio_nuevo" | "acceso_empresa"
  email: string
  ruc: string
  detalle: string
}

/**
 * Solicitud pública de acceso. Si el RUC es libre, pide el alta de un estudio
 * nuevo (la revisa el SuperAdmin); si el RUC ya existe, se convierte en una
 * solicitud de acceso al administrador del estudio dueño. No requiere sesión.
 */
export async function crearSolicitudAcceso(
  input: SolicitudAccesoInput,
): Promise<SolicitudAccesoResult> {
  const { data } = await api.post<SolicitudAccesoResult>("/api/access-requests", input)
  return data
}
