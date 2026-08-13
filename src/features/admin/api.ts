import { api } from "@/shared/lib/api/client"

// ─────────────────────── Empresas ───────────────────────
export interface Company {
  id: number
  ruc: string
  razon_social: string
  status: string
  created_at: string
}

export async function listCompanies(): Promise<Company[]> {
  const { data } = await api.get<Company[]>("/api/companies")
  return data
}

export async function createCompany(input: {
  ruc: string
  razon_social: string
}): Promise<Company> {
  const { data } = await api.post<Company>("/api/companies", input)
  return data
}

// ─────────────────────── Módulos (entitlements) ───────────────────────
export interface ModuleEntitlement {
  module_key: string
  status: string
}

export async function listCompanyModules(companyId: number): Promise<ModuleEntitlement[]> {
  const { data } = await api.get<ModuleEntitlement[]>(`/api/companies/${companyId}/modules`)
  return data
}

export async function enableModule(companyId: number, moduleKey: string): Promise<void> {
  await api.post(`/api/companies/${companyId}/modules`, { module_key: moduleKey })
}

export async function disableModule(companyId: number, moduleKey: string): Promise<void> {
  await api.delete(`/api/companies/${companyId}/modules/${moduleKey}`)
}

// ─────────────────────── Solicitudes de acceso ───────────────────────
export interface AccessRequest {
  id: number
  email: string
  nombre: string
  empresa_nombre: string
  ruc: string
  status: string
  created_at: string
  reviewed_at: string | null
  rejection_reason: string | null
}

export async function listAccessRequests(status?: string): Promise<AccessRequest[]> {
  const { data } = await api.get<AccessRequest[]>("/api/access-requests", {
    params: status ? { status_filter: status } : undefined,
  })
  return data
}

export async function reviewAccessRequest(
  id: number,
  status: "aprobado" | "rechazado",
  rejectionReason?: string,
): Promise<AccessRequest> {
  const { data } = await api.put<AccessRequest>(`/api/access-requests/${id}/review`, {
    status,
    rejection_reason: rejectionReason ?? null,
  })
  return data
}

// ─────────────────────── Miembros ───────────────────────
export interface Member {
  membership_id: number
  user_id: number
  email: string
  nombre: string
  role_key: string
  status: string
}

export async function listMembers(): Promise<Member[]> {
  const { data } = await api.get<Member[]>("/api/members")
  return data
}

export async function inviteMember(input: {
  email: string
  nombre: string
  role_key: string
}): Promise<Member> {
  const { data } = await api.post<Member>("/api/members", input)
  return data
}

export async function changeMemberRole(
  membershipId: number,
  roleKey: string,
): Promise<Member> {
  const { data } = await api.put<Member>(`/api/members/${membershipId}`, {
    role_key: roleKey,
  })
  return data
}

export async function removeMember(membershipId: number): Promise<void> {
  await api.delete(`/api/members/${membershipId}`)
}

// ─────────────────────── Roles ───────────────────────
export interface Role {
  key: string
  nombre: string
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>("/api/roles")
  return data
}
