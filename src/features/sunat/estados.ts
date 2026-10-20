import type { SunatJobStatus } from "@/features/sunat/api"
import type { Tone } from "@/shared/ui/badge"
import type { StatusMeta } from "@/shared/ui/status-badge"

// Estado de un job de descarga SUNAT (enum exacto) → <StatusBadge>.
export const ESTADO_JOB: Record<SunatJobStatus, StatusMeta> = {
  en_cola: { label: "En cola", tone: "neutral" },
  procesando: { label: "Procesando", tone: "info" },
  completado: { label: "Completado", tone: "success" },
  error: { label: "Error", tone: "danger" },
  cancelado: { label: "Cancelado", tone: "danger" },
}

/**
 * Tono del estado de un comprobante. No es un enum cerrado (los errores llegan
 * como "Error: detalle"), por eso es una función y no un mapa: OK = éxito,
 * Parcial = info, cualquier otro (errores) = peligro.
 */
export function toneComprobante(estado: string): Tone {
  if (estado === "OK") return "success"
  if (estado === "Parcial") return "info"
  return "danger"
}
