/** Cliente del módulo DataFilter: todas las llamadas al backend (/api/datafilter). */
import { api } from "@/shared/lib/api/client"

import type {
  ColumnStats,
  ComputeDownloadRequest,
  ComputeRequest,
  ComputeSaveRequest,
  DatasetDetail,
  DatasetSummary,
  DedupeDownloadRequest,
  DedupeRequest,
  DedupeResponse,
  DedupeSaveRequest,
  DistinctValues,
  DownloadRequest,
  PivotDownloadRequest,
  PivotRequest,
  PivotResponse,
  PivotSaveRequest,
  PreviewRequest,
  PreviewResponse,
  ReplaceDownloadRequest,
  ReplaceRequest,
  ReplaceSaveRequest,
  StatsRequest,
} from "@/features/datafilter/types"

const BASE = "/api/datafilter"
// Content-Type undefined deja que el navegador ponga el boundary del multipart.
const MULTIPART = { headers: { "Content-Type": undefined } }

// ─────────────────────── Datasets ───────────────────────
export async function listDatasets(): Promise<DatasetSummary[]> {
  const { data } = await api.get<DatasetSummary[]>(`${BASE}/datasets`)
  return data
}

export async function getDataset(datasetId: number): Promise<DatasetDetail> {
  const { data } = await api.get<DatasetDetail>(`${BASE}/datasets/${datasetId}`)
  return data
}

