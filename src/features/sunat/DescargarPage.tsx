import { useQuery } from "@tanstack/react-query"
import { Check, Cloud, FileSpreadsheet, KeyRound, Play, SlidersHorizontal } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  abrirLogs,
  cancelar,
  descargarReporte,
  forzarFaltantes,
  getCredentials,
  getJobResult,
  iniciar,
  previewExcel,
} from "@/features/sunat/api"
import { ComprobantesTable } from "@/features/sunat/ComprobantesTable"
import { drivePickerDisponible, elegirExcelDeDrive } from "@/features/sunat/drivePicker"
import { EntregaFields } from "@/features/sunat/EntregaFields"
import { LogViewer } from "@/features/sunat/LogViewer"
import { MapeoColumnas } from "@/features/sunat/MapeoColumnas"
import { ResultadosTable } from "@/features/sunat/ResultadosTable"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type {
  Comprobante,
  EntregaOptions,
  MapeoEntrada,
  PreviewResult,
  ResultadoComprobante,
} from "@/features/sunat/api"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

const ENTREGA_INICIAL: EntregaOptions = {
  usar_correo: false,
  gmail_user: "",
  gmail_pass: "",
  destino: "",
  modo_correo: "individual",
  usar_drive: false,
}

type Fuente = "archivo" | "drive"

