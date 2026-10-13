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

export function downloadDataset(datasetId: number, request: DownloadRequest): Promise<void> {
  return descargarBlob(
    `${BASE}/datasets/${datasetId}/download`, request, `filtrado.${request.format}`,
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
  return descargarBlob(
    `${BASE}/datasets/${datasetId}/compute/download`, request, `columnas.${request.format}`,
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
  return descargarBlob(
    `${BASE}/datasets/${datasetId}/replace/download`, request, `corregido.${request.format}`,
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
  return descargarBlob(
    `${BASE}/datasets/${datasetId}/dedupe/download`, request, `sin_duplicados.${request.format}`,
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
  return descargarBlob(
    `${BASE}/datasets/${datasetId}/pivot/download`, request, `reporte.${request.format}`,
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
