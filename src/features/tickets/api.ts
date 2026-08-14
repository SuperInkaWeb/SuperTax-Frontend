import { api } from "@/shared/lib/api/client"

export type TicketStatus = "abierto" | "respondido" | "cerrado"

export interface TicketMessage {
  id: number
  author_nombre: string
  es_soporte: boolean
  mensaje: string
  created_at: string
}

export interface TicketListItem {
  id: number
  asunto: string
  status: TicketStatus
  company_nombre: string | null
  created_by_nombre: string
  created_at: string
  updated_at: string
}

export interface TicketDetail {
  id: number
  asunto: string
  status: TicketStatus
  company_nombre: string | null
  created_by_nombre: string
  created_at: string
  mensajes: TicketMessage[]
}

export async function listTickets(): Promise<TicketListItem[]> {
  const { data } = await api.get<TicketListItem[]>("/api/tickets")
  return data
}

export async function getTicket(id: number): Promise<TicketDetail> {
  const { data } = await api.get<TicketDetail>(`/api/tickets/${id}`)
  return data
}

export async function createTicket(input: {
  asunto: string
  mensaje: string
}): Promise<TicketDetail> {
  const { data } = await api.post<TicketDetail>("/api/tickets", input)
  return data
}

export async function replyTicket(id: number, mensaje: string): Promise<TicketDetail> {
  const { data } = await api.post<TicketDetail>(`/api/tickets/${id}/reply`, { mensaje })
  return data
}

export async function closeTicket(id: number): Promise<TicketDetail> {
  const { data } = await api.post<TicketDetail>(`/api/tickets/${id}/close`)
  return data
}
