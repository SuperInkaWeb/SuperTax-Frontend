/** Helpers de presentación del módulo DataFilter (formato y etiquetas de estado). */
import type { DatasetOrigin, DatasetStatus } from "@/features/datafilter/types"

type Tone = "neutral" | "info" | "success" | "danger"

export const STATUS_META: Record<DatasetStatus, { label: string; tone: Tone }> = {
  pending: { label: "En cola", tone: "neutral" },
  processing: { label: "Procesando", tone: "info" },
  ready: { label: "Listo", tone: "success" },
  failed: { label: "Error", tone: "danger" },
}

export const ORIGIN_LABEL: Record<DatasetOrigin, string> = {
  uploaded: "Subido",
  pivot: "Pivote",
  computed: "Columnas calculadas",
  replaced: "Corregido",
  deduped: "Sin duplicados",
}

/** Tamaño legible (B/KB/MB/GB) a partir de bytes. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

/** Nº de filas con separador de miles (o "—" si aún no se conoce). */
export function formatRows(rows: number | null): string {
  return rows == null ? "—" : rows.toLocaleString("es-PE")
}

/** Número legible: miles con separador y sin ruido de coma flotante. */
export function cleanNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString("es-PE")
  return Number(value.toFixed(6)).toLocaleString("es-PE", { maximumFractionDigits: 6 })
}

/** true mientras el dataset sigue procesándose (para seguir sondeando). */
export function enProceso(status: DatasetStatus): boolean {
  return status === "pending" || status === "processing"
}
