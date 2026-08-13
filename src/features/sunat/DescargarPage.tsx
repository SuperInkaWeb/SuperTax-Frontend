import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  abrirLogs,
  cancelar,
  forzarFaltantes,
  getJobResult,
  iniciar,
  previewExcel,
} from "@/features/sunat/api"
import { ComprobantesTable } from "@/features/sunat/ComprobantesTable"
import { EntregaFields } from "@/features/sunat/EntregaFields"
import { ResultadosTable } from "@/features/sunat/ResultadosTable"
import { apiError } from "@/shared/lib/api/error"
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

export function DescargarPage() {
  const [ruc, setRuc] = useState("")
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [excel, setExcel] = useState<File | null>(null)
  const [excelLink, setExcelLink] = useState("")
  const [descargarPdf, setDescargarPdf] = useState(true)
  const [descargarXml, setDescargarXml] = useState(true)
  const [entrega, setEntrega] = useState<EntregaOptions>(ENTREGA_INICIAL)

  const [comprobantes, setComprobantes] = useState<Comprobante[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState("")

  const [jobId, setJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [progreso, setProgreso] = useState<string | null>(null)
  const [corriendo, setCorriendo] = useState(false)
  const [resultados, setResultados] = useState<ResultadoComprobante[] | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => () => esRef.current?.close(), [])

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

  async function onPreview() {
    if (!excel && !excelLink.trim()) {
      toast.error("Sube un Excel o pega un enlace de Drive")
      return
    }
    try {
      const res = await previewExcel(excel, excelLink)
      setComprobantes(res.comprobantes)
      setSeleccionados(new Set(res.comprobantes.map((c) => c.id)))
      setPreviewId(res.preview_id)
      toast.success(`${res.comprobantes.length} comprobantes detectados`)
    } catch (err) {
      toast.error(apiError(err, "No se pudo previsualizar"))
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
    if (!excel && !excelLink.trim() && !previewId) {
      toast.error("Sube un Excel o pega un enlace de Drive")
      return
    }
    // Subconjunto solo si el usuario deseleccionó algo; vacío = todos.
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
        excel: previewId ? null : excel,
        excel_link: excelLink,
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
        excel: previewId ? null : excel,
        excel_link: excelLink,
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
              <Input id="clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="excel">Excel de comprobantes</Label>
              <Input
                id="excel"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  setExcel(e.target.files?.[0] ?? null)
                  resetPreview()
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="excel_link">…o enlace de Drive</Label>
              <Input
                id="excel_link"
                placeholder="https://drive.google.com/…"
                value={excelLink}
                onChange={(e) => {
                  setExcelLink(e.target.value)
                  resetPreview()
                }}
              />
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={descargarPdf} onChange={(e) => setDescargarPdf(e.target.checked)} />
                PDF
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={descargarXml} onChange={(e) => setDescargarXml(e.target.checked)} />
                XML
              </label>
            </div>

            <EntregaFields value={entrega} onChange={patchEntrega} />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onPreview}>
                Previsualizar
              </Button>
              <Button onClick={onIniciar} disabled={corriendo}>
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
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Registro</span>
              {progreso && <span className="text-xs text-muted-foreground">{progreso}</span>}
            </div>
            <pre className="h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
              {logs.length ? logs.join("\n") : "Los logs aparecerán aquí al iniciar una descarga."}
            </pre>
          </CardContent>
        </Card>
      </div>

      {comprobantes.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {seleccionados.size} de {comprobantes.length} comprobantes seleccionados.
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
