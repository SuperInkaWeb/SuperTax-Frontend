import { api } from "@/shared/lib/api/client"

import type { ReconciliationJob, TipoLibro } from "@/shared/types"

// ─────────────────────── Conciliaciones ───────────────────────
export async function listJobs(): Promise<ReconciliationJob[]> {
  const { data } = await api.get<ReconciliationJob[]>("/api/sire/jobs")
  return data
}

export interface CreateJobInput {
  periodo: string
  tipo_libro: TipoLibro
  archivo: File
  sin_sire: boolean
  reutilizar_propuesta: boolean
  cobertura_fechas: string[] | null
  mapeo_columnas?: MapeoConfig | null
  guardar_formato?: boolean
}

export async function createJob(input: CreateJobInput): Promise<ReconciliationJob> {
  const form = new FormData()
  form.append("periodo", input.periodo)
  form.append("tipo_libro", input.tipo_libro)
  form.append("archivo", input.archivo)
  form.append("sin_sire", String(input.sin_sire))
  form.append("reutilizar_propuesta", String(input.reutilizar_propuesta))
  if (input.tipo_libro === "ventas" && input.cobertura_fechas !== null) {
    form.append("cobertura_fechas", JSON.stringify(input.cobertura_fechas))
  }
  if (input.mapeo_columnas) {
    form.append("mapeo_columnas", JSON.stringify(input.mapeo_columnas))
  }
  if (input.guardar_formato) form.append("guardar_formato", "true")
  // Content-Type undefined → el navegador fija multipart con su boundary.
  const { data } = await api.post<ReconciliationJob>("/api/sire/jobs", form, {
    headers: { "Content-Type": undefined },
  })
  return data
}

export async function getJob(jobId: number): Promise<ReconciliationJob> {
  const { data } = await api.get<ReconciliationJob>(`/api/sire/jobs/${jobId}`)
  return data
}

export async function resumeJob(jobId: number): Promise<ReconciliationJob> {
  const { data } = await api.post<ReconciliationJob>(`/api/sire/jobs/${jobId}/resume`)
  return data
}

export interface PropuestaDisponible {
  disponible: boolean
  generado_a: string | null
}

export async function propuestaDisponible(
  periodo: string,
  tipoLibro: TipoLibro,
): Promise<PropuestaDisponible> {
  const { data } = await api.get<PropuestaDisponible>("/api/sire/propuesta-disponible", {
    params: { periodo, tipo_libro: tipoLibro },
  })
  return data
}

// ─────────────────────── Credenciales SUNAT ───────────────────────
export interface CredentialsStatus {
  configured: boolean
  usuario_sol: string | null
  client_id: string | null
  updated_at: string | null
}

export interface CredentialsInput {
  usuario_sol: string
  clave_sol: string
  client_id: string
  client_secret: string
}

export async function getCredentials(): Promise<CredentialsStatus> {
  const { data } = await api.get<CredentialsStatus>("/api/sire/credentials")
  return data
}

export async function setCredentials(input: CredentialsInput): Promise<CredentialsStatus> {
  const { data } = await api.put<CredentialsStatus>("/api/sire/credentials", input)
  return data
}

// ─────────────────────── Formato de archivo ───────────────────────
export interface SavedMapping extends MapeoConfig {
  tipo_libro: TipoLibro
  updated_at: string | null
}

export async function getSavedMapping(tipoLibro: TipoLibro): Promise<SavedMapping | null> {
  const { data } = await api.get<SavedMapping | null>("/api/sire/file-mapping", {
    params: { tipo_libro: tipoLibro },
  })
  return data
}

export async function deleteSavedMapping(tipoLibro: TipoLibro): Promise<void> {
  await api.delete("/api/sire/file-mapping", { params: { tipo_libro: tipoLibro } })
}

export interface ColumnaArchivo {
  idx: number
  header: string | null
  muestras: string[]
}

export interface CampoRequerido {
  campo: string
  etiqueta: string
  obligatorio: boolean
}

export interface MapeoConfig {
  delimiter: string
  encoding: string
  has_header: boolean
  skip_rows: number
  serie_numero_combinado: boolean
  columnas: Record<string, number>
}

export type NivelMapeo = "ple" | "plataforma" | "guardado" | "sugerido" | "desconocido"

export interface ValidacionMapeo {
  ok: boolean
  aritmetica_pct: number | null
  faltantes: string[]
  avisos: string[]
}

export interface AnalisisArchivo {
  nivel: NivelMapeo
  formato: string | null
  config: MapeoConfig
  columnas_archivo: ColumnaArchivo[]
  campos: CampoRequerido[]
  validacion: ValidacionMapeo
  solo_lectura: boolean
  fechas_detectadas: string[]
}

export async function analizarArchivo(
  tipoLibro: TipoLibro,
  archivo: File,
  skipRows?: number,
): Promise<AnalisisArchivo> {
  const form = new FormData()
  form.append("tipo_libro", tipoLibro)
  form.append("archivo", archivo)
  if (skipRows !== undefined) form.append("skip_rows", String(skipRows))
  const { data } = await api.post<AnalisisArchivo>(
    "/api/sire/file-mapping/analizar",
    form,
    { headers: { "Content-Type": undefined } },
  )
  return data
}

export async function validarMapeo(
  tipoLibro: TipoLibro,
  config: MapeoConfig,
  archivo: File,
): Promise<ValidacionMapeo> {
  const form = new FormData()
  form.append("tipo_libro", tipoLibro)
  form.append("config", JSON.stringify(config))
  form.append("archivo", archivo)
  const { data } = await api.post<ValidacionMapeo>(
    "/api/sire/file-mapping/validar",
    form,
    { headers: { "Content-Type": undefined } },
  )
  return data
}

export async function guardarFormato(
  tipoLibro: TipoLibro,
  config: MapeoConfig,
  archivo: File,
): Promise<void> {
  const form = new FormData()
  form.append("tipo_libro", tipoLibro)
  form.append("config", JSON.stringify(config))
  form.append("archivo", archivo)
  await api.post("/api/sire/file-mapping/guardar", form, {
    headers: { "Content-Type": undefined },
  })
}

// ─────────────────────── Descargas ───────────────────────
async function descargar(url: string, fallback: string): Promise<void> {
  const resp = await api.get(url, { responseType: "blob" })
  const disposition = resp.headers["content-disposition"] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const nombre = match ? match[1] : fallback
  const objectUrl = URL.createObjectURL(resp.data as Blob)
  const enlace = document.createElement("a")
  enlace.href = objectUrl
  enlace.download = nombre
  enlace.click()
  URL.revokeObjectURL(objectUrl)
}

export function descargarReporte(jobId: number): Promise<void> {
  return descargar(`/api/sire/jobs/${jobId}/report`, `reporte-${jobId}.xlsx`)
}

export function descargarCsv(jobId: number, escenario: "a" | "b" | "c" | "d"): Promise<void> {
  return descargar(
    `/api/sire/jobs/${jobId}/report/csv/${escenario}`,
    `escenario-${escenario}-${jobId}.csv`,
  )
}
