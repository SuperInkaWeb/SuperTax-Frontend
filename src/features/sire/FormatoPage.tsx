import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Info, Loader2, Save, Trash2, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  analizarArchivo,
  deleteSavedMapping,
  getSavedMapping,
  guardarFormato,
  validarMapeo,
} from "@/features/sire/api"
import { MapeoArchivo } from "@/features/sire/MapeoArchivo"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"

import type { AnalisisArchivo, MapeoConfig, ValidacionMapeo } from "@/features/sire/api"
import type { TipoLibro } from "@/shared/types"

const CAMPO_LABEL: Record<string, string> = {
  fecha_emision: "Fecha de emisión",
  tipo_cdp: "Tipo de comprobante",
  serie: "Serie",
  numero: "Número",
  ruc_proveedor: "RUC del proveedor",
  razon_social: "Razón social",
  base_imponible: "Base imponible / BI DG",
  igv: "IGV",
  mto_exonerado: "Exonerado",
  mto_inafecto: "Inafecto",
  bi_dgng: "BI DGNG",
  igv_dgng: "IGV DGNG",
  bi_dng: "BI DNG",
  igv_dng: "IGV DNG",
  valor_adq_ng: "Adq. no gravadas",
  importe_total: "Importe total",
  moneda: "Moneda",
  tipo_cambio: "Tipo de cambio",
  status_description: "Estado del comprobante",
}

export function FormatoPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [libro, setLibro] = useState<TipoLibro>("ventas")
  const [file, setFile] = useState<File | null>(null)
  const [analisis, setAnalisis] = useState<AnalisisArchivo | null>(null)
  const [config, setConfig] = useState<MapeoConfig | null>(null)
  const [validacion, setValidacion] = useState<ValidacionMapeo | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [validando, setValidando] = useState(false)

  const { data: guardado } = useQuery({
    queryKey: ["sire", "mapping", companyId, libro],
    queryFn: () => getSavedMapping(libro),
    enabled: companyId != null,
  })

  // Reset al cambiar de libro.
  useEffect(() => {
    setFile(null)
    setAnalisis(null)
    setConfig(null)
    setValidacion(null)
  }, [libro])

  // Análisis automático al subir un archivo.
  useEffect(() => {
    if (!file) {
      setAnalisis(null)
      setConfig(null)
      setValidacion(null)
      return
    }
    let cancelado = false
    setAnalizando(true)
    analizarArchivo(libro, file)
      .then((a) => {
        if (cancelado) return
        setAnalisis(a)
        setConfig(a.config)
        setValidacion(a.validacion)
      })
      .catch((e) => {
        if (!cancelado) toast.error(apiError(e, "No se pudo analizar el archivo"))
      })
      .finally(() => {
        if (!cancelado) setAnalizando(false)
      })
    return () => {
      cancelado = true
    }
  }, [file, libro])

  async function handleRevalidar() {
    if (!file || !config) return
    setValidando(true)
    try {
      setValidacion(await validarMapeo(libro, config, file))
    } catch (e) {
      toast.error(apiError(e, "No se pudo validar el mapeo"))
    } finally {
      setValidando(false)
    }
  }

  const guardar = useMutation({
    mutationFn: () => guardarFormato(libro, config as MapeoConfig, file as File),
    onSuccess: () => {
      toast.success("Formato guardado para tu empresa")
      queryClient.invalidateQueries({ queryKey: ["sire", "mapping"] })
      setFile(null)
      setAnalisis(null)
      setConfig(null)
      setValidacion(null)
    },
    onError: (e) => toast.error(apiError(e, "El mapeo no superó la validación")),
  })

  const eliminar = useMutation({
    mutationFn: () => deleteSavedMapping(libro),
    onSuccess: () => {
      toast.success("Formato eliminado")
      queryClient.invalidateQueries({ queryKey: ["sire", "mapping"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo eliminar")),
  })

  const esEstandar = analisis?.nivel === "ple" || analisis?.nivel === "plataforma"
  const mapeoListo = analisis !== null && validacion !== null && validacion.ok

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Formato de archivo</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Configura una sola vez cómo leer el archivo de tu empresa. Se usará en tus conciliaciones.
        </p>
      </div>

      {/* Selector de libro (segmentado) */}
      <div className="inline-flex rounded-lg border bg-muted/30 p-1">
        {(["ventas", "compras"] as TipoLibro[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLibro(l)}
            className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              libro === l ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Formato guardado actual */}
      {guardado && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Formato configurado para {libro}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                disabled={eliminar.isPending}
                onClick={async () => {
                  const ok = await confirmar({
                    title: `¿Eliminar el formato de ${libro}?`,
                    description: "Volverá a autodetectarse en las próximas conciliaciones.",
                    confirmLabel: "Eliminar",
                    destructive: true,
                  })
                  if (ok) eliminar.mutate()
                }}
              >
                <Trash2 className="size-3.5" /> Eliminar
              </Button>
            </div>
            <CardDescription>
              Se usa automáticamente al conciliar {libro}. Para cambiarlo, sube una muestra nueva
              abajo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(guardado.columnas).map(([campo, col]) => (
                <div
                  key={campo}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <span>{CAMPO_LABEL[campo] ?? campo}</span>
                  <span className="font-mono text-xs text-muted-foreground">Col {col + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">
            {guardado ? "Cambiar el formato" : "Configurar el formato"}
          </CardTitle>
          <CardDescription>
            Sube un archivo de muestra de {libro} (TXT o CSV) para definir el mapeo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
              file ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="size-7 text-muted-foreground" />
            <p className="text-sm font-medium">
              {file ? file.name : "Haz clic para seleccionar una muestra"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {analizando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Analizando el formato…
            </div>
          )}

          {esEstandar && (
            <Alert variant="info">
              <Info />
              <AlertDescription>
                Este archivo es un <strong>formato estándar reconocido</strong>
                {analisis?.formato ? ` (${analisis.formato})` : ""} — no requiere configuración
                manual. Puedes conciliarlo directamente.
              </AlertDescription>
            </Alert>
          )}

          {analisis && !esEstandar && config && (
            <>
              <MapeoArchivo
                analisis={analisis}
                config={config}
                validacion={validacion}
                validando={validando}
                onChange={setConfig}
                onRevalidar={handleRevalidar}
              />
              <Button onClick={() => guardar.mutate()} disabled={!mapeoListo || guardar.isPending}>
                {guardar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {guardado ? "Actualizar formato guardado" : "Guardar formato"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
