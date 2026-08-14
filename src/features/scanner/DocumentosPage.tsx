import { useQuery } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"

import { getTipos, listDocumentos } from "@/features/scanner/api"
import { BotonExportar } from "@/features/scanner/BotonExportar"
import { GRUPOS, TIPO_A_GRUPO } from "@/features/scanner/constants"
import { columnasDe } from "@/features/scanner/filas"
import { PanelDetalle } from "@/features/scanner/PanelDetalle"
import { SelectorCampos } from "@/features/scanner/SelectorCampos"
import { TablaDocumentos } from "@/features/scanner/TablaDocumentos"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

import type { Documento } from "@/features/scanner/api"

function leerCols(key: string): string[] | null {
  try {
    const s = localStorage.getItem(key)
    return s !== null ? (JSON.parse(s) as string[]) : null
  } catch {
    return null
  }
}

export function DocumentosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const [grupoId, setGrupoId] = useState(GRUPOS[0].id)
  const [subtipo, setSubtipo] = useState("todos")
  const [detalle, setDetalle] = useState<Documento | null>(null)
  const [tabPendiente, setTabPendiente] = useState<string | null>(null)
  const hayEdiciones = useRef(false)

  const { data: tipos } = useQuery({ queryKey: ["scanner", "tipos"], queryFn: getTipos })
  const { data: docs, isLoading, isError, refetch } = useQuery({
    queryKey: ["scanner", "documentos", companyId],
    queryFn: () => listDocumentos("todos"),
    enabled: companyId != null,
  })

  const grupo = GRUPOS.find((g) => g.id === grupoId) ?? GRUPOS[0]

  const docsPorGrupo = useMemo(() => {
    const out: Record<string, Documento[]> = {}
    GRUPOS.forEach((g) => (out[g.id] = []))
    ;(docs ?? []).forEach((d) => {
      const gid = TIPO_A_GRUPO[d.tipo_documento]
      if (gid) out[gid].push(d)
    })
    return out
  }, [docs])

  const docsGrupo = docsPorGrupo[grupo.id] ?? []
  const docsSubtipo =
    subtipo === "todos" ? docsGrupo : docsGrupo.filter((d) => d.tipo_documento === subtipo)

  const colsKey = `scanner_cols_${grupo.id}_${subtipo}`
  const [camposVisibles, setCamposVisibles] = useState<string[] | null>(() => leerCols(colsKey))

  function persistir(v: string[] | null) {
    setCamposVisibles(v)
    try {
      localStorage.setItem(colsKey, JSON.stringify(v))
    } catch {
      /* storage lleno o privado */
    }
  }

  const columnasDisponibles = useMemo(() => columnasDe(docsSubtipo), [docsSubtipo])
  const columnas =
    camposVisibles === null
      ? columnasDisponibles
      : columnasDisponibles.filter((c) => camposVisibles.includes(c))

  const camposLabels = useMemo(() => {
    const merged: Record<string, string> = {}
    grupo.tipos.forEach((t) => Object.assign(merged, tipos?.[t.id]?.campos ?? {}))
    return merged
  }, [grupo, tipos])

  function cambiarSubtipo(t: string) {
    setSubtipo(t)
    setCamposVisibles(leerCols(`scanner_cols_${grupo.id}_${t}`))
  }

  function irAGrupo(id: string) {
    setGrupoId(id)
    setSubtipo("todos")
    setDetalle(null)
    setCamposVisibles(leerCols(`scanner_cols_${id}_todos`))
    hayEdiciones.current = false
    setTabPendiente(null)
  }

  function intentarGrupo(id: string) {
    if (id === grupoId) return
    if (hayEdiciones.current) setTabPendiente(id)
    else irAGrupo(id)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }
  if (isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar los documentos.</p>
  }

  const conteo = (gid: string) => docsPorGrupo[gid]?.length ?? 0

  return (
    <div className="space-y-4">
      {/* Guard de cambios sin guardar */}
      {tabPendiente && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl">
            <h3 className="text-base font-bold">Tienes cambios sin guardar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Hay ediciones en <strong>{grupo.label}</strong> sin guardar.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setTabPendiente(null)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-muted"
              >
                Volver a guardar
              </button>
              <button
                onClick={() => irAGrupo(tabPendiente)}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90"
              >
                Descartar y continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs por grupo */}
      <nav className="flex flex-wrap gap-1 border-b">
        {GRUPOS.map((g) => {
          const Icon = g.icon
          const activo = grupoId === g.id
          return (
            <button
              key={g.id}
              onClick={() => intentarGrupo(g.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activo
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {g.label}
              {conteo(g.id) > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activo ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {conteo(g.id)}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="flex gap-6">
        {/* Selector de columnas */}
        {columnasDisponibles.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <Card>
              <CardContent className="pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Columnas
                  </p>
                  <div className="flex gap-1 text-xs">
                    <button onClick={() => persistir(null)} className="text-primary hover:underline">
                      Todas
                    </button>
                    <span className="text-muted-foreground/40">·</span>
                    <button
                      onClick={() => persistir([])}
                      className="text-muted-foreground hover:underline"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>
                <SelectorCampos
                  camposDisponibles={columnasDisponibles}
                  camposLabels={camposLabels}
                  seleccionados={camposVisibles}
                  onChange={persistir}
                />
              </CardContent>
            </Card>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          <Card>
            <CardContent className="space-y-5 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <grupo.icon className="size-4 text-muted-foreground" />
                  <h2 className="font-bold">{grupo.label}</h2>
                  <span className="text-sm text-muted-foreground">
                    — {docsSubtipo.length} registro{docsSubtipo.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <BotonExportar docs={docsSubtipo} columnas={columnas} camposLabels={camposLabels} />
              </div>

              {/* Pills de subtipo */}
              {docsGrupo.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {[{ id: "todos", label: "Todos" }, ...grupo.tipos].map((t) => {
                    const cnt =
                      t.id === "todos"
                        ? docsGrupo.length
                        : docsGrupo.filter((d) => d.tipo_documento === t.id).length
                    if (t.id !== "todos" && cnt === 0) return null
                    const activo = subtipo === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => cambiarSubtipo(t.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          activo
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {t.label}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            activo ? "bg-white/20" : "bg-background/60"
                          }`}
                        >
                          {cnt}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {docsGrupo.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <grupo.icon className="mx-auto mb-3 size-10 opacity-30" />
                  <p className="font-medium">No hay {grupo.label.toLowerCase()} todavía</p>
                  <p className="mt-1 text-sm">Sube un documento en la pestaña “Subir documento”.</p>
                </div>
              ) : (
                <TablaDocumentos
                  key={`${grupo.id}-${subtipo}`}
                  docs={docsSubtipo}
                  columnas={columnas}
                  camposLabels={camposLabels}
                  onActualizar={refetch}
                  onVerDetalle={setDetalle}
                  onHayEdiciones={(hay) => {
                    hayEdiciones.current = hay
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {detalle && (
        <PanelDetalle
          doc={detalle}
          camposLabels={camposLabels}
          onCerrar={() => setDetalle(null)}
          onGuardado={() => {
            refetch()
            setDetalle(null)
          }}
        />
      )}
    </div>
  )
}
