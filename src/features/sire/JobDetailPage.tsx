import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { descargarCsv, descargarReporte, getJob, resumeJob } from "@/features/sire/api"
import { apiError } from "@/shared/lib/api/error"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import { Spinner } from "@/shared/ui/spinner"

import type { ReconciliationJob } from "@/shared/types"

function StatusIcon({ status }: { status: string }) {
  if (status === "completado") return <CheckCircle2 className="size-5 text-emerald-500" />
  if (status === "error") return <XCircle className="size-5 text-destructive" />
  return <Loader2 className="size-5 animate-spin text-blue-500" />
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function EscenarioCard({
  letra,
  titulo,
  count,
  detalle,
  verde,
}: {
  letra: string
  titulo: string
  count: number
  detalle: string
  verde?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="uppercase tracking-wide">
          {letra} — {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`font-mono text-2xl font-bold ${verde ? "text-emerald-600" : ""}`}>
          {count.toLocaleString("es-PE")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  )
}

const fmtFecha = (s: string) => new Date(s).toLocaleString("es-PE")

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const jobId = Number(id)
  const queryClient = useQueryClient()

  const { data: job, isLoading } = useQuery<ReconciliationJob>({
    queryKey: ["sire", "job", jobId],
    queryFn: () => getJob(jobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === "en_cola" || s === "procesando" ? 3000 : false
    },
  })

  const reanudar = useMutation({
    mutationFn: () => resumeJob(jobId),
    onSuccess: () => {
      toast.success("Conciliación reanudada — retomando desde donde quedó")
      queryClient.invalidateQueries({ queryKey: ["sire", "job", jobId] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo reanudar")),
  })

  async function bajar(fn: () => Promise<void>, err: string) {
    try {
      await fn()
    } catch (e) {
      toast.error(apiError(e, err))
    }
  }

  if (isLoading || !job) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const activo = job.status === "en_cola" || job.status === "procesando"
  const puedeReanudar = job.status === "error"
  const tieneResultado = job.status === "completado" && job.escenario_a_count !== null
  const esReuso =
    job.propuesta_origen_at !== null &&
    new Date(job.propuesta_origen_at) < new Date(job.created_at)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/sire">
          <Button variant="ghost" size="icon" aria-label="Volver">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <StatusIcon status={job.status} />
            Conciliación #{job.id}
          </h2>
          <p className="text-sm text-muted-foreground">
            {job.periodo.slice(0, 4)}/{job.periodo.slice(4)} —{" "}
            {job.tipo_libro === "ventas" ? "Ventas RVIE" : "Compras RCE"}
          </p>
        </div>
      </div>

      {activo && (
        <Alert variant="info">
          <Loader2 className="animate-spin" />
          <AlertDescription>
            {job.status === "en_cola"
              ? "La conciliación está en cola, iniciará en breve…"
              : esReuso
                ? `⚡ Reutilizando propuesta generada el ${fmtFecha(job.propuesta_origen_at!)} — sin espera de SUNAT. Procesando…`
                : "Descargando propuesta SUNAT y procesando registros. Esta página se actualiza automáticamente cada 3 segundos."}
          </AlertDescription>
        </Alert>
      )}

      {job.status === "error" && job.error_message && (
        <Alert variant="destructive">
          <XCircle />
          <AlertDescription>{job.error_message}</AlertDescription>
        </Alert>
      )}

      {puedeReanudar && (
        <Alert>
          <RotateCcw />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              Esta conciliación se puede reanudar: si SUNAT ya generó el archivo, se retomará desde
              ahí sin esperar de nuevo.
            </span>
            <Button size="sm" onClick={() => reanudar.mutate()} disabled={reanudar.isPending}>
              <RotateCcw className="size-4" />
              Reanudar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoCard label="Estado">
          {job.status === "completado" && <Badge tone="success">Completado</Badge>}
          {job.status === "error" && <Badge tone="danger">Error</Badge>}
          {job.status === "en_cola" && <Badge>En cola</Badge>}
          {job.status === "procesando" && <Badge tone="info">Procesando</Badge>}
        </InfoCard>
        <InfoCard label="Periodo">
          <p className="font-mono font-semibold">
            {job.periodo.slice(0, 4)}/{job.periodo.slice(4)}
          </p>
        </InfoCard>
        <InfoCard label="Archivo empresa">
          <p className="truncate text-sm">{job.empresa_filename ?? "—"}</p>
        </InfoCard>
        <InfoCard label="Creado">
          <p className="text-sm">{fmtFecha(job.created_at)}</p>
        </InfoCard>
      </div>

      {tieneResultado && (
        <>
          <Separator />

          {job.tiene_alertas_rojas && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertDescription>
                Se encontraron <strong>alertas rojas</strong>. Revisa los escenarios con diferencias
                en el reporte Excel.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <EscenarioCard letra="A" titulo="Solo empresa" count={job.escenario_a_count ?? 0} detalle="En tu archivo, no en SUNAT" />
            <EscenarioCard letra="B" titulo="Solo SUNAT" count={job.escenario_b_count ?? 0} detalle="En SUNAT, no en tu archivo" />
            <EscenarioCard letra="C" titulo="Diferencias" count={job.escenario_c_count ?? 0} detalle="Coinciden pero con montos distintos" />
            <EscenarioCard letra="D" titulo="Coinciden OK" count={job.escenario_d_count ?? 0} detalle="Idénticos en ambos lados" verde />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total diferencia IGV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-bold">
                S/ {(job.igv_diferencia_total ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Suma del IGV de escenarios B y C</p>
            </CardContent>
          </Card>
        </>
      )}

      {job.status === "completado" && job.has_report && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <FileSpreadsheet className="size-5 text-emerald-600" />
                Descargas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                onClick={() => bajar(() => descargarReporte(job.id), "No se pudo descargar el reporte")}
              >
                <Download className="size-4" />
                Reporte Excel
              </Button>
              {(["a", "b", "c", "d"] as const).map((esc) =>
                job[`has_csv_${esc}` as const] ? (
                  <Button
                    key={esc}
                    variant="outline"
                    onClick={() => bajar(() => descargarCsv(job.id, esc), "No se pudo descargar el CSV")}
                  >
                    <FileText className="size-4" />
                    CSV Escenario {esc.toUpperCase()}
                  </Button>
                ) : null,
              )}
            </CardContent>
          </Card>
        </>
      )}

      {job.completed_at && (
        <p className="text-xs text-muted-foreground">
          <Clock className="mr-1 inline size-3" />
          Completado: {fmtFecha(job.completed_at)}
        </p>
      )}
    </div>
  )
}
