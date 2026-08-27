import { useQuery } from "@tanstack/react-query"
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
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type {
  Comprobante,
  EntregaOptions,
  MapeoEntrada,
  PreviewResult,
  ResultadoComprobante,
} from "@/features/sunat/api"

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

  async function onElegirDrive() {
    try {
      const file = await elegirExcelDeDrive()
      if (file) {
        setExcel(file)
        resetPreview()
      }
    } catch (err) {
      toast.error(apiError(err, "No se pudo abrir Google Drive"))
    }
  }

  async function onPreview() {
    if (!tieneExcel) {
      toast.error("Selecciona o sube un Excel")
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
        <Card>
          <CardContent className="space-y-4 pt-5">
            {/* Credenciales */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ruc">RUC</Label>
                <Input id="ruc" value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usuario">Usuario SOL</Label>
                <Input id="usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
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

            {/* Fuente del Excel */}
            <div className="space-y-1.5">
              <Label>Archivo Excel</Label>
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
                  accept=".xlsx,.xls,.csv"
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
                    {excel ? `Elegido: ${excel.name}` : "Elegir de Google Drive"}
                  </Button>
                  {!drivePickerDisponible() && (
                    <p className="text-xs text-destructive">
                      Google Drive no está configurado en esta instalación.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Filtro PDF/XML */}
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
              <p className="text-xs text-destructive">Selecciona al menos un tipo (PDF o XML).</p>
            )}

            <EntregaFields value={entrega} onChange={patchEntrega} />
            {!hayEnvio && (
              <p className="text-xs text-destructive">
                Activa al menos una opción de envío (correo o Drive).
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onPreview} disabled={previsualizando || corriendo}>
                {previsualizando ? "Cargando…" : "Previsualizar"}
              </Button>
              <Button onClick={onIniciar} disabled={!puedeIniciar}>
                {corriendo ? "Descargando…" : "Iniciar descarga"}
              </Button>
              {corriendo && (
                <Button variant="ghost" onClick={onCancelar}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

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
