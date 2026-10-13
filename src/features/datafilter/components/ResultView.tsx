import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { PreviewTable } from "@/features/datafilter/components/PreviewTable"
import { SaveAsInline } from "@/features/datafilter/components/SaveAsInline"
import { formatRows } from "@/features/datafilter/lib"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

import type { Delimiter, DownloadFormat } from "@/features/datafilter/types"

interface ResultViewProps {
  loading: boolean
  error: string | null
  columns: string[]
  rows: Array<Record<string, unknown>>
  total: number | null
  totals?: Record<string, unknown> | null
  countLabel?: string
  onDownload: (format: DownloadFormat, delimiter: Delimiter | undefined) => void
  downloading?: boolean
  onSave?: (name: string) => void
  saving?: boolean
  /** Mensaje cuando aún no se ha ejecutado la vista. */
  placeholder?: string
}

/** Zona de resultado común a los análisis: conteo + descarga + guardar + tabla. */
export function ResultView({
  loading, error, columns, rows, total, totals,
  countLabel = "filas", onDownload, downloading, onSave, saving, placeholder,
}: ResultViewProps) {
  const hayResultado = columns.length > 0

  return (
    <div className="space-y-4">
      {hayResultado && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {total == null ? "" : `${formatRows(total)} ${countLabel}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadBar onDownload={onDownload} pending={downloading} />
            {onSave && <SaveAsInline onSave={onSave} pending={saving} />}
          </div>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : error ? (
            <p className="p-4 text-sm text-destructive">{error}</p>
          ) : hayResultado ? (
            <PreviewTable columns={columns} rows={rows} totals={totals} />
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {placeholder ?? "Configura la operación y pulsa “Ver” para previsualizar."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
