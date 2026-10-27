import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Database, PanelLeft, Search, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  changeSheet,
  deleteDataset,
  downloadDataset,
  getDataset,
  listDatasets,
  uploadDatasetSmart,
} from "@/features/datafilter/api"
import { DataGrid } from "@/features/datafilter/components/DataGrid"
import { DatasetList } from "@/features/datafilter/components/DatasetList"
import { DownloadBar } from "@/features/datafilter/components/DownloadBar"
import { Drawer } from "@/features/datafilter/components/Drawer"
import { FilterBuilder } from "@/features/datafilter/components/FilterBuilder"
import { ResultCenter } from "@/features/datafilter/components/ResultCenter"
import { Ribbon } from "@/features/datafilter/components/Ribbon"
import { UploadDropzone } from "@/features/datafilter/components/UploadDropzone"
import { useAnalysisResult } from "@/features/datafilter/hooks/useAnalysisResult"
import { enProceso, formatRows } from "@/features/datafilter/lib"
import { ChartPanel } from "@/features/datafilter/panels/ChartPanel"
import { ComputePanel } from "@/features/datafilter/panels/ComputePanel"
import { DedupePanel } from "@/features/datafilter/panels/DedupePanel"
import { PivotPanel } from "@/features/datafilter/panels/PivotPanel"
import { ReplacePanel } from "@/features/datafilter/panels/ReplacePanel"
import { StatsPanel } from "@/features/datafilter/panels/StatsPanel"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { cn } from "@/shared/lib/utils"
import { EmptyState } from "@/shared/ui/empty-state"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { WorkspaceMode } from "@/features/datafilter/components/Ribbon"
import type { ResultFetcher, ToolPreview } from "@/features/datafilter/components/tool"
import type { ReactNode } from "react"
import type {
  DatasetSummary,
  Delimiter,
  DownloadFormat,
  FilterGroup,
  FilterNode,
  SortSpec,
} from "@/features/datafilter/types"

type OriginTab = "uploaded" | "derived"

const TOOL_TITLES: Record<WorkspaceMode, { title: string; description: string }> = {
  filter: { title: "Filtrar", description: "Incluye solo las filas que cumplan tus condiciones." },
  pivot: { title: "Tabla dinámica", description: "Agrupa, calcula métricas y guarda el resumen como archivo." },
  compute: { title: "Columnas calculadas", description: "Crea columnas nuevas (unir, cálculos, fechas, SI)." },
  replace: { title: "Buscar y reemplazar", description: "Corrige valores por columna con reglas." },
  dedupe: { title: "Quitar duplicados", description: "Elimina filas repetidas (por fila completa o por columnas clave)." },
  stats: { title: "Estadísticas", description: "Perfil de una columna: conteos, mín/máx, suma y valores frecuentes." },
  chart: { title: "Gráfico", description: "Barras del top-N de una categoría por una métrica." },
}

function contarCondiciones(node: FilterGroup): number {
  return node.children.reduce(
    (total: number, child: FilterNode) =>
      total + (child.type === "group" ? contarCondiciones(child) : 1),
    0,
  )
}

/** Drawer de una herramienta, con su título/descripción del catálogo. */
function ToolDrawer({
  mode, activeTool, onClose, children,
}: {
  mode: WorkspaceMode
  activeTool: WorkspaceMode | null
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Drawer
      open={activeTool === mode}
      title={TOOL_TITLES[mode].title}
      description={TOOL_TITLES[mode].description}
      onClose={onClose}
    >
      {children}
    </Drawer>
  )
}

