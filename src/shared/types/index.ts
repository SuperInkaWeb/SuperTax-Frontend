export interface Company {
  id: number
  ruc: string
  razon_social: string
  role_key: string
  modules: string[]
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
  can_resume: boolean
  igv_diferencia_total: number | null
  tiene_alertas_rojas: boolean | null
  escenario_a_count: number | null
  escenario_b_count: number | null
  escenario_c_count: number | null
  escenario_d_count: number | null
  propuesta_origen_at: string | null
  has_report: boolean
  has_csv_a: boolean
  has_csv_b: boolean
  has_csv_c: boolean
  has_csv_d: boolean
}
