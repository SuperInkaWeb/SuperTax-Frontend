import { DataTable } from "@/features/datafilter/components/DataTable"
import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { SaveAsInline } from "@/features/datafilter/components/SaveAsInline"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

import type { AnalysisResult } from "@/features/datafilter/hooks/useAnalysisResult"
import type { Delimiter, DownloadFormat } from "@/features/datafilter/types"

interface ResultViewProps {
  result: AnalysisResult
  onDownload: (format: DownloadFormat, delimiter: Delimiter | undefined) => void
  downloading?: boolean
  onSave?: (name: string) => void
  saving?: boolean
  /** Permite ordenar por encabezado (no aplica al pivote). */
  sortable?: boolean
  totalsLabel?: string
  placeholder?: string
}

/** Zona de resultado de un análisis: descarga + guardar + tabla paginada ordenable. */
export function ResultView({
  result, onDownload, downloading, onSave, saving, sortable = true, totalsLabel, placeholder,
}: ResultViewProps) {
  const { ran, loading, error, data, offset, sort, limit, changePage, changeSort } = result

  if (!ran) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          {placeholder ?? "Configura la operación y pulsa “Ver” para previsualizar."}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <DownloadBar onDownload={onDownload} pending={downloading} />
        {onSave && <SaveAsInline onSave={onSave} pending={saving} />}
      </div>
      <Card>
        <CardContent className="p-0">
          {error ? (
            <p className="p-4 text-sm text-destructive">{error}</p>
          ) : !data ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <div className="p-3">
              <DataTable
                columns={data.columns}
                rows={data.rows}
                total={data.total_matched}
                limit={limit}
                offset={offset}
                loading={loading}
                onPageChange={changePage}
                totalsRow={data.totals}
                totalsLabel={totalsLabel}
                totalOriginal={data.total_original}
                sort={sort}
                onSort={sortable ? changeSort : undefined}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
