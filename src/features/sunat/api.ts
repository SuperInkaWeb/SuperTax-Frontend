import { obtenerToken } from "@/shared/lib/authBridge"
import { api } from "@/shared/lib/api/client"
import { API_URL } from "@/shared/lib/config"

// ─────────────────────── Credenciales SOL ───────────────────────
export interface SunatCredentialsStatus {
  configured: boolean
  ruc: string | null
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

// ─────────────────────── Historial ───────────────────────
export interface JobResult {
  id: number
  job_id: string
  created_at: string
}

export async function listJobs(): Promise<JobResult[]> {
  const { data } = await api.get<JobResult[]>("/api/sunat/jobs")
  return data
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
export interface PreviewResult {
  comprobantes: unknown[]
  preview_id: string
}

export async function previewExcel(excel: File): Promise<PreviewResult> {
  const form = new FormData()
  form.append("excel", excel)
  const { data } = await api.post<PreviewResult>("/api/sunat/preview-excel", form, {
    headers: { "Content-Type": undefined },
  })
  return data
}

export interface IniciarInput {
  ruc: string
  usuario: string
  clave: string
  descargar_pdf: boolean
  descargar_xml: boolean
  preview_id: string
  excel: File | null
}

export async function iniciar(input: IniciarInput): Promise<string> {
  const form = new FormData()
  form.append("ruc", input.ruc)
  form.append("usuario", input.usuario)
  form.append("clave", input.clave)
  form.append("descargar_pdf", String(input.descargar_pdf))
  form.append("descargar_xml", String(input.descargar_xml))
  if (input.preview_id) form.append("preview_id", input.preview_id)
  if (input.excel) form.append("excel", input.excel)
  const { data } = await api.post<{ job_id: string }>("/api/sunat/iniciar", form, {
    headers: { "Content-Type": undefined },
  })
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