export function WorkspacePage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<FilterGroup | null>(null)
  const [sort, setSort] = useState<SortSpec | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [activeTool, setActiveTool] = useState<WorkspaceMode | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [originTab, setOriginTab] = useState<OriginTab>("uploaded")
  const [total, setTotal] = useState<number | null>(null)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [descargando, setDescargando] = useState(false)

  // Resultado de una herramienta (pivote/columnas/reemplazar/duplicados) al centro.
  const result = useAnalysisResult()
  const [toolOptions, setToolOptions] = useState<ToolPreview | null>(null)
  const [resultTool, setResultTool] = useState<WorkspaceMode | null>(null)
  const [resultDownloading, setResultDownloading] = useState(false)
  const [resultSaving, setResultSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const datasetsQuery = useQuery({
    queryKey: ["datafilter", "datasets", companyId],
    queryFn: listDatasets,
    enabled: companyId != null,
    refetchInterval: (q) => (q.state.data?.some((d) => enProceso(d.status)) ? 3000 : false),
  })
  const datasets = datasetsQuery.data ?? []

  const detalle = useQuery({
    queryKey: ["datafilter", "dataset", selectedId],
    queryFn: () => getDataset(selectedId as number),
    enabled: selectedId != null,
    refetchInterval: (q) => (q.state.data && enProceso(q.state.data.status) ? 3000 : false),
  })
  const ds = detalle.data

  // Deselecciona si el dataset activo desaparece de la lista.
  useEffect(() => {
    if (selectedId != null && !datasets.some((d) => d.id === selectedId)) setSelectedId(null)
  }, [datasets, selectedId])

  const esDerivado = (d: DatasetSummary) => d.origin !== "uploaded"
  const visibles = datasets.filter((d) =>
    originTab === "uploaded" ? !esDerivado(d) : esDerivado(d),
  )
  const nSubidos = datasets.filter((d) => !esDerivado(d)).length
  const nDerivados = datasets.filter(esDerivado).length

  function cerrarResultado() {
    result.reset()
    setToolOptions(null)
    setResultTool(null)
  }

  function seleccionar(dataset: DatasetSummary) {
    setSelectedId(dataset.id)
    setFilter(null)
    setSort(null)
    setSearchInput("")
    setSearch("")
    setActiveTool(null)
    setTotal(null)
    setSidebarOpen(false)
    cerrarResultado()
  }

  function runPreview(mode: WorkspaceMode, fetcher: ResultFetcher, options: ToolPreview) {
    setResultTool(mode)
    setToolOptions(options)
    result.run(fetcher)
    setActiveTool(null) // cierra el drawer para ver el resultado a lo ancho
  }

  async function descargarResultado(format: DownloadFormat, delimiter: Delimiter | undefined) {
    if (!toolOptions) return
    setResultDownloading(true)
    try {
      await toolOptions.download(format, delimiter)
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setResultDownloading(false)
    }
  }

  async function guardarResultado(name: string) {
    if (!toolOptions?.save) return
    setResultSaving(true)
    try {
      await toolOptions.save(name)
      toast.success("Guardando… aparecerá en Reportes al terminar")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
      setOriginTab("derived")
    } catch (e) {
      toast.error(apiError(e, "No se pudo guardar"))
    } finally {
      setResultSaving(false)
    }
  }

  const subir = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        setProgreso(0)
        await uploadDatasetSmart(file, setProgreso)
      }
    },
    onSuccess: () => {
      toast.success("Archivo(s) subido(s). Procesando…")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo subir")),
    onSettled: () => setProgreso(null),
  })

  const eliminar = useMutation({
    mutationFn: (id: number) => deleteDataset(id),
    onSuccess: () => {
      toast.success("Dataset eliminado")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo eliminar")),
  })

  const cambiarHoja = useMutation({
    mutationFn: (sheet: string) => changeSheet(selectedId as number, sheet),
    onSuccess: () => {
      toast.success("Reprocesando con la nueva hoja…")
      setFilter(null)
      setSort(null)
      setActiveTool(null)
      queryClient.invalidateQueries({ queryKey: ["datafilter", "dataset", selectedId] })
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo cambiar de hoja")),
  })

  function alternarHerramienta(tool: WorkspaceMode) {
    cerrarResultado() // el resultado anterior no aplica a otra herramienta
    setActiveTool((cur) => (cur === tool ? null : tool))
  }

  function alOrdenar(column: string) {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: "asc" }
      if (prev.direction === "asc") return { column, direction: "desc" }
      return null
    })
  }

  async function descargar(format: DownloadFormat, delimiter: Delimiter | undefined) {
    if (selectedId == null) return
    setDescargando(true)
    try {
      await downloadDataset(selectedId, {
        filter, select: [], sort: sort ? [sort] : [], search: search || null, format, delimiter,
      })
    } catch (e) {
      toast.error(apiError(e, "No se pudo descargar"))
    } finally {
      setDescargando(false)
    }
  }

  const columnas = ds?.columns.map((c) => c.name) ?? []

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* ── Lista de datasets (izquierda, colapsable) ── */}
      {sidebarOpen && (
        <aside className="flex w-80 shrink-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">DataFilter</h1>
          </div>
          <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 text-sm">
            <button
              type="button"
              onClick={() => setOriginTab("uploaded")}
              className={cn(
                "flex-1 rounded-md px-2 py-1 transition-colors",
                originTab === "uploaded" ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              Originales ({nSubidos})
            </button>
            <button
              type="button"
              onClick={() => setOriginTab("derived")}
              className={cn(
                "flex-1 rounded-md px-2 py-1 transition-colors",
                originTab === "derived" ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              Reportes ({nDerivados})
            </button>
          </div>
          <Card className="min-h-0 flex-1 overflow-y-auto p-0">
            {datasetsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <DatasetList
                datasets={visibles}
                selectedId={selectedId}
                onSelect={seleccionar}
                onDelete={(d) => eliminar.mutate(d.id)}
              />
            )}
          </Card>
          <UploadDropzone onUpload={(files) => subir.mutate(files)} busy={subir.isPending} progress={progreso} />
        </aside>
      )}

      {/* ── Área de trabajo (derecha) ── */}
      <section className="relative flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        {selectedId == null || !ds ? (
          <EmptyState
            icon={Database}
            title={sidebarOpen ? "Elige un archivo" : "DataFilter"}
            description="Selecciona un dataset de la izquierda (o sube uno) para filtrarlo y analizarlo."
            action={
              !sidebarOpen ? (
                <Button variant="outline" onClick={() => setSidebarOpen(true)}>
                  <PanelLeft className="size-4" />
                  Ver datasets
                </Button>
              ) : undefined
            }
          />
        ) : enProceso(ds.status) ? (
          <EmptyState
            icon={Database}
            title="Procesando el archivo…"
            description="Esto puede tardar según el tamaño. Se abrirá automáticamente al terminar."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => setSidebarOpen((o) => !o)} aria-label="Datasets">
                <PanelLeft className="size-4" />
              </Button>
              <Ribbon mode={activeTool} onChange={alternarHerramienta} />

              {ds.sheets.length > 1 && (
                <Select
                  value={ds.active_sheet ?? ds.sheets[0]}
                  onChange={(e) => cambiarHoja.mutate(e.target.value)}
                  disabled={cambiarHoja.isPending}
                  className="h-9 w-40"
                >
                  {ds.sheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}

              {filter && (
                <Badge tone="info">
                  Filtro activo ({contarCondiciones(filter)}
                  {total != null ? ` · ${formatRows(total)} filas` : ""})
                  <button
                    type="button"
                    onClick={() => setFilter(null)}
                    aria-label="Quitar filtro"
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              )}

              <div className="relative ml-auto">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar en todo el archivo…"
                  className="h-9 w-64 pl-8"
                />
              </div>
            </div>

            <Card className="min-h-0 flex-1 overflow-hidden">
              <CardContent className="flex h-full min-h-0 flex-col gap-3 pt-4">
                {result.ran ? (
                  <ResultCenter
                    toolTitle={resultTool ? TOOL_TITLES[resultTool].title : ""}
                    result={result}
                    sortable={toolOptions?.sortable ?? false}
                    totalsLabel={toolOptions?.totalsLabel}
                    onDownload={descargarResultado}
                    downloading={resultDownloading}
                    onSave={toolOptions?.save ? guardarResultado : undefined}
                    saving={resultSaving}
                    onClose={cerrarResultado}
                  />
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium">{ds.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {ds.columns.length} columnas · {formatRows(ds.row_count)} filas
                        {filter ? " · filtro activo" : ""}
                      </p>
                    </div>
                    <div className="min-h-0 flex-1">
                      <DataGrid
                        key={`${ds.id}-${ds.active_sheet ?? ""}`}
                        datasetId={ds.id}
                        filter={filter}
                        sort={sort}
                        search={search}
                        onSort={alOrdenar}
                        onTotal={setTotal}
                      />
                    </div>
                    <div className="flex items-center justify-end border-t pt-3">
                      <DownloadBar onDownload={descargar} pending={descargando} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Drawers de herramientas (sobre la tabla; la tabla sigue visible) ── */}
            <Drawer
              open={activeTool === "filter"}
              title={TOOL_TITLES.filter.title}
              description={TOOL_TITLES.filter.description}
              onClose={() => setActiveTool(null)}
            >
              <FilterBuilder
                key={`filter-${ds.id}`}
                datasetId={ds.id}
                columns={ds.columns}
                onApply={(f) => {
                  setFilter(f)
                  setActiveTool(null)
                }}
              />
            </Drawer>

            <ToolDrawer mode="pivot" activeTool={activeTool} onClose={() => setActiveTool(null)}>
              <PivotPanel
                key={`p-${ds.id}`}
                datasetId={ds.id}
                columns={columnas}
                filter={filter}
                onPreview={(f, o) => runPreview("pivot", f, o)}
              />
            </ToolDrawer>
            <ToolDrawer mode="compute" activeTool={activeTool} onClose={() => setActiveTool(null)}>
              <ComputePanel
                key={`c-${ds.id}`}
                datasetId={ds.id}
                columns={columnas}
                filter={filter}
                onPreview={(f, o) => runPreview("compute", f, o)}
              />
            </ToolDrawer>
            <ToolDrawer mode="replace" activeTool={activeTool} onClose={() => setActiveTool(null)}>
              <ReplacePanel
                key={`r-${ds.id}`}
                datasetId={ds.id}
                columns={columnas}
                filter={filter}
                onPreview={(f, o) => runPreview("replace", f, o)}
              />
            </ToolDrawer>
            <ToolDrawer mode="dedupe" activeTool={activeTool} onClose={() => setActiveTool(null)}>
              <DedupePanel
                key={`d-${ds.id}`}
                datasetId={ds.id}
                columns={columnas}
                filter={filter}
                onPreview={(f, o) => runPreview("dedupe", f, o)}
              />
            </ToolDrawer>
            <ToolDrawer mode="stats" activeTool={activeTool} onClose={() => setActiveTool(null)}>
              <StatsPanel key={`s-${ds.id}`} datasetId={ds.id} columns={columnas} filter={filter} />
            </ToolDrawer>
            <ToolDrawer mode="chart" activeTool={activeTool} onClose={() => setActiveTool(null)}>
              <ChartPanel key={`g-${ds.id}`} datasetId={ds.id} columns={columnas} filter={filter} />
            </ToolDrawer>
          </>
        )}
      </section>
    </div>
  )
}
