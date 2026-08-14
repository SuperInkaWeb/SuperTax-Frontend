import { api } from "@/shared/lib/api/client"

export interface Documento {
  id: number
  created_at: string
  tipo_documento: string
  tipo_etiqueta: string | null
  confianza: number | null
  nombre_archivo: string
  campos: Record<string, unknown>
}

export interface TipoDocumento {
  etiqueta: string
  campos: unknown
}

export type ScannerJobStatus = "en_cola" | "procesando" | "completado" | "error"

export interface ScannerJobCreated {
  job_id: number
  status: ScannerJobStatus
}

export interface ScannerJobStatusResponse {
  id: number
  status: ScannerJobStatus
  error_message: string | null
  documento: Documento | null
}

export async function getTipos(): Promise<Record<string, TipoDocumento>> {
  const { data } = await api.get<Record<string, TipoDocumento>>(
    "/api/scanner/tipos-documento",
  )
  return data
}

export async function listDocumentos(tipo?: string): Promise<Documento[]> {
  const { data } = await api.get<Documento[]>("/api/scanner/documentos", {
    params: tipo && tipo !== "todos" ? { tipo } : undefined,
  })
  return data
}

export async function updateDocumento(
  id: number,
  campos: Record<string, unknown>,
): Promise<Documento> {
  const { data } = await api.put<Documento>(`/api/scanner/documentos/${id}`, { campos })
  return data
}

export async function uploadAuto(file: File): Promise<ScannerJobCreated> {
  const form = new FormData()
  form.append("file", file)
  const { data } = await api.post<ScannerJobCreated>("/api/scanner/upload/auto", form, {
    headers: { "Content-Type": undefined },
  })
  return data
}

export async function getScannerJob(jobId: number): Promise<ScannerJobStatusResponse> {
  const { data } = await api.get<ScannerJobStatusResponse>(`/api/scanner/jobs/${jobId}`)
  return data
}