export async function uploadDataset(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<DatasetSummary> {
  const form = new FormData()
  form.append("file", file)
  const { data } = await api.post<DatasetSummary>(`${BASE}/datasets/upload`, form, {
    ...MULTIPART,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

interface UploadInitResponse {
  mode: "single" | "multipart"
  dataset_id?: number
  part_size?: number
  parts?: { part_number: number; url: string }[]
}

/** Sube una parte DIRECTO a R2 con XHR (da progreso real) y devuelve su ETag. */
function putParteAR2(url: string, blob: Blob, onProgress: (loaded: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url, true)
    xhr.upload.onprogress = (e) => onProgress(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag")
        if (etag) resolve(etag)
        else reject(new Error("R2 no devolvió ETag (revisa el CORS del bucket: ExposeHeaders ETag)"))
      } else {
        reject(new Error(`Error al subir una parte (HTTP ${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error("Fallo de red al subir una parte a R2"))
    xhr.send(blob)
  })
}

/**
 * Sube un dataset por el mejor camino: en producción, DIRECTO a R2 por partes
 * (multipart) para evitar el límite/timeout del hosting con archivos de varios GB;
 * en dev/local, por el backend. El progreso agrega el avance de todas las partes.
 */
export async function uploadDatasetSmart(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<DatasetSummary> {
  const { data: init } = await api.post<UploadInitResponse>(`${BASE}/datasets/upload/init`, {
    filename: file.name,
    size_bytes: file.size,
  })

  if (init.mode !== "multipart" || !init.dataset_id || !init.part_size || !init.parts) {
    return uploadDataset(file, onProgress) // dev/local o respuesta incompleta
  }

  const datasetId = init.dataset_id
  const partSize = init.part_size
  const parts = init.parts
  const avance: number[] = Array.from({ length: parts.length }, () => 0)
  const reportar = () => {
    if (!onProgress) return
    const subido = avance.reduce((a, b) => a + b, 0)
    onProgress(Math.min(99, Math.round((subido / file.size) * 100)))
  }

  try {
    const CONCURRENCIA = 3
    const completadas: { part_number: number; etag: string }[] = []
    let siguiente = 0
    const worker = async () => {
      while (siguiente < parts.length) {
        const i = siguiente++
        const inicio = i * partSize
        const trozo = file.slice(inicio, Math.min(inicio + partSize, file.size))
        const etag = await putParteAR2(parts[i].url, trozo, (loaded) => {
          avance[i] = loaded
          reportar()
        })
        completadas.push({ part_number: parts[i].part_number, etag })
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, parts.length) }, worker))

    const { data } = await api.post<DatasetSummary>(`${BASE}/datasets/upload/complete`, {
      dataset_id: datasetId,
      parts: completadas,
    })
    onProgress?.(100)
    return data
  } catch (e) {
    await api.post(`${BASE}/datasets/upload/abort`, { dataset_id: datasetId }).catch(() => {})
    throw e
  }
}

export async function deleteDataset(datasetId: number): Promise<void> {
  await api.delete(`${BASE}/datasets/${datasetId}`)
}

/** Re-ingesta un Excel multi-hoja usando otra hoja (procesa en 2º plano). */
export async function changeSheet(datasetId: number, sheet: string): Promise<DatasetDetail> {
  const { data } = await api.post<DatasetDetail>(`${BASE}/datasets/${datasetId}/sheet`, { sheet })
  return data
}

// ─────────────────────── Filtrado / vista previa ───────────────────────
export async function previewDataset(
  datasetId: number,
  request: PreviewRequest,
): Promise<PreviewResponse> {
  const { data } = await api.post<PreviewResponse>(`${BASE}/datasets/${datasetId}/preview`, request)
  return data
}

export async function columnValues(
  datasetId: number,
  column: string,
  search?: string,
): Promise<DistinctValues> {
  const params = search ? `?search=${encodeURIComponent(search)}` : ""
  const { data } = await api.get<DistinctValues>(
    `${BASE}/datasets/${datasetId}/columns/${encodeURIComponent(column)}/distinct${params}`,
  )
  return data
}

// ─────────────────────── Descarga (blob → archivo) ───────────────────────
async function descargarBlob(path: string, body: unknown, nombre: string): Promise<void> {
  const resp = await api.post(path, body, { responseType: "blob" })
  const url = URL.createObjectURL(resp.data as Blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

interface DownloadPresign {
  mode: "single" | "r2"
  url?: string
  filename?: string
}

/**
 * Descarga pidiendo primero una URL firmada: si el backend responde `r2`, baja el
 * resultado DIRECTO de R2 (evita el borde del hosting con resultados grandes); si
 * responde `single` (dev/local), cae a la descarga clásica por blob. R2 sirve el
 * objeto como adjunto con su nombre (Content-Disposition en la URL firmada).
 */
async function descargarConPresign(
  presignPath: string, blobPath: string, body: unknown, nombreFallback: string,
): Promise<void> {
  const { data } = await api.post<DownloadPresign>(presignPath, body)
  if (data.mode === "r2" && data.url) {
    const a = document.createElement("a")
    a.href = data.url
    if (data.filename) a.download = data.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    return
  }
  return descargarBlob(blobPath, body, nombreFallback)
}

export function downloadDataset(datasetId: number, request: DownloadRequest): Promise<void> {
  return descargarConPresign(
    `${BASE}/datasets/${datasetId}/download/presign`,
    `${BASE}/datasets/${datasetId}/download`,
    request, `filtrado.${request.format}`,
  )
}

// ─────────────────────── Columnas calculadas ───────────────────────
export async function computePreview(
  datasetId: number,
  request: ComputeRequest,
): Promise<PreviewResponse> {
  const { data } = await api.post<PreviewResponse>(
    `${BASE}/datasets/${datasetId}/compute/preview`, request,
  )
  return data
}

export async function saveComputed(
  datasetId: number,
  request: ComputeSaveRequest,
): Promise<DatasetSummary> {
  const { data } = await api.post<DatasetSummary>(
    `${BASE}/datasets/${datasetId}/compute/save`, request,
  )
  return data
}

export function downloadComputed(
  datasetId: number,
  request: ComputeDownloadRequest,
): Promise<void> {
  return descargarConPresign(
    `${BASE}/datasets/${datasetId}/compute/download/presign`,
    `${BASE}/datasets/${datasetId}/compute/download`,
    request, `columnas.${request.format}`,
  )
}

// ─────────────────────── Buscar y reemplazar ───────────────────────
export async function replacePreview(
  datasetId: number,
  request: ReplaceRequest,
): Promise<PreviewResponse> {
  const { data } = await api.post<PreviewResponse>(
    `${BASE}/datasets/${datasetId}/replace/preview`, request,
  )
  return data
}

export async function saveReplace(
  datasetId: number,
  request: ReplaceSaveRequest,
): Promise<DatasetSummary> {
  const { data } = await api.post<DatasetSummary>(
    `${BASE}/datasets/${datasetId}/replace/save`, request,
  )
  return data
}

export function downloadReplace(
  datasetId: number,
  request: ReplaceDownloadRequest,
): Promise<void> {
  return descargarConPresign(
    `${BASE}/datasets/${datasetId}/replace/download/presign`,
    `${BASE}/datasets/${datasetId}/replace/download`,
    request, `corregido.${request.format}`,
  )
}

// ─────────────────────── Eliminar duplicados ───────────────────────
export async function dedupePreview(
  datasetId: number,
  request: DedupeRequest,
): Promise<DedupeResponse> {
  const { data } = await api.post<DedupeResponse>(
    `${BASE}/datasets/${datasetId}/dedupe/preview`, request,
  )
  return data
}

export async function saveDedupe(
  datasetId: number,
  request: DedupeSaveRequest,
): Promise<DatasetSummary> {
  const { data } = await api.post<DatasetSummary>(
    `${BASE}/datasets/${datasetId}/dedupe/save`, request,
  )
  return data
}

export function downloadDedupe(
  datasetId: number,
  request: DedupeDownloadRequest,
): Promise<void> {
  return descargarConPresign(
    `${BASE}/datasets/${datasetId}/dedupe/download/presign`,
    `${BASE}/datasets/${datasetId}/dedupe/download`,
    request, `sin_duplicados.${request.format}`,
  )
}

// ─────────────────────── Tablas dinámicas (pivote) ───────────────────────
export async function pivotPreview(
  datasetId: number,
  request: PivotRequest,
): Promise<PivotResponse> {
  const { data } = await api.post<PivotResponse>(
    `${BASE}/datasets/${datasetId}/pivot/preview`, request,
  )
  return data
}

export async function savePivot(
  datasetId: number,
  request: PivotSaveRequest,
): Promise<DatasetSummary> {
  const { data } = await api.post<DatasetSummary>(
    `${BASE}/datasets/${datasetId}/pivot/save`, request,
  )
  return data
}

export function downloadPivot(datasetId: number, request: PivotDownloadRequest): Promise<void> {
  return descargarConPresign(
    `${BASE}/datasets/${datasetId}/pivot/download/presign`,
    `${BASE}/datasets/${datasetId}/pivot/download`,
    request, `reporte.${request.format}`,
  )
}

// ─────────────────────── Estadísticas por columna ───────────────────────
export async function columnStats(
  datasetId: number,
  request: StatsRequest,
): Promise<ColumnStats> {
  const { data } = await api.post<ColumnStats>(`${BASE}/datasets/${datasetId}/stats`, request)
  return data
}
