import { api } from "@/shared/lib/api/client"

export interface CreatedCompany {
  id: number
  ruc: string
  razon_social: string
}

/**
 * Alta self-service: el usuario actual crea una empresa nueva y queda como su
 * Admin. Nace sin módulos (los activa el SuperAdmin).
 */
export async function createMyCompany(input: {
  ruc: string
  razon_social: string
}): Promise<CreatedCompany> {
  const { data } = await api.post<CreatedCompany>("/api/my-companies", input)
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
