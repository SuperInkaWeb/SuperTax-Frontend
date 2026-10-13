import { Search } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { downloadDataset } from "@/features/datafilter/api"
import { DataGrid } from "@/features/datafilter/components/DataGrid"
import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { apiError } from "@/shared/lib/api/error"
import { Input } from "@/shared/ui/input"

import type { Delimiter, DownloadFormat, FilterGroup, SortSpec } from "@/features/datafilter/types"

interface DatosPanelProps {
  datasetId: number
  filter: FilterGroup | null
}

/** Vista de datos: grilla virtualizada con búsqueda global, orden y descarga. */
export function DatosPanel({ datasetId, filter }: DatosPanelProps) {
  const [sort, setSort] = useState<SortSpec | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [descargando, setDescargando] = useState(false)

  // Debounce de la búsqueda (evita una petición por tecla).
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  function alOrdenar(column: string) {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: "asc" }
      if (prev.direction === "asc") return { column, direction: "desc" }
      return null
    })
  }

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    setDescargando(true)
    try {
      await downloadDataset(datasetId, {
        filter, select: [], sort: sort ? [sort] : [], search: search || null, format, delimiter,
      })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar en cualquier columna…"
            className="w-72 pl-8"
          />
        </div>
        <DownloadBar onDownload={descargar} pending={descargando} />
      </div>

      <DataGrid datasetId={datasetId} filter={filter} sort={sort} search={search} onSort={alOrdenar} />
    </div>
  )
}
