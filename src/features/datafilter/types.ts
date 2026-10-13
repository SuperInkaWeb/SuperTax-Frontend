/** Contratos del módulo DataFilter (reflejan los schemas de FastAPI del backend). */

export type DatasetStatus = "pending" | "processing" | "ready" | "failed"
/** Cómo se creó el dataset: subido, o derivado de un análisis. */
export type DatasetOrigin = "uploaded" | "pivot" | "computed" | "replaced" | "deduped"

export interface ColumnInfo {
  name: string
  type: string
}

export interface DatasetSummary {
  id: number
  original_filename: string
  status: DatasetStatus
  origin: DatasetOrigin
  row_count: number | null
  size_bytes: number
  created_at: string
  error: string | null
}

export interface DatasetDetail extends DatasetSummary {
  columns: ColumnInfo[]
  sheets: string[]
  active_sheet: string | null
}

export interface DistinctValues {
  column: string
  values: string[]
  truncated: boolean
}

// ─────────────────────── Filtrado ───────────────────────
export type Operator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null"
  | "between"

export type Combinator = "and" | "or"
export type SortDirection = "asc" | "desc"
export type DownloadFormat = "csv" | "xlsx" | "txt"
/** Separador para la descarga en TXT (solo aplica a ese formato). */
export type Delimiter = "tab" | "pipe" | "semicolon" | "comma"

export type FilterValue = string | number | boolean | Array<string | number> | null

/** Hoja del árbol: una condición sobre una columna. */
export interface FilterLeaf {
  type: "condition"
  column: string
  operator: Operator
  value?: FilterValue
}

/** Grupo del árbol: un conector (AND/OR) con hijos (hojas u otros grupos). */
export interface FilterGroup {
  type: "group"
  combinator: Combinator
  children: FilterNode[]
}

export type FilterNode = FilterLeaf | FilterGroup

export interface SortSpec {
  column: string
  direction: SortDirection
}

export interface FilterRequest {
  filter: FilterGroup | null // árbol raíz; null = sin filtro
  select: string[]
  sort: SortSpec[]
}

export interface PreviewRequest extends FilterRequest {
  limit: number
  offset: number
  search?: string | null // búsqueda global (aparece en cualquier columna)
}

export interface PreviewResponse {
  columns: string[]
  rows: Array<Record<string, unknown>>
  total_matched: number
  limit: number
  offset: number
}

export interface DownloadRequest extends FilterRequest {
  format: DownloadFormat
  delimiter?: Delimiter // solo se envía cuando format === "txt"
  search?: string | null
}

// ─────────────────────── Columnas calculadas ───────────────────────
export type FunctionName =
  | "concat"
  | "upper"
  | "lower"
  | "trim"
  | "length"
  | "substr"
  | "replace"
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "round"
  | "if"
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or"
  | "not"
  | "year"
  | "month"
  | "day"
  | "datediff_days"

export type Expression =
  | { kind: "column"; name: string }
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "function"; fn: FunctionName; args: Expression[] }

export interface ComputedColumn {
  name: string
  expression: Expression
}

export interface ComputeRequest {
  filter: FilterGroup | null
  columns: ComputedColumn[]
  order_column?: string | null
  order_direction?: SortDirection
  limit: number
  offset: number
}

export interface ComputeSaveRequest {
  filter: FilterGroup | null
  columns: ComputedColumn[]
  name: string
}

export interface ComputeDownloadRequest {
  filter: FilterGroup | null
  columns: ComputedColumn[]
  format: DownloadFormat
  delimiter?: Delimiter
}

// ─────────────────────── Buscar y reemplazar ───────────────────────
export type MatchMode = "exact" | "contains"

export interface ReplacementRule {
  column: string
  mode: MatchMode
  search: string
  replace: string
  case_sensitive?: boolean // solo aplica al modo "exact"
}

export interface ReplaceRequest {
  filter: FilterGroup | null
  replacements: ReplacementRule[]
  order_column?: string | null
  order_direction?: SortDirection
  limit: number
  offset: number
}

export interface ReplaceSaveRequest {
  filter: FilterGroup | null
  replacements: ReplacementRule[]
  name: string
}

export interface ReplaceDownloadRequest {
  filter: FilterGroup | null
  replacements: ReplacementRule[]
  format: DownloadFormat
  delimiter?: Delimiter
}

// ─────────────────────── Eliminar duplicados ───────────────────────
/** key_columns vacío = fila completa idéntica; con columnas = una fila por combinación. */
export interface DedupeRequest {
  filter: FilterGroup | null
  key_columns: string[]
  order_column?: string | null
  order_direction?: SortDirection
  limit: number
  offset: number
}

export interface DedupeResponse extends PreviewResponse {
  total_original: number
}

export interface DedupeSaveRequest {
  filter: FilterGroup | null
  key_columns: string[]
  name: string
}

export interface DedupeDownloadRequest {
  filter: FilterGroup | null
  key_columns: string[]
  format: DownloadFormat
  delimiter?: Delimiter
}

// ─────────────────────── Tablas dinámicas (pivote) ───────────────────────
export type Aggregation = "count" | "count_distinct" | "sum" | "avg" | "min" | "max"

/** Una métrica: agregación sobre una columna (column ausente = conteo de filas). */
export interface Measure {
  column?: string | null
  aggregation: Aggregation
}

/** Orden del reporte: por una columna de agrupación o por una métrica (índice). */
export interface PivotSort {
  column?: string | null
  measure_index?: number | null
  direction: SortDirection
}

export interface PivotRequest {
  filter: FilterGroup | null
  group_by: string[]
  measures: Measure[]
  pivot_column?: string | null // cross-tab opcional
  sort?: PivotSort | null
  percent_of_total?: boolean
  limit: number
  offset: number
}

export interface PivotResponse {
  columns: string[]
  rows: Array<Record<string, unknown>>
  total_matched: number
  limit: number
  offset: number
  totals?: Record<string, unknown> | null // fila de Total general (solo vista previa)
}

export interface PivotSaveRequest {
  filter: FilterGroup | null
  group_by: string[]
  measures: Measure[]
  pivot_column?: string | null
  sort?: PivotSort | null
  percent_of_total?: boolean
  name: string
}

export interface PivotDownloadRequest {
  filter: FilterGroup | null
  group_by: string[]
  measures: Measure[]
  pivot_column?: string | null
  sort?: PivotSort | null
  percent_of_total?: boolean
  format: DownloadFormat
  delimiter?: Delimiter
}

// ─────────────────────── Estadísticas por columna ───────────────────────
export interface StatsRequest {
  filter: FilterGroup | null
  column: string
}

export interface TopValue {
  value: string
  count: number
}

export interface ColumnStats {
  column: string
  is_numeric: boolean
  total: number
  non_null: number
  nulls: number
  distinct: number
  minimum: string | number | null
  maximum: string | number | null
  total_sum: number | null
  average: number | null
  top_values: TopValue[]
}
