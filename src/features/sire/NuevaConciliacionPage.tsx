import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeftRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import {
  analizarArchivo,
  createJob,
  listJobs,
  propuestaDisponible,
  validarMapeo,
} from "@/features/sire/api"
import { CoberturaArchivo } from "@/features/sire/CoberturaArchivo"
import { MapeoArchivo } from "@/features/sire/MapeoArchivo"
import { StatusBadge } from "@/features/sire/StatusBadge"
import { apiError } from "@/shared/lib/api/error"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"

import type { AnalisisArchivo, MapeoConfig, ValidacionMapeo } from "@/features/sire/api"
import type { TipoLibro } from "@/shared/types"

const PASOS = [
  { icon: Upload, titulo: "Sube tu archivo", detalle: "El CSV de comprobantes de tu sistema de facturación" },
  { icon: Download, titulo: "Descargamos la propuesta SUNAT", detalle: "El registro oficial del periodo (RVIE o RCE), directo del SIRE" },
  { icon: ArrowLeftRight, titulo: "Comparamos comprobante por comprobante", detalle: "6 campos: fecha, base imponible, IGV, total, exonerado e inafecto" },
  { icon: FileSpreadsheet, titulo: "Recibes tu reporte Excel", detalle: "Escenarios A, B, C y D con alertas, más CSVs descargables" },
]

