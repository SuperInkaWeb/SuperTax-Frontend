import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { abrirLogs, cancelar, iniciar, previewExcel } from "@/features/sunat/api"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

export function DescargarPage() {
  const [ruc, setRuc] = useState("")
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [excel, setExcel] = useState<File | null>(null)
  const [descargarPdf, setDescargarPdf] = useState(true)
  const [descargarXml, setDescargarXml] = useState(true)

  const [previewId, setPreviewId] = useState("")
  const [numComprobantes, setNumComprobantes] = useState<number | null>(null)

  const [jobId, setJobId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [progreso, setProgreso] = useState<string | null>(null)
  const [corriendo, setCorriendo] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => () => esRef.current?.close(), [])

  async function onPreview() {
    if (!excel) {
      toast.error("Selecciona el archivo Excel")
      return
    }
    try {
      const res = await previewExcel(excel)
      setPreviewId(res.preview_id)
      setNumComprobantes(res.comprobantes.length)
      toast.success(`${res.comprobantes.length} comprobantes detectados`)
    } catch (err) {
      toast.error(apiError(err, "No se pudo previsualizar el Excel"))
    }
  }

  async function onIniciar() {
    if (!excel && !previewId) {
      toast.error("Selecciona el archivo Excel")
      return
    }
    try {
      const id = await iniciar({
        ruc,
        usuario,
        clave,
        descargar_pdf: descargarPdf,
        descargar_xml: descargarXml,
        preview_id: previewId,
        excel: previewId ? null : excel,
      })
      setJobId(id)
      setLogs([])
      setProgreso(null)
      setCorriendo(true)

      const es = await abrirLogs(id)
      esRef.current = es
      es.onmessage = (e) => {
        if (e.data === "__FIN__") {
          es.close()
          setCorriendo(false)
        } else {
          setLogs((prev) => [...prev, e.data])
        }
      }
      es.addEventListener("progress", (e) => setProgreso((e as MessageEvent).data))
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

  return (
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
            <Input
              id="clave"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="excel">Excel de comprobantes</Label>
            <Input
              id="excel"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setExcel(e.target.files?.[0] ?? null)
                setPreviewId("")
                setNumComprobantes(null)
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
          {numComprobantes !== null && (
            <p className="text-sm text-muted-foreground">
              {numComprobantes} comprobantes en el archivo.
            </p>
          )}
          <div className="flex gap-2">
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
  )
}