export function DescargarPage() {
  const companyId = useActiveCompany((s) => s.companyId)

  const [ruc, setRuc] = useState("")
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [editarCreds, setEditarCreds] = useState(false)
  const [fuente, setFuente] = useState<Fuente>("archivo")
  const [excel, setExcel] = useState<File | null>(null)
  const [descargarPdf, setDescargarPdf] = useState(true)
  const [descargarXml, setDescargarXml] = useState(true)
  const [entrega, setEntrega] = useState<EntregaOptions>(ENTREGA_INICIAL)

  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState("")
  const [previsualizando, setPrevisualizando] = useState(false)
  const [mapeo, setMapeo] = useState<MapeoEntrada | null>(null)
  const [analisis, setAnalisis] = useState<{
    headers: string[]
    muestra: string[][]
    confianza: number
    necesitaRevision: boolean
  } | null>(null)
  const [reanalizando, setReanalizando] = useState(false)

  const [jobId, setJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [progreso, setProgreso] = useState<string | null>(null)
  const [corriendo, setCorriendo] = useState(false)
  const [resultados, setResultados] = useState<ResultadoComprobante[] | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => () => esRef.current?.close(), [])

  // Precarga RUC + usuario de las credenciales guardadas (la clave nunca se devuelve).
  const { data: creds } = useQuery({
    queryKey: ["sunat", "credentials", companyId],
    queryFn: getCredentials,
    enabled: companyId != null,
  })
  const credsPrefill = useRef(false)
  useEffect(() => {
    if (creds?.configured && !credsPrefill.current) {
      setRuc(creds.ruc ?? "")
      setUsuario(creds.usuario ?? "")
      credsPrefill.current = true
    }
  }, [creds])

  const patchEntrega = (patch: Partial<EntregaOptions>) =>
    setEntrega((prev) => ({ ...prev, ...patch }))

  function resetPreview() {
    setComprobantes([])
    setSeleccionados(new Set())
    setPreviewId("")
    setMapeo(null)
    setAnalisis(null)
  }

  function aplicarPreview(res: PreviewResult) {
    setComprobantes(res.comprobantes)
    setSeleccionados(new Set(res.comprobantes.map((c) => c.id)))
    setPreviewId(res.preview_id)
    setMapeo(res.mapeo)
    setAnalisis({
      headers: res.headers,
      muestra: res.muestra,
      confianza: res.confianza,
      necesitaRevision: res.necesita_revision,
    })
    if (res.comprobantes.length > 0) {
      toast.success(`${res.comprobantes.length} comprobantes detectados`)
    } else {
      toast.message("Revisa y asigna las columnas del archivo")
    }
  }

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tieneExcel = !!excel
  const hayEnvio = entrega.usar_correo || entrega.usar_drive
  const hayTipo = descargarPdf || descargarXml
  const haySeleccion = comprobantes.length === 0 || seleccionados.size > 0
  const revisionPendiente = !!analisis?.necesitaRevision && comprobantes.length === 0
  const puedeIniciar =
    !corriendo && tieneExcel && hayEnvio && hayTipo && haySeleccion && !revisionPendiente

  // Estado por sección (para orientar al usuario sin convertirlo en un wizard).
  const credsListas =
    (creds?.configured ?? false) ||
    (ruc.trim() !== "" && usuario.trim() !== "" && clave.trim() !== "")
  const mostrarInputsCreds = !creds?.configured || editarCreds

  async function onElegirDrive() {
    try {
      const file = await elegirExcelDeDrive()
      if (file) {
        setExcel(file)
        resetPreview()
      }
    } catch (err) {
      const detalle = err instanceof Error ? err.message : apiError(err)
      toast.error(detalle || "No se pudo abrir Google Drive")
    }
  }

  async function onPreview() {
    if (!tieneExcel) {
      toast.error("Selecciona o sube un archivo")
      return
    }
    setPrevisualizando(true)
    try {
      aplicarPreview(await previewExcel(excel))
    } catch (err) {
      toast.error(apiError(err, "No se pudo previsualizar"))
    } finally {
      setPrevisualizando(false)
    }
  }

  async function onReanalizar() {
    if (!mapeo) return
    setReanalizando(true)
    try {
      aplicarPreview(await previewExcel(excel, mapeo))
    } catch (err) {
      toast.error(apiError(err, "No se pudo analizar el mapeo"))
    } finally {
      setReanalizando(false)
    }
  }

  async function lanzarStream(id: string) {
    setJobId(id)
    setLogs([])
    setProgreso(null)
    setResultados(null)
    setCorriendo(true)
    const es = await abrirLogs(id)
    esRef.current = es
    es.onmessage = async (e) => {
      if (e.data === "__FIN__") {
        es.close()
        setCorriendo(false)
        try {
          setResultados(await getJobResult(id))
        } catch {
          /* el resultado puede no haberse guardado si no hubo comprobantes */
        }
      } else {
        setLogs((prev) => [...prev, e.data])
      }
    }
    es.addEventListener("progress", (e) => setProgreso((e as MessageEvent).data))
  }

  async function onIniciar() {
    if (!puedeIniciar) return
    const ids =
      comprobantes.length > 0 && seleccionados.size < comprobantes.length
        ? [...seleccionados]
        : []
    try {
      const id = await iniciar({
        ruc,
        usuario,
        clave,
        descargar_pdf: descargarPdf,
        descargar_xml: descargarXml,
        preview_id: previewId,
        excel: !previewId ? excel : null,
        comprobantes_ids: ids,
        ...entrega,
      })
      await lanzarStream(id)
    } catch (err) {
      toast.error(apiError(err, "No se pudo iniciar la descarga"))
    }
  }

  async function onCancelar() {
    if (!jobId) return
    try {
      await cancelar(jobId)
      esRef.current?.close()
      setCorriendo(false)
      toast.message("Cancelación solicitada")
    } catch (err) {
      toast.error(apiError(err, "No se pudo cancelar"))
    }
  }

  async function onReintentar() {
    if (!resultados) return
    setReintentando(true)
    try {
      const id = await forzarFaltantes({
        ruc,
        usuario,
        clave,
        excel,
        resultados_previos: JSON.stringify(resultados),
        ...entrega,
      })
      await lanzarStream(id)
    } catch (err) {
      toast.error(apiError(err, "No se pudo reintentar"))
    } finally {
      setReintentando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna de configuración: cada sección muestra su estado */}
        <div className="space-y-4">
          {/* 1 · Credenciales SOL */}
          <SeccionCard
            icon={KeyRound}
            titulo="Credenciales SOL"
            estado={
              <EstadoBadge
                ok={credsListas}
                okText={creds?.configured ? "Guardadas" : "Completas"}
                pendText="Faltan datos"
              />
            }
          >
            {creds?.configured && !mostrarInputsCreds ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <p className="min-w-0 truncate text-muted-foreground">
                  RUC <span className="text-foreground">{ruc || creds.ruc}</span> · Usuario{" "}
                  <span className="text-foreground">{usuario || creds.usuario}</span>
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setEditarCreds(true)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ruc">RUC</Label>
                    <Input
                      id="ruc"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      maxLength={11}
                      placeholder="20123456789"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="usuario">Usuario SOL</Label>
                    <Input
                      id="usuario"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value)}
                      placeholder="USUARIO"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clave">Clave SOL</Label>
                  <Input
                    id="clave"
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    placeholder={
                      creds?.configured ? "Usa la guardada si la dejas en blanco" : "Tu clave SOL"
                    }
                  />
                </div>
                {creds?.configured && (
                  <Button variant="ghost" size="sm" onClick={() => setEditarCreds(false)}>
                    Usar las credenciales guardadas
                  </Button>
                )}
              </div>
            )}
          </SeccionCard>

          {/* 2 · Archivo de comprobantes */}
          <SeccionCard
            icon={FileSpreadsheet}
            titulo="Archivo de comprobantes"
            estado={
              comprobantes.length > 0 ? (
                <Badge tone="success" className="gap-1">
                  <Check className="size-3" />
                  {comprobantes.length} detectados
                </Badge>
              ) : (
                <EstadoBadge ok={tieneExcel} okText="Cargado" pendText="Sin archivo" />
              )
            }
          >
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fuente"
                    checked={fuente === "archivo"}
                    onChange={() => {
                      setFuente("archivo")
                      setExcel(null)
                      resetPreview()
                    }}
                  />
                  Subir archivo
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="fuente"
                    checked={fuente === "drive"}
                    onChange={() => {
                      setFuente("drive")
                      setExcel(null)
                      resetPreview()
                    }}
                  />
                  Desde Google Drive
                </label>
              </div>
              {fuente === "archivo" ? (
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={(e) => {
                    setExcel(e.target.files?.[0] ?? null)
                    resetPreview()
                  }}
                />
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onElegirDrive}
                    disabled={!drivePickerDisponible()}
                  >
                    <Cloud className="size-4" />
                    {excel ? `Elegido: ${excel.name}` : "Elegir de Google Drive"}
                  </Button>
                  {!drivePickerDisponible() && (
                    <p className="text-xs text-destructive">
                      Google Drive no está configurado en esta instalación.
                    </p>
                  )}
                </>
              )}
              <p className="text-xs text-muted-foreground">
                Acepta Excel (.xlsx/.xls), CSV o TXT con RUC, tipo, serie y número.
              </p>
              <Button variant="outline" onClick={onPreview} disabled={previsualizando || corriendo}>
                {previsualizando ? "Analizando…" : "Previsualizar comprobantes"}
              </Button>
            </div>
          </SeccionCard>

          {/* 3 · Formato y entrega */}
          <SeccionCard
            icon={SlidersHorizontal}
            titulo="Formato y entrega"
            estado={<EstadoBadge ok={hayTipo && hayEnvio} okText="Listo" pendText="Incompleto" />}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Qué descargar</p>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={descargarPdf}
                      onChange={(e) => setDescargarPdf(e.target.checked)}
                    />
                    PDF
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={descargarXml}
                      onChange={(e) => setDescargarXml(e.target.checked)}
                    />
                    XML
                  </label>
                </div>
                {!hayTipo && (
                  <p className="text-xs text-destructive">
                    Selecciona al menos un tipo (PDF o XML).
                  </p>
                )}
              </div>
              <div className="space-y-1.5 border-t pt-4">
                <p className="text-sm font-medium">Cómo entregar</p>
                <EntregaFields value={entrega} onChange={patchEntrega} />
                {!hayEnvio && (
                  <p className="text-xs text-destructive">
                    Activa al menos una opción de envío (correo o Drive).
                  </p>
                )}
              </div>
            </div>
          </SeccionCard>

          {/* Acción principal */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onIniciar} disabled={!puedeIniciar} className="min-w-40">
                <Play className="size-4" />
                {corriendo ? "Descargando…" : "Iniciar descarga"}
              </Button>
              {corriendo && (
                <Button variant="ghost" onClick={onCancelar}>
                  Cancelar
                </Button>
              )}
            </div>
            {!corriendo && !puedeIniciar && (
              <p className="text-xs text-muted-foreground">
                Completa las secciones marcadas para iniciar la descarga.
              </p>
            )}
          </div>
        </div>

        {/* Columna de ejecución: registro en vivo */}
        <Card>
          <CardContent className="pt-5">
            <LogViewer lineas={logs} progreso={progreso} />
          </CardContent>
        </Card>
      </div>

      {analisis && mapeo && (
        <MapeoColumnas
          mapeo={mapeo}
          headers={analisis.headers}
          muestra={analisis.muestra}
          confianza={analisis.confianza}
          necesitaRevision={analisis.necesitaRevision}
          revalidando={reanalizando}
          onChange={setMapeo}
          onRevalidar={onReanalizar}
        />
      )}

      {comprobantes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {seleccionados.size} de {comprobantes.length} comprobantes seleccionados.
            {seleccionados.size === 0 && (
              <span className="ml-1 text-destructive">Selecciona al menos uno.</span>
            )}
          </p>
          <ComprobantesTable
            comprobantes={comprobantes}
            seleccionados={seleccionados}
            onToggle={toggle}
            onToggleTodos={(marcar) =>
              setSeleccionados(marcar ? new Set(comprobantes.map((c) => c.id)) : new Set())
            }
          />
        </div>
      )}

      {resultados && (
        <ResultadosTable
          resultados={resultados}
          onReintentar={onReintentar}
          reintentando={reintentando}
          onExportar={async () => {
            if (!jobId) return
            try {
              await descargarReporte(jobId)
            } catch (err) {
              toast.error(apiError(err, "No se pudo exportar el reporte"))
            }
          }}
        />
      )}
    </div>
  )
}

/** Tarjeta de sección con icono, título y una insignia de estado a la derecha. */
function SeccionCard({
  icon: Icon,
  titulo,
  estado,
  children,
}: {
  icon: LucideIcon
  titulo: string
  estado?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <CardTitle className="text-foreground">{titulo}</CardTitle>
        </div>
        {estado}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** Insignia de estado: verde con check cuando está listo, neutra cuando falta. */
function EstadoBadge({ ok, okText, pendText }: { ok: boolean; okText: string; pendText: string }) {
  return ok ? (
    <Badge tone="success" className="gap-1">
      <Check className="size-3" />
      {okText}
    </Badge>
  ) : (
    <Badge tone="neutral">{pendText}</Badge>
  )
}
