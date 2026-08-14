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
