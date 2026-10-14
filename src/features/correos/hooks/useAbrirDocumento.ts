import { useState } from "react"

import { getDocumentUrl } from "@/features/correos/api"

/**
 * Abre el adjunto original de un registro en una pestaña nueva. El documento se
 * sirve autenticado (blob), así que no puede ser un enlace directo: se descarga y
 * se abre con un object URL.
 */
export function useAbrirDocumento() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)

  const abrir = async (recordId: number) => {
    setCargando(true)
    setError(false)
    try {
      const url = await getDocumentUrl(recordId)
      window.open(url, "_blank", "noopener")
    } catch {
      setError(true)
    } finally {
      setCargando(false)
    }
  }

  return { abrir, cargando, error }
}
