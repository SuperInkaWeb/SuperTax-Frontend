import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Table as TableIcon } from "lucide-react"
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
import { FormularioDeCorreccion } from "@/features/correos/FormularioDeCorreccion"
import { useAbrirDocumento } from "@/features/correos/hooks/useAbrirDocumento"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge, type Tone } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { PageHeader } from "@/shared/ui/page-header"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

const PAGINA = 25

const COMPLETITUD: Record<string, { label: string; tone: Tone; ayuda: string }> = {
  complete: { label: "Completo", tone: "success", ayuda: "Se leyeron todos los datos clave con confianza" },
  partial: { label: "Parcial", tone: "info", ayuda: "Falta algún dato clave o se leyó con poca confianza" },
  empty: { label: "Vacío", tone: "danger", ayuda: "No se reconoció como constancia de pago" },
}

const REVISION: Record<string, { label: string; tone: Tone; ayuda: string }> = {
  not_required: { label: "No requiere", tone: "neutral", ayuda: "El sistema lo dio por bueno; nadie tiene que revisarlo" },
  pending: { label: "Pendiente", tone: "info", ayuda: "Necesita que una persona lo revise y confirme" },
  approved: { label: "Aprobado", tone: "success", ayuda: "Una persona lo revisó y lo aprobó" },
  rejected: { label: "Rechazado", tone: "danger", ayuda: "Marcado como no válido (documento ilegible o ajeno)" },
}

