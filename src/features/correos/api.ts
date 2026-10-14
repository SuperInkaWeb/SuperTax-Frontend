import { api } from "@/shared/lib/api/client"

// ─────────────────────────── Buzones ───────────────────────────
export type MailboxProvider = "gmail" | "outlook"

export interface MailboxSummary {
  id: number
  provider: MailboxProvider
  account_email: string
  status: string
  created_at: string
}

export async function listMailboxes(): Promise<MailboxSummary[]> {
  const { data } = await api.get<MailboxSummary[]>("/api/correos/mailboxes")
  return data
}

export async function authorizeMailbox(provider: MailboxProvider): Promise<string> {
  const { data } = await api.post<{ authorization_url: string }>(
    "/api/correos/mailboxes/authorize",
    { provider },
  )
  return data.authorization_url
}

export async function completeMailbox(code: string, state: string): Promise<MailboxSummary> {
  const { data } = await api.post<MailboxSummary>("/api/correos/mailboxes/callback", {
    code,
    state,
  })
  return data
}

export async function deleteMailbox(id: number): Promise<void> {
  await api.delete(`/api/correos/mailboxes/${id}`)
}

// ─────────────────────────── Escaneos ───────────────────────────
export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled"

export interface ScanSummary {
  id: number
  status: ScanStatus
  phase: string
  progress_pct: number
  counters: Record<string, number>
  error_code: string | null
  error_message: string | null
  queued_at: string
  started_at: string | null
  finished_at: string | null
}

export interface ScanRequest {
  connection_id: number
  desde?: string | null
  hasta?: string | null
  limite_de_mensajes?: number
  carpeta?: string
}

export interface ScanError {
  stage: string
  code: string
  message: string
  created_at: string
}

export async function listScans(): Promise<ScanSummary[]> {
  const { data } = await api.get<ScanSummary[]>("/api/correos/scans")
  return data
}

export async function getScan(id: number): Promise<ScanSummary> {
  const { data } = await api.get<ScanSummary>(`/api/correos/scans/${id}`)
  return data
}

export async function createScan(body: ScanRequest): Promise<ScanSummary> {
  const { data } = await api.post<ScanSummary>("/api/correos/scans", body)
  return data
}

export async function cancelScan(id: number): Promise<ScanSummary> {
  const { data } = await api.post<ScanSummary>(`/api/correos/scans/${id}/cancel`)
  return data
}

export async function scanErrors(id: number): Promise<ScanError[]> {
  const { data } = await api.get<ScanError[]>(`/api/correos/scans/${id}/errors`)
  return data
}

// ─────────────────────────── Registros ───────────────────────────
export interface RecordOrigin {
  nombre_adjunto: string
  remitente: string
  asunto: string
  recibido_en: string | null
}

export interface RecordSummary {
  id: number
  job_id: number
  attachment_id: number
  ruc_contribuyente: string | null
  nombre_contribuyente: string
  ruc_inquilino: string | null
  nombre_inquilino: string
  tipo_doc_inquilino: string
  tipo_de_bien: string
  periodo: string | null
  fecha_de_pago: string | null
  numero_de_operacion: string | null
  monto_alquiler: string | null
  tributo_resultante: string | null
  importe_pagado: string | null
  intereses_moratorios: string | null
  moneda: string
  confianza_por_campo: Record<string, number>
  campos_dudosos: string[]
  completitud: string
  estado_de_revision: string
  estrategia_usada: string | null
  created_at: string
  origen: RecordOrigin
}

export interface RecordListResponse {
  items: RecordSummary[]
  total: number
  limit: number
  offset: number
}

export interface RecordFilters {
  job_id?: number
  ruc?: string
  ruc_inquilino?: string
  periodo?: string
  periodo_desde?: string
  periodo_hasta?: string
  fecha_desde?: string
  fecha_hasta?: string
  solo_aprobados?: boolean
  limit?: number
  offset?: number
}

export async function listRecords(filters: RecordFilters = {}): Promise<RecordListResponse> {
  const { data } = await api.get<RecordListResponse>("/api/correos/records", { params: filters })
  return data
}

export async function reviewQueue(limit = 50, offset = 0): Promise<RecordListResponse> {
  const { data } = await api.get<RecordListResponse>("/api/correos/review", {
    params: { limit, offset },
  })
  return data
}

export async function reviewCount(): Promise<number> {
  const { data } = await api.get<{ pendientes: number }>("/api/correos/review/count")
  return data.pendientes
}

export async function getRecord(id: number): Promise<RecordSummary> {
  const { data } = await api.get<RecordSummary>(`/api/correos/records/${id}`)
  return data
}

export async function correctRecord(
  id: number,
  correcciones: Record<string, string>,
): Promise<RecordSummary> {
  const { data } = await api.patch<RecordSummary>(`/api/correos/records/${id}`, { correcciones })
  return data
}

export async function approveRecord(id: number): Promise<RecordSummary> {
  const { data } = await api.post<RecordSummary>(`/api/correos/records/${id}/approve`)
  return data
}

export async function rejectRecord(id: number): Promise<RecordSummary> {
  const { data } = await api.post<RecordSummary>(`/api/correos/records/${id}/reject`)
  return data
}

export async function deleteRecord(id: number): Promise<void> {
  await api.delete(`/api/correos/records/${id}`)
}

/** Descarga el adjunto original (autenticado) y devuelve un object URL para mostrarlo. */
export async function getDocumentUrl(id: number): Promise<string> {
  const resp = await api.get(`/api/correos/records/${id}/document`, { responseType: "blob" })
  return URL.createObjectURL(resp.data as Blob)
}

/** Descarga el reporte Excel con los filtros dados (mismos que el listado). */
export async function exportRecords(filters: RecordFilters = {}): Promise<void> {
  const resp = await api.get("/api/correos/records/export", {
    params: filters,
    responseType: "blob",
  })
  const url = URL.createObjectURL(resp.data as Blob)
  const a = document.createElement("a")
  a.href = url
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  a.download = `reporte-correos-${hoy}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────── Auditoría ───────────────────────────
export interface AuditEntry {
  id: number
  actor_id: number | null
  actor_ip: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

export interface AuditListResponse {
  items: AuditEntry[]
  total: number
  limit: number
  offset: number
}

export async function listAudit(limit = 50, offset = 0): Promise<AuditListResponse> {
  const { data } = await api.get<AuditListResponse>("/api/correos/audit", {
    params: { limit, offset },
  })
  return data
}
