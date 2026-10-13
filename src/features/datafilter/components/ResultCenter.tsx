import { ArrowLeft } from "lucide-react"

import { DataTable } from "@/features/datafilter/components/DataTable"
import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { SaveAsInline } from "@/features/datafilter/components/SaveAsInline"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"

import type { AnalysisResult } from "@/features/datafilter/hooks/useAnalysisResult"
import type { Delimiter, DownloadFormat } from "@/features/datafilter/types"

interface ResultCenterProps {
  toolTitle: string
  result: AnalysisResult
  sortable: boolean
  totalsLabel?: string
  onDownload: (format: DownloadFormat, delimiter: Delimiter | undefined) => void
  downloading: boolean
  onSave?: (name: string) => void
  saving: boolean
  onClose: () => void
}

/** Resultado de una herramienta, mostrado al centro (reemplaza la tabla de datos). */
export function ResultCenter({
  toolTitle, result, sortable, totalsLabel, onDownload, downloading, onSave, saving, onClose,
}: ResultCenterProps) {
  const { loading, error, data, offset, sort, limit, changePage, changeSort } = result

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-sm font-semibold">Vista previa del resultado</p>
          <p className="text-xs text-muted-foreground">{toolTitle} · guárdalo o descárgalo aquí</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadBar onDownload={onDownload} pending={downloading} />
          {onSave && <SaveAsInline onSave={onSave} pending={saving} />}
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="size-4" />
            Volver a los datos
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p className="p-4 text-sm text-destructive">{error}</p>
        ) : !data ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
