/** Contrato de las herramientas que muestran su resultado al centro (no en el drawer). */
import type { ResultSort } from "@/features/datafilter/components/DataTable"
import type { ResultData } from "@/features/datafilter/hooks/useAnalysisResult"
import type { Delimiter, DownloadFormat, FilterGroup } from "@/features/datafilter/types"

/** Trae una página del resultado, opcionalmente ordenada por una columna del resultado. */
export type ResultFetcher = (offset: number, sort: ResultSort | null) => Promise<ResultData>

/** Acciones que la herramienta registra junto a su resultado (descargar/guardar). */
export interface ToolPreview {
  countLabel?: string
  sortable?: boolean
  totalsLabel?: string
  download: (format: DownloadFormat, delimiter: Delimiter | undefined) => Promise<void>
  save?: (name: string) => Promise<void>
}

/** Props comunes de un panel de configuración de herramienta (config en el drawer). */
export interface ToolProps {
  datasetId: number
  columns: string[]
  filter: FilterGroup | null
  onPreview: (fetcher: ResultFetcher, options: ToolPreview) => void
}
