import { obtenerToken } from "@/shared/lib/authBridge"
import { api } from "@/shared/lib/api/client"
import { API_URL } from "@/shared/lib/config"

const MULTIPART = { headers: { "Content-Type": undefined } }

// ─────────────────────── Credenciales SOL ───────────────────────
export interface SunatCredentialsStatus {
  configured: boolean
  ruc: string | null
  usuario: string | null
}

export interface SunatCredentialsInput {
  ruc: string
  usuario: string
  clave: string
}

export async function getCredentials(): Promise<SunatCredentialsStatus> {
  const { data } = await api.get<SunatCredentialsStatus>("/api/sunat/credentials")
  return data
}

export async function setCredentials(
  input: SunatCredentialsInput,
): Promise<SunatCredentialsStatus> {
  const { data } = await api.put<SunatCredentialsStatus>("/api/sunat/credentials", input)
  return data
}

// ─────────────────────── Historial / resultados ───────────────────────
export type SunatJobStatus = "en_cola" | "procesando" | "completado" | "error" | "cancelado"

export interface SunatJobItem {
  job_id: string
  status: SunatJobStatus
  created_at: string
  completed_at: string | null
  has_result: boolean
}

export interface ResultadoComprobante {
  id: string
  estado: string
  pdf: boolean
  xml: boolean
  pide_pdf: boolean
  pide_xml: boolean
}

export async function listJobs(): Promise<SunatJobItem[]> {
  const { data } = await api.get<SunatJobItem[]>("/api/sunat/jobs")
  return data
}

export async function getJobResult(jobId: string): Promise<ResultadoComprobante[]> {
  const { data } = await api.get<{ resultados: ResultadoComprobante[] }>(
    `/api/sunat/jobs/${jobId}`,
  )
  return data.resultados
}

// ─────────────────────── Google Drive ───────────────────────
export interface DriveStatus {
  connected: boolean
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const { data } = await api.get<DriveStatus>("/api/sunat/drive")
  return data
}

export async function getDriveAuthUrl(): Promise<string> {
  const { data } = await api.get<{ url: string }>("/api/sunat/drive/auth")
  return data.url
}

export async function disconnectDrive(): Promise<void> {
  await api.post("/api/sunat/drive/desconectar")
}

// ─────────────────────── Descarga ───────────────────────
export interface Comprobante {
  id: string
  ruc: string
  tipo: string
  serie: string
  numero: number
}

export interface PreviewResult {
  comprobantes: Comprobante[]
  preview_id: string
}

export async function previewExcel(
  excel: File | null,
  excelLink: string,
): Promise<PreviewResult> {
  const form = new FormData()
  if (excel) form.append("excel", excel)
  form.append("excel_link", excelLink)
  const { data } = await api.post<PreviewResult>(
    "/api/sunat/preview-excel",
    form,
    MULTIPART,
  )
  return data
}

/** Opciones de entrega compartidas por iniciar y reintentar. */
export interface EntregaOptions {
  usar_correo: boolean
  gmail_user: string
  gmail_pass: string
  destino: string
  modo_correo: string
  usar_drive: boolean
  drive_folder: string
}

export interface IniciarInput extends EntregaOptions {
  ruc: string
  usuario: string
  clave: string
  descargar_pdf: boolean
  descargar_xml: boolean
  preview_id: string
  excel: File | null
  excel_link: string
  comprobantes_ids: string[]
}

function _appendEntrega(form: FormData, o: EntregaOptions): void {
  form.append("usar_correo", String(o.usar_correo))
  form.append("gmail_user", o.gmail_user)
  form.append("gmail_pass", o.gmail_pass)
  form.append("destino", o.destino)
  form.append("modo_correo", o.modo_correo)
  form.append("usar_drive", String(o.usar_drive))
  form.append("drive_folder", o.drive_folder)
}

export async function iniciar(input: IniciarInput): Promise<string> {
  const form = new FormData()
  form.append("ruc", input.ruc)
  form.append("usuario", input.usuario)
  form.append("clave", input.clave)
  form.append("descargar_pdf", String(input.descargar_pdf))
  form.append("descargar_xml", String(input.descargar_xml))
  form.append("excel_link", input.excel_link)
  form.append("comprobantes_ids", JSON.stringify(input.comprobantes_ids))
  if (input.preview_id) form.append("preview_id", input.preview_id)
  if (input.excel) form.append("excel", input.excel)
  _appendEntrega(form, input)
  const { data } = await api.post<{ job_id: string }>("/api/sunat/iniciar", form, MULTIPART)
  return data.job_id
}

export interface ForzarInput extends EntregaOptions {
  ruc: string
  usuario: string
  clave: string
  excel: File | null
  excel_link: string
  resultados_previos: string
}

export async function forzarFaltantes(input: ForzarInput): Promise<string> {
  const form = new FormData()
  form.append("ruc", input.ruc)
  form.append("usuario", input.usuario)
  form.append("clave", input.clave)
  form.append("excel_link", input.excel_link)
  form.append("resultados_previos", input.resultados_previos)
  if (input.excel) form.append("excel", input.excel)
  _appendEntrega(form, input)
  const { data } = await api.post<{ job_id: string }>(
    "/api/sunat/forzar-faltantes",
    form,
    MULTIPART,
  )
  return data.job_id
}

export async function cancelar(jobId: string): Promise<void> {
  await api.post(`/api/sunat/cancelar/${jobId}`)
}

/** Abre el stream SSE de logs/progreso (el token viaja por query param). */
export async function abrirLogs(jobId: string): Promise<EventSource> {
  const token = await obtenerToken()
  const url = `${API_URL}/api/sunat/logs/${jobId}?token=${encodeURIComponent(token ?? "")}`
  return new EventSource(url)
}
