import { isAxiosError } from "axios"

/** Extrae el mensaje del envelope de error del backend ({ message }). */
export function apiError(err: unknown, fallback = "Ocurrió un error"): string {
  if (isAxiosError(err)) {
    return err.response?.data?.message ?? err.message ?? fallback
  }
  return fallback
}
