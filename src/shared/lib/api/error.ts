import { isAxiosError } from "axios"

interface ErrorEnvelope {
  message?: string
  errors?: string[]
}

/**
 * Extrae el mensaje del envelope de error del backend ({ message, errors }).
 * Si el backend adjunta detalles (p. ej. errores de validación 422), se añaden
 * al mensaje para no mostrar un texto opaco como "Datos inválidos" a secas.
 */
export function apiError(err: unknown, fallback = "Ocurrió un error"): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as ErrorEnvelope | undefined
    const message = data?.message ?? err.message ?? fallback
    const detalles = Array.isArray(data?.errors) ? data.errors : []
    return detalles.length > 0 ? `${message}: ${detalles.join("; ")}` : message
  }
  return fallback
}
