/**
 * Reglas de validación por nombre de campo (Scanner). Devuelve `null` si es
 * válido, o un mensaje de error. Portado del proyecto original.
 */
interface Regla {
  test: (clave: string) => boolean
  validar: (valor: string) => string | null
}

const NUM_HINTS = [
  "total",
  "subtotal",
  "igv",
  "monto",
  "cargo",
  "importe",
  "neto",
  "retencion",
  "deuda",
  "redondeo",
  "reajuste",
  "descuento",
  "honorario",
]

const REGLAS: Regla[] = [
  {
    test: (k) => k.startsWith("ruc"),
    validar: (v) => (/^\d{11}$/.test(v.trim()) ? null : "Debe tener exactamente 11 dígitos"),
  },
  {
    test: (k) => k === "dni" || k.startsWith("dni_"),
    validar: (v) => (/^\d{8}$/.test(v.trim()) ? null : "Debe tener exactamente 8 dígitos"),
  },
  {
    test: (k) => k.startsWith("fecha") || k.endsWith("_fecha"),
    validar: (v) => {
      if (!v.trim()) return null
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) || /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim())
      return ok ? null : "Formato: DD/MM/YYYY o YYYY-MM-DD"
    },
  },
  {
    test: (k) => NUM_HINTS.some((p) => k.includes(p)),
    validar: (v) => {
      if (!v.trim()) return null
      return /^-?\d+([.,]\d{1,2})?$/.test(v.trim()) ? null : "Solo números (ej: 1250.50)"
    },
  },
  {
    test: (k) => k.startsWith("hora"),
    validar: (v) => {
      if (!v.trim()) return null
      return /^\d{1,2}:\d{2}(:\d{2})?$/.test(v.trim()) ? null : "Formato: HH:MM o HH:MM:SS"
    },
  },
]

export function validarCampo(campo: string, valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null
  const str = String(valor)
  const clave = campo.toLowerCase()
  for (const regla of REGLAS) {
    if (regla.test(clave)) return regla.validar(str)
  }
  return null
}
