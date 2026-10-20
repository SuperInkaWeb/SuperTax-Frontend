import type { StatusMeta } from "@/shared/ui/status-badge"

// Mapas estado→{etiqueta, tono} del módulo Correos, en un solo lugar (antes se
// repetían en EscaneosPage/RevisionPage/RegistrosPage). Alimentan <StatusBadge>.

export const ESTADO_ESCANEO: Record<string, StatusMeta> = {
  queued: { label: "En cola", tone: "neutral" },
  running: { label: "En curso", tone: "info" },
  completed: { label: "Completado", tone: "success" },
  failed: { label: "Fallido", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
}

export const FASE: Record<string, string> = {
  waiting: "En espera",
  listing: "Listando correos",
  downloading: "Descargando adjuntos",
  extracting: "Extrayendo datos",
  done: "Terminado",
}

export const COMPLETITUD: Record<string, StatusMeta> = {
  complete: { label: "Completo", tone: "success" },
  partial: { label: "Parcial", tone: "info" },
  empty: { label: "Vacío", tone: "danger" },
}

export const AYUDA_COMPLETITUD: Record<string, string> = {
  complete: "Se leyeron todos los datos clave con confianza",
  partial: "Falta algún dato clave o se leyó con poca confianza",
  empty: "No se reconoció como constancia de pago",
}

export const REVISION: Record<string, StatusMeta> = {
  not_required: { label: "No requiere", tone: "neutral" },
  pending: { label: "Pendiente", tone: "info" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "danger" },
}

export const AYUDA_REVISION: Record<string, string> = {
  not_required: "El sistema lo dio por bueno; nadie tiene que revisarlo",
  pending: "Necesita que una persona lo revise y confirme",
  approved: "Una persona lo revisó y lo aprobó",
  rejected: "Marcado como no válido (documento ilegible o ajeno)",
}

export const ESTADO_BUZON: Record<string, StatusMeta> = {
  active: { label: "Conectado", tone: "success" },
  revoked: { label: "Revocado", tone: "danger" },
  error: { label: "Con error", tone: "danger" },
}
