import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  abrirLogs,
  cancelar,
  forzarFaltantes,
  getCredentials,
  getJobResult,
  iniciar,
  previewExcel,
} from "@/features/sunat/api"
import { ComprobantesTable } from "@/features/sunat/ComprobantesTable"
import { EntregaFields } from "@/features/sunat/EntregaFields"
import { LogViewer } from "@/features/sunat/LogViewer"
import { ResultadosTable } from "@/features/sunat/ResultadosTable"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type { Comprobante, EntregaOptions, ResultadoComprobante } from "@/features/sunat/api"

const ENTREGA_INICIAL: EntregaOptions = {
  usar_correo: false,
  gmail_user: "",
  gmail_pass: "",
  destino: "",
  modo_correo: "individual",
  usar_drive: false,
  drive_folder: "",
}

type Fuente = "archivo" | "drive"

export function DescargarPage() {
  const companyId = useActiveCompany((s) => s.companyId)

  const [ruc, setRuc] = useState("")
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [fuente, setFuente] = useState<Fuente>("archivo")
  const [excel, setExcel] = useState<File | null>(null)
  const [excelLink, setExcelLink] = useState("")
  const [descargarPdf, setDescargarPdf] = useState(true)
  const [descargarXml, setDescargarXml] = useState(true)
  const [entrega, setEntrega] = useState<EntregaOptions>(ENTREGA_INICIAL)

  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState("")
  const [previsualizando, setPrevisualizando] = useState(false)

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
  }

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tieneExcel = fuente === "archivo" ? !!excel : !!excelLink.trim()
  const hayEnvio = entrega.usar_correo || entrega.usar_drive
  const hayTipo = descargarPdf || descargarXml
  const haySeleccion = comprobantes.length === 0 || seleccionados.size > 0
  const puedeIniciar = !corriendo && tieneExcel && hayEnvio && hayTipo && haySeleccion

  async function onPreview() {
    if (!tieneExcel) {
      toast.error("Sube un Excel o pega un enlace de Drive")
      return
    }
    setPrevisualizando(true)
    try {
      const res = await previewExcel(
        fuente === "archivo" ? excel : null,
        fuente === "drive" ? excelLink : "",
      )
      setComprobantes(res.comprobantes)
      setSeleccionados(new Set(res.comprobantes.map((c) => c.id)))
      setPreviewId(res.preview_id)
      toast.success(`${res.comprobantes.length} comprobantes detectados`)
    } catch (err) {
      toast.error(apiError(err, "No se pudo previsualizar"))
    } finally {
      setPrevisualizando(false)
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
        excel: fuente === "archivo" && !previewId ? excel : null,
        excel_link: fuente === "drive" ? excelLink : "",
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
        excel: fuente === "archivo" ? excel : null,
        excel_link: fuente === "drive" ? excelLink : "",
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
                      resetPreview()
                    }}
                  />
                  Desde Google Drive
                </label>
              </div>
              {fuente === "archivo" ? (
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    setExcel(e.target.files?.[0] ?? null)
                    resetPreview()
                  }}
                />
              ) : (
                <>
                  <Input
                    placeholder="https://drive.google.com/file/d/…"
                    value={excelLink}
                    onChange={(e) => {
                      setExcelLink(e.target.value)
                      resetPreview()
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    El archivo debe estar compartido como “cualquiera con el enlace” o con tu cuenta
                    de Drive conectada.
                  </p>
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
        />
      )}
    </div>
  )
}
