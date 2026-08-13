export interface Company {
  id: number
  ruc: string
  razon_social: string
}

export interface Me {
  id: number
  email: string
  nombre: string
  is_platform_admin: boolean
  companies: Company[]
}

export type JobStatus = "en_cola" | "procesando" | "completado" | "error"
export type TipoLibro = "compras" | "ventas"

export interface ReconciliationJob {
  id: number
  periodo: string
  tipo_libro: TipoLibro
  status: JobStatus
  empresa_filename: string | null
  created_at: string
  completed_at: string | null
  error_message: string | null
  igv_diferencia_total: number | null
  tiene_alertas_rojas: boolean | null
  has_report: boolean
}
