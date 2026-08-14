import { CAMPOS_OCULTAR } from "@/features/scanner/constants"

import type { Documento } from "@/features/scanner/api"

/** ¿La clave/valor es una columna mostrable? (escalar y no oculta). */
export function esColumna(clave: string, valor: unknown): boolean {
  return !CAMPOS_OCULTAR.has(clave) && (valor === null || typeof valor !== "object")
}

/** Columnas escalares presentes en un conjunto de documentos (unión). */
export function columnasDe(docs: Documento[]): string[] {
  const cols = new Set<string>()
  docs.forEach((d) =>
    Object.entries(d.campos).forEach(([k, v]) => {
      if (esColumna(k, v)) cols.add(k)
    }),
  )
  return [...cols]
}

export function valorCampo(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "boolean") return v ? "Sí" : "No"
  return String(v)
}