export function RegistrosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

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
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())

  const registros = useQuery({
    queryKey: ["correos", "records", aplicados, offset],
    queryFn: () => listRecords({ ...aplicados, limit: PAGINA, offset }),
    enabled: companyId != null,
  })

  const exportar = useMutation({
    mutationFn: (ids?: number[]) => exportRecords({ ...aplicados, formato, ids }),
    onError: (err) => toast.error(apiError(err, "No se pudo exportar")),
  })

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

  const filas = registros.data?.items ?? []
  const total = registros.data?.total ?? 0
  const hayMas = offset + filas.length < total

  const alternar = (id: number) =>
    setSeleccion((prev) => {
      const copia = new Set(prev)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  const todasMarcadas = filas.length > 0 && filas.every((f) => seleccion.has(f.id))
  const alternarTodas = () =>
    setSeleccion((prev) => {
      const copia = new Set(prev)
      if (todasMarcadas) filas.forEach((f) => copia.delete(f.id))
      else filas.forEach((f) => copia.add(f.id))
      return copia
    })

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["correos", "records"] })

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
              Marca filas para exportar solo esas, o exporta todo lo filtrado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={formato}
              onChange={(e) => setFormato(e.target.value as FormatoReporte)}
              aria-label="Formato del reporte"
              className="w-auto"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </Select>
            <Button
              variant="outline"
              disabled={exportar.isPending || seleccion.size === 0}
              onClick={() => exportar.mutate([...seleccion])}
            >
              Exportar seleccionados ({seleccion.size})
            </Button>
            <Button disabled={exportar.isPending || filas.length === 0} onClick={() => exportar.mutate(undefined)}>
              Exportar todo lo filtrado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {registros.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : filas.length === 0 ? (
            <EmptyState
              icon={TableIcon}
              title="Ningún registro con esos criterios"
              description="Lanza un escaneo o prueba a quitar los filtros."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2">
                        <input type="checkbox" checked={todasMarcadas} onChange={alternarTodas} aria-label="Seleccionar todos" />
                      </th>
                      <th className="px-2 py-2">RUC</th>
                      <th className="px-2 py-2">Nombre</th>
                      <th className="px-2 py-2">Periodo</th>
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Importe pagado</th>
                      <th className="px-2 py-2">Estado</th>
                      <th className="px-2 py-2">Revisión</th>
                      <th className="px-2 py-2">Origen</th>
                      <th className="px-2 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((r) => (
                      <FilaDeRegistro
                        key={r.id}
                        registro={r}
                        seleccionado={seleccion.has(r.id)}
                        onAlternar={() => alternar(r.id)}
                        onCambiado={invalidar}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGINA))}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  {offset + 1}–{offset + filas.length} de {total}
                  {seleccion.size > 0 ? ` · ${seleccion.size} marcado${seleccion.size === 1 ? "" : "s"}` : ""}
                </span>
                <Button variant="outline" size="sm" disabled={!hayMas} onClick={() => setOffset((o) => o + PAGINA)}>
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function FilaDeRegistro({
  registro,
  seleccionado,
  onAlternar,
  onCambiado,
}: {
  registro: RecordSummary
  seleccionado: boolean
  onAlternar: () => void
  onCambiado: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const documento = useAbrirDocumento()
  const comp = COMPLETITUD[registro.completitud]
  const rev = REVISION[registro.estado_de_revision]

  const borrar = useMutation({
    mutationFn: () => deleteRecord(registro.id),
    onSuccess: () => {
      toast.success("Registro eliminado")
      onCambiado()
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const importe = registro.importe_pagado
    ? `${registro.moneda === "USD" ? "US$" : "S/"} ${registro.importe_pagado}`
    : "—"

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="px-2 py-2">
          <input type="checkbox" checked={seleccionado} onChange={onAlternar} aria-label="Seleccionar registro" />
        </td>
        <td className="px-2 py-2 font-mono text-xs">{registro.ruc_contribuyente ?? "—"}</td>
        <td className="px-2 py-2">{registro.nombre_contribuyente || "—"}</td>
        <td className="px-2 py-2 tabular-nums">{registro.periodo ?? "—"}</td>
        <td className="px-2 py-2 whitespace-nowrap">{registro.fecha_de_pago ?? "—"}</td>
        <td className="px-2 py-2 tabular-nums">{importe}</td>
        <td className="px-2 py-2">
          <span title={comp?.ayuda}>
            <Badge tone={comp?.tone ?? "neutral"}>{comp?.label ?? registro.completitud}</Badge>
          </span>
        </td>
        <td className="px-2 py-2">
          <span title={rev?.ayuda}>
            <Badge tone={rev?.tone ?? "neutral"}>{rev?.label ?? registro.estado_de_revision}</Badge>
          </span>
        </td>
        <td className="px-2 py-2">
          {registro.origen.nombre_adjunto || registro.origen.remitente ? (
            <div className="flex max-w-[14rem] flex-col">
              <button
                type="button"
                onClick={() => void documento.abrir(registro.id)}
                disabled={documento.cargando}
                title={registro.origen.asunto || "Ver documento"}
                className="truncate text-left text-primary hover:underline disabled:opacity-60"
              >
                {documento.error ? "Reintentar" : registro.origen.nombre_adjunto || "Ver documento"}
              </button>
              {registro.origen.remitente && (
                <span className="truncate text-xs text-muted-foreground">{registro.origen.remitente}</span>
              )}
            </div>
          ) : (
            "—"
          )}
        </td>
        <td className="px-2 py-2">
          {confirmando ? (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-xs text-muted-foreground">¿Borrar?</span>
              <Button variant="destructive" size="sm" disabled={borrar.isPending} onClick={() => borrar.mutate()}>
                Sí
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmando(false)}>
                No
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Button variant="outline" size="sm" onClick={() => setEditando((v) => !v)}>
                {editando ? "Cerrar" : "Editar"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
                Eliminar
              </Button>
            </div>
          )}
        </td>
      </tr>
      {editando && (
        <tr className="border-b">
          <td colSpan={10} className="bg-muted/40 p-4">
            <FormularioDeCorreccion
              registro={registro}
              onResuelto={() => {
                setEditando(false)
                onCambiado()
              }}
            />
          </td>
        </tr>
      )}
    </>
  )
}
