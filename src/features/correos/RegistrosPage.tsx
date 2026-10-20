import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  deleteRecord,
  exportRecords,
  listRecords,
  type FormatoReporte,
  type RecordFilters,
  type RecordSummary,
} from "@/features/correos/api"
import { AYUDA_COMPLETITUD, AYUDA_REVISION, COMPLETITUD, REVISION } from "@/features/correos/estados"
import { FormularioDeCorreccion } from "@/features/correos/FormularioDeCorreccion"
import { useAbrirDocumento } from "@/features/correos/hooks/useAbrirDocumento"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { DataTable } from "@/shared/ui/data-table"
import { Drawer } from "@/shared/ui/drawer"
import { EmptyState } from "@/shared/ui/empty-state"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { MoneyCell } from "@/shared/ui/money-cell"
import { PageHeader } from "@/shared/ui/page-header"
import { Select } from "@/shared/ui/select"
import { StatusBadge } from "@/shared/ui/status-badge"

import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"

const PAGINA = 25

export function RegistrosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const documento = useAbrirDocumento()

  const [ruc, setRuc] = useState("")
  const [rucInquilino, setRucInquilino] = useState("")
  const [periodoDesde, setPeriodoDesde] = useState("")
  const [periodoHasta, setPeriodoHasta] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [soloAprobados, setSoloAprobados] = useState(false)
  const [formato, setFormato] = useState<FormatoReporte>("xlsx")

  const [aplicados, setAplicados] = useState<RecordFilters>({})
  const [offset, setOffset] = useState(0)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [editando, setEditando] = useState<RecordSummary | null>(null)

  const registros = useQuery({
    queryKey: ["correos", "records", aplicados, offset],
    queryFn: () => listRecords({ ...aplicados, limit: PAGINA, offset }),
    enabled: companyId != null,
  })

  const exportar = useMutation({
    mutationFn: (ids?: number[]) => exportRecords({ ...aplicados, formato, ids }),
    onError: (err) => toast.error(apiError(err, "No se pudo exportar")),
  })
  const borrar = useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      toast.success("Registro eliminado")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["correos", "records"] })

  const aplicarFiltros = () => {
    setOffset(0)
    setSeleccion(new Set())
    setAplicados({
      ...(ruc ? { ruc } : {}),
      ...(rucInquilino ? { ruc_inquilino: rucInquilino } : {}),
      ...(periodoDesde ? { periodo_desde: periodoDesde } : {}),
      ...(periodoHasta ? { periodo_hasta: periodoHasta } : {}),
      ...(fechaDesde ? { fecha_desde: fechaDesde } : {}),
      ...(fechaHasta ? { fecha_hasta: fechaHasta } : {}),
      ...(soloAprobados ? { solo_aprobados: true } : {}),
    })
  }

  const eliminar = async (r: RecordSummary) => {
    const ok = await confirmar({
      title: "Eliminar registro",
      description: "Esta acción no se puede deshacer. El adjunto original se conserva.",
      destructive: true,
    })
    if (ok) borrar.mutate(r.id)
  }

  const columnas: ColumnDef<RecordSummary>[] = [
    { header: "RUC", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ruc_contribuyente ?? "—"}</span> },
    { header: "Nombre", cell: ({ row }) => row.original.nombre_contribuyente || "—" },
    { header: "Periodo", cell: ({ row }) => <span className="tabular-nums">{row.original.periodo ?? "—"}</span> },
    { header: "Fecha", cell: ({ row }) => <span className="whitespace-nowrap">{row.original.fecha_de_pago ?? "—"}</span> },
    { header: "Importe", cell: ({ row }) => <MoneyCell amount={row.original.importe_pagado} currency={row.original.moneda} /> },
    {
      header: "Estado",
      cell: ({ row }) => (
        <span title={AYUDA_COMPLETITUD[row.original.completitud]}>
          <StatusBadge value={row.original.completitud} map={COMPLETITUD} />
        </span>
      ),
    },
    {
      header: "Revisión",
      cell: ({ row }) => (
        <span title={AYUDA_REVISION[row.original.estado_de_revision]}>
          <StatusBadge value={row.original.estado_de_revision} map={REVISION} />
        </span>
      ),
    },
    { header: "Origen", cell: ({ row }) => <OrigenCell r={row.original} documento={documento} /> },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => eliminar(row.original)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registros extraídos"
        description="Consulta, corrige y exporta los datos tributarios extraídos de los adjuntos."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtrar registros</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              aplicarFiltros()
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="RUC arrendador">
                <Input value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} placeholder="11 dígitos" />
              </Campo>
              <Campo label="RUC inquilino">
                <Input value={rucInquilino} onChange={(e) => setRucInquilino(e.target.value)} maxLength={11} placeholder="11 dígitos" />
              </Campo>
              <Campo label="Solo aprobados">
                <label className="flex h-9 items-center gap-2 text-sm">
                  <input type="checkbox" checked={soloAprobados} onChange={(e) => setSoloAprobados(e.target.checked)} />
                  <span className="text-muted-foreground">Excluir pendientes y rechazados</span>
                </label>
              </Campo>
              <Campo label="Periodo desde (AAAAMM)">
                <Input value={periodoDesde} onChange={(e) => setPeriodoDesde(e.target.value)} maxLength={6} placeholder="202501" />
              </Campo>
              <Campo label="Periodo hasta (AAAAMM)">
                <Input value={periodoHasta} onChange={(e) => setPeriodoHasta(e.target.value)} maxLength={6} placeholder="202512" />
              </Campo>
              <div className="hidden lg:block" />
              <Campo label="Fecha de pago desde">
                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </Campo>
              <Campo label="Fecha de pago hasta">
                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </Campo>
            </div>
            <Button type="submit" variant="outline">
              Aplicar filtros
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Registros</CardTitle>
            <p className="text-sm text-muted-foreground">
              Marca filas para exportar solo esas, o exporta todo lo filtrado. Haz clic en una fila para corregirla.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={formato} onChange={(e) => setFormato(e.target.value as FormatoReporte)} aria-label="Formato del reporte" className="w-auto">
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </Select>
            <Button variant="outline" disabled={exportar.isPending || seleccion.size === 0} onClick={() => exportar.mutate([...seleccion].map(Number))}>
              Exportar seleccionados ({seleccion.size})
            </Button>
            <Button disabled={exportar.isPending} onClick={() => exportar.mutate(undefined)}>
              Exportar todo lo filtrado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AsyncBoundary
            query={registros}
            isEmpty={(d) => d.items.length === 0}
            empty={
              <EmptyState
                icon={FileText}
                title="Ningún registro con esos criterios"
                description="Lanza un escaneo o prueba a quitar los filtros."
              />
            }
          >
            {(data) => (
              <>
                <DataTable
                  columns={columnas}
                  data={data.items}
                  getRowId={(r) => String(r.id)}
                  selectable
                  selected={seleccion}
                  onSelectedChange={setSeleccion}
                  onRowClick={(r) => setEditando(r)}
                />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGINA))}>
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {offset + 1}–{offset + data.items.length} de {data.total}
                    {seleccion.size > 0 ? ` · ${seleccion.size} marcado${seleccion.size === 1 ? "" : "s"}` : ""}
                  </span>
                  <Button variant="outline" size="sm" disabled={offset + data.items.length >= data.total} onClick={() => setOffset((o) => o + PAGINA)}>
                    Siguiente
                  </Button>
                </div>
              </>
            )}
          </AsyncBoundary>
        </CardContent>
      </Card>

      <Drawer
        open={editando != null}
        onClose={() => setEditando(null)}
        title={editando ? `Registro #${editando.id}` : ""}
        className="max-w-lg"
      >
        {editando ? (
          <FormularioDeCorreccion
            registro={editando}
            onResuelto={() => {
              setEditando(null)
              invalidar()
            }}
          />
        ) : null}
      </Drawer>
    </div>
  )
}

function OrigenCell({
  r,
  documento,
}: {
  r: RecordSummary
  documento: ReturnType<typeof useAbrirDocumento>
}) {
  if (!r.origen.nombre_adjunto && !r.origen.remitente) return <>—</>
  return (
    <div className="flex max-w-[14rem] flex-col" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => void documento.abrir(r.id)}
        disabled={documento.cargando}
        title={r.origen.asunto || "Ver documento"}
        className="truncate text-left text-primary hover:underline disabled:opacity-60"
      >
        {documento.error ? "Reintentar" : r.origen.nombre_adjunto || "Ver documento"}
      </button>
      {r.origen.remitente ? (
        <span className="truncate text-xs text-muted-foreground">{r.origen.remitente}</span>
      ) : null}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
