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

/** Fila aplanada de un documento multi-registro: un registro + su archivo origen. */
export interface FilaRegistro {
  archivo: string
  docId: number
  [campo: string]: unknown
}

/** Aplana los `registros` de documentos multi-registro: una fila por registro,
 *  con el nombre de archivo de origen como referencia. */
export function filasDeRegistros(docs: Documento[]): FilaRegistro[] {
  const out: FilaRegistro[] = []
  docs.forEach((d) => {
    const regs = (d.campos.registros as Record<string, unknown>[] | undefined) ?? []
    regs.forEach((r) => out.push({ archivo: d.nombre_archivo, docId: d.id, ...r }))
  })
  return out
}

/** Columnas escalares de un conjunto de filas de registro (sin `archivo`/`docId`,
 *  que se tratan aparte). */
export function columnasDeRegistros(filas: FilaRegistro[]): string[] {
  const cols = new Set<string>()
  filas.forEach((f) =>
    Object.entries(f).forEach(([k, v]) => {
      if (k === "archivo" || k === "docId" || k === "file_url") return
      if (v === null || typeof v !== "object") cols.add(k)
    }),
  )
  return [...cols]
}
