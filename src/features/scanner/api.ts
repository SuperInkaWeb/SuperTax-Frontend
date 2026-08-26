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
  campos: Record<string, string>
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

/** Exporta a Excel (.xlsx) las filas que se están mostrando (el backend arma el archivo). */
export async function exportarDocumentosExcel(
  filas: Record<string, unknown>[],
  columnas: string[],
  labels: Record<string, string>,
): Promise<void> {
  const resp = await api.post(
    "/api/scanner/documentos/export",
    { filas, columnas, labels },
    { responseType: "blob" },
  )
  const url = URL.createObjectURL(resp.data as Blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `documentos_${Date.now()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function uploadAuto(
  file: File,
  onProgress?: (pct: number) => void,
  tipo?: string,
): Promise<ScannerJobCreated> {
  const form = new FormData()
  form.append("file", file)
  if (tipo) form.append("tipo", tipo)
  const { data } = await api.post<ScannerJobCreated>("/api/scanner/upload/auto", form, {
    headers: { "Content-Type": undefined },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

/** Espera a que el worker procese el documento (polling del job). */
export async function esperarDocumento(jobId: number): Promise<Documento> {
  for (;;) {
    await new Promise((r) => setTimeout(r, 1500))
    const job = await getScannerJob(jobId)
    if (job.status === "completado" && job.documento) return job.documento
    if (job.status === "error") {
      throw new Error(job.error_message ?? "No se pudo procesar el documento")
    }
  }
}

export async function getScannerJob(jobId: number): Promise<ScannerJobStatusResponse> {
  const { data } = await api.get<ScannerJobStatusResponse>(`/api/scanner/jobs/${jobId}`)
  return data
}
