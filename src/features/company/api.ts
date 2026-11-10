import { api } from "@/shared/lib/api/client"

export interface CreatedCompany {
  id: number
  ruc: string
  razon_social: string
}

/**
 * Alta self-service: el usuario actual crea una empresa nueva y queda como su
 * Admin. Con `estudio_id` la empresa va al estudio activo; sin él, al estudio
 * del usuario resuelto por defecto.
 */
export async function createMyCompany(input: {
  ruc: string
  razon_social: string
  estudio_id?: number
}): Promise<CreatedCompany> {
  const { data } = await api.post<CreatedCompany>("/api/my-companies", input)
  return data
}

export interface CreatedEstudio {
  id: number
  nombre: string
}

/** Un usuario existente abre un estudio nuevo y queda como su administrador. */
export async function createEstudio(input: { nombre: string }): Promise<CreatedEstudio> {
  const { data } = await api.post<CreatedEstudio>("/api/estudio", input)
  return data
}

/**
 * Solicita acceso a una empresa cuyo RUC ya está registrado por otro estudio.
 * La aprueba el administrador del estudio dueño.
 */
export async function solicitarAccesoEmpresa(input: {
  ruc: string
  mensaje?: string
}): Promise<void> {
  await api.post("/api/company-access-requests", input)
}