export function NuevaConciliacionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [periodo, setPeriodo] = useState("")
  const [tipoLibro, setTipoLibro] = useState<TipoLibro>("ventas")
  const [file, setFile] = useState<File | null>(null)
  const [reutilizar, setReutilizar] = useState(true)
  const [sinSire, setSinSire] = useState(false)

  const [analisis, setAnalisis] = useState<AnalisisArchivo | null>(null)
  const [mapeoConfig, setMapeoConfig] = useState<MapeoConfig | null>(null)
  const [validacion, setValidacion] = useState<ValidacionMapeo | null>(null)
  const [skipRowsManual, setSkipRowsManual] = useState<number | null>(null)
  const [analizando, setAnalizando] = useState(false)
  const [validando, setValidando] = useState(false)
  const [cobertura, setCobertura] = useState<string[] | undefined>(undefined)
  const [guardarFormato, setGuardarFormato] = useState(false)

  // Analiza el archivo automáticamente al seleccionarlo (o cambiar de libro).
  useEffect(() => {
    if (!file) {
      setAnalisis(null)
      setMapeoConfig(null)
      setValidacion(null)
      setGuardarFormato(false)
      return
    }
    let cancelado = false
    setAnalizando(true)
    analizarArchivo(tipoLibro, file, skipRowsManual ?? undefined)
      .then((a) => {
        if (cancelado) return
        setAnalisis(a)
        setMapeoConfig(a.config)
        setValidacion(a.validacion)
        setGuardarFormato(false)
      })
      .catch((e) => {
        if (cancelado) return
        setAnalisis(null)
        setMapeoConfig(null)
        setValidacion(null)
        toast.error(apiError(e, "No se pudo analizar el archivo"))
      })
      .finally(() => {
        if (!cancelado) setAnalizando(false)
      })
    return () => {
      cancelado = true
    }
  }, [file, tipoLibro, skipRowsManual])

  async function handleRevalidar() {
    if (!file || !mapeoConfig) return
    setValidando(true)
    try {
      setValidacion(await validarMapeo(tipoLibro, mapeoConfig, file))
    } catch (e) {
      toast.error(apiError(e, "No se pudo validar el mapeo"))
    } finally {
      setValidando(false)
    }
  }

  const mapeoListo = analisis !== null && validacion !== null && validacion.ok

  const { data: propuesta } = useQuery({
    queryKey: ["sire", "propuesta-disponible", periodo, tipoLibro],
    queryFn: () => propuestaDisponible(periodo, tipoLibro),
    enabled: periodo.length === 6,
    staleTime: 60_000,
  })
  const ofrecerReuso = propuesta?.disponible === true

  const puedeGuardar =
    analisis !== null && !analisis.solo_lectura && analisis.nivel !== "plataforma"

  const crear = useMutation({
    mutationFn: () =>
      createJob({
        periodo,
        tipo_libro: tipoLibro,
        archivo: file as File,
        sin_sire: tipoLibro === "compras" && sinSire,
        reutilizar_propuesta: ofrecerReuso && reutilizar,
        cobertura_fechas: tipoLibro === "ventas" && analisis ? (cobertura ?? null) : null,
        mapeo_columnas: analisis?.solo_lectura ? null : mapeoConfig,
        guardar_formato: puedeGuardar && guardarFormato,
      }),
    onSuccess: (job) => {
      toast.success("Conciliación creada — se está procesando")
      queryClient.invalidateQueries({ queryKey: ["sire", "jobs"] })
      navigate(`/sire/jobs/${job.id}`)
    },
    onError: (e) => toast.error(apiError(e, "No se pudo crear la conciliación")),
  })

  const generadoTexto = propuesta?.generado_a
    ? new Date(propuesta.generado_a).toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  const { data: jobs = [] } = useQuery({ queryKey: ["sire", "jobs"], queryFn: listJobs })
  const delPeriodo =
    periodo.length === 6
      ? jobs
          .filter((j) => j.periodo === periodo && j.tipo_libro === tipoLibro)
          .sort((a, b) => b.id - a.id)
          .slice(0, 5)
      : []

  const bloqueado =
    crear.isPending ||
    !file ||
    periodo.length !== 6 ||
    analizando ||
    (analisis !== null && !mapeoListo) ||
    (analisis !== null && tipoLibro === "ventas" && cobertura === undefined)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Nueva conciliación</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Sube el archivo de la empresa y elige el periodo a conciliar contra SUNAT
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Parámetros</CardTitle>
            <CardDescription>
              El sistema descargará la propuesta SUNAT y generará el reporte Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                crear.mutate()
              }}
              className="space-y-5"
            >
              {crear.isError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>
                    {apiError(crear.error, "Error al iniciar la conciliación")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="periodo">Periodo</Label>
                <Input
                  id="periodo"
                  placeholder="202412"
                  maxLength={6}
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value.replace(/\D/g, ""))}
                  required
                />
                <p className="text-xs text-muted-foreground">Formato AAAAMM — ej. 202412</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="libro">Libro</Label>
                <Select
                  id="libro"
                  value={tipoLibro}
                  onChange={(e) => {
                    const v = e.target.value as TipoLibro
                    setTipoLibro(v)
                    setSkipRowsManual(null)
                    if (v !== "compras") setSinSire(false)
                  }}
                >
                  <option value="ventas">Registro de Ventas (RVIE)</option>
                  <option value="compras">Registro de Compras (RCE)</option>
                </Select>
              </div>

              {tipoLibro === "compras" && (
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={sinSire}
                      onChange={(e) => setSinSire(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      La empresa no está afiliada al SIRE
                      <span className="block text-xs text-muted-foreground">
                        Los comprobantes que no aparezcan en la propuesta del periodo se buscarán en
                        la propuesta del mes de su fecha de emisión antes de marcarlos como faltantes.
                      </span>
                    </span>
                  </label>
                  {sinSire && (
                    <Alert variant="warning">
                      <AlertCircle />
                      <AlertDescription className="text-xs">
                        Puede tardar bastante más de lo normal: se descargará una propuesta de SUNAT
                        por <strong>cada mes anterior</strong> con comprobantes, y cada una toma
                        ~10–40 min (salvo que se reutilice una ya disponible). La conciliación corre
                        en segundo plano: puedes cerrar la página y volver luego a ver el resultado.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {ofrecerReuso && (
                <Alert variant="info" className="flex-col items-stretch gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="size-4" />
                    Propuesta SUNAT disponible
                  </div>
                  <p className="text-xs">
                    Ya existe una propuesta de {tipoLibro === "ventas" ? "Ventas" : "Compras"} ·{" "}
                    {periodo.slice(0, 4)}/{periodo.slice(4)} descargada el {generadoTexto}.
                  </p>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="modo-propuesta"
                        checked={reutilizar}
                        onChange={() => setReutilizar(true)}
                        className="mt-0.5"
                      />
                      <span>
                        <strong>Reutilizarla</strong> — resultado en ~10-15 min
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="modo-propuesta"
                        checked={!reutilizar}
                        onChange={() => setReutilizar(false)}
                        className="mt-0.5"
                      />
                      <span>Solicitar una nueva a SUNAT — ~40-60 min</span>
                    </label>
                  </div>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label>Archivo de la empresa</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
                    file
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  {file ? (
                    <>
                      <FileText className="size-8 text-primary" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="size-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Haz clic para seleccionar el archivo</p>
                      <p className="text-xs text-muted-foreground">
                        TXT, CSV o Excel del sistema contable
                      </p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.csv,.xlsx,.xlsm"
                    className="hidden"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null)
                      setSkipRowsManual(null)
                    }}
                  />
                </div>
              </div>

              {analizando && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Analizando el formato del archivo…
                </div>
              )}

              {analisis && mapeoConfig && (
                <MapeoArchivo
                  analisis={analisis}
                  config={mapeoConfig}
                  validacion={validacion}
                  validando={validando}
                  onChange={setMapeoConfig}
                  onRevalidar={handleRevalidar}
                  onReanalizar={setSkipRowsManual}
                />
              )}

              {puedeGuardar && mapeoListo && (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={guardarFormato}
                    onChange={(e) => setGuardarFormato(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    {analisis?.nivel === "guardado"
                      ? "Actualizar el formato guardado de mi empresa con estos cambios"
                      : "Guardar este formato para mi empresa"}
                    <span className="block text-xs text-muted-foreground">
                      {analisis?.nivel === "guardado"
                        ? "Si no lo marcas, el ajuste vale solo para esta conciliación."
                        : "Así no tendrás que mapear las columnas la próxima vez. También puedes gestionarlo en “Formato de archivo”."}
                    </span>
                  </span>
                </label>
              )}

              {analisis && tipoLibro === "ventas" && (
                <CoberturaArchivo
                  periodo={periodo}
                  fechasDetectadas={analisis.fechas_detectadas ?? []}
                  esPle={analisis.nivel === "ple"}
                  onChange={setCobertura}
                />
              )}

              <Button type="submit" className="w-full" disabled={bloqueado}>
                {crear.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando archivo…
                  </>
                ) : (
                  "Iniciar conciliación"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Cómo funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PASOS.map((paso, i) => {
                const Icon = paso.icon
                return (
                  <div key={paso.titulo} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-3.5" />
                      </div>
                      {i < PASOS.length - 1 && <div className="mt-1.5 w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-4 last:pb-0">
                      <p className="text-sm font-medium leading-8">{paso.titulo}</p>
                      <p className="-mt-1.5 text-xs text-muted-foreground">{paso.detalle}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {delPeriodo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-foreground">
                  Conciliaciones de{" "}
                  <span className="font-mono">
                    {periodo.slice(0, 4)}/{periodo.slice(4)}
                  </span>
                </CardTitle>
                <CardDescription>
                  Este periodo ya fue conciliado antes ({tipoLibro === "ventas" ? "ventas" : "compras"})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {delPeriodo.map((j) => (
                  <Link key={j.id} to={`/sire/jobs/${j.id}`}>
                    <div className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/60">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">#{j.id}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(j.created_at).toLocaleDateString("es-PE")} ·{" "}
                          {j.empresa_filename ?? "—"}
                        </p>
                      </div>
                      <StatusBadge status={j.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
