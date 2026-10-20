import { useQuery } from "@tanstack/react-query"
import { Building2, Download, FileSpreadsheet, Mail, PackageOpen, Plus, ScanLine } from "lucide-react"
import { Link } from "react-router-dom"

import { listRecords, listScans, reviewCount } from "@/features/correos/api"
import { Donut } from "@/features/dashboard/Donut"
import { listDocumentos } from "@/features/scanner/api"
import { listJobs as listSireJobs } from "@/features/sire/api"
import { listJobs as listSunatJobs } from "@/features/sunat/api"
import { CHART_COLORS } from "@/shared/lib/chartColors"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { buttonVariants } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { StatCard } from "@/shared/ui/stat-card"

// Colores de los escenarios de conciliación, tomados de la rampa del design system
// (chart-2 verde = coinciden, chart-3 azul = diferencias, chart-4 ámbar = solo
// empresa, chart-5 teja = solo SUNAT).
const ESCENARIO = { A: CHART_COLORS[3], B: CHART_COLORS[4], C: CHART_COLORS[2], D: CHART_COLORS[1] }

function SireCard({ companyId }: { companyId: number }) {
  const { data: jobs = [] } = useQuery({
    queryKey: ["sire", "jobs", companyId],
    queryFn: listSireJobs,
  })

  const completadas = jobs.filter((j) => j.status === "completado").length
  const enProceso = jobs.filter((j) => j.status === "en_cola" || j.status === "procesando").length
  const conError = jobs.filter((j) => j.status === "error").length
  const ultima = [...jobs]
    .filter((j) => j.status === "completado" && j.escenario_a_count !== null)
    .sort((a, b) => b.id - a.id)[0]

  const segmentos = ultima
    ? [
        { label: "Coinciden OK", value: ultima.escenario_d_count ?? 0, color: ESCENARIO.D },
        { label: "Diferencias", value: ultima.escenario_c_count ?? 0, color: ESCENARIO.C },
        { label: "Solo empresa", value: ultima.escenario_a_count ?? 0, color: ESCENARIO.A },
        { label: "Solo SUNAT", value: ultima.escenario_b_count ?? 0, color: ESCENARIO.B },
      ].filter((s) => s.value > 0)
    : []
  const comparado = segmentos.reduce((s, d) => s + d.value, 0)
  const conciliables =
    (ultima?.escenario_a_count ?? 0) + (ultima?.escenario_c_count ?? 0) + (ultima?.escenario_d_count ?? 0)
  const tasa = conciliables ? Math.round(((ultima?.escenario_d_count ?? 0) / conciliables) * 100) : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <FileSpreadsheet className="size-4 text-primary" /> SIRE
        </CardTitle>
        <Link to="/sire/nueva" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Plus className="size-4" /> Nueva
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total" value={jobs.length} />
          <StatCard label="En proceso" value={enProceso} />
          <StatCard label="Con error" value={conError} />
        </div>

        {segmentos.length > 0 ? (
          <div className="mt-5 flex items-center gap-5">
            <Donut data={segmentos} centro={`${tasa}%`} subcentro="conciliado" />
            <div className="min-w-0 space-y-1.5 text-sm">
              {segmentos.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-muted-foreground">{s.label}</span>
                  <span className="ml-auto pl-3 font-mono font-semibold">
                    {s.value.toLocaleString("es-PE")}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t pt-1.5">
                <span className="text-muted-foreground">Comparado</span>
                <span className="ml-auto pl-3 font-mono font-semibold">
                  {comparado.toLocaleString("es-PE")}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {completadas === 0
              ? "Aún no hay conciliaciones completadas."
              : "La última conciliación no tiene desglose de escenarios."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SunatCard({ companyId }: { companyId: number }) {
  const { data: jobs = [] } = useQuery({
    queryKey: ["sunat", "jobs", companyId],
    queryFn: listSunatJobs,
  })
  const completadas = jobs.filter((j) => j.status === "completado").length
  const enProceso = jobs.filter((j) => j.status === "en_cola" || j.status === "procesando").length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Download className="size-4 text-primary" /> Descarga SUNAT
        </CardTitle>
        <Link to="/sunat" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Plus className="size-4" /> Nueva
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Descargas" value={jobs.length} />
          <StatCard label="Completadas" value={completadas} />
          <StatCard label="En proceso" value={enProceso} />
        </div>
      </CardContent>
    </Card>
  )
}

function ScannerCard({ companyId }: { companyId: number }) {
  const { data: docs = [] } = useQuery({
    queryKey: ["scanner", "documentos", companyId],
    queryFn: () => listDocumentos("todos"),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <ScanLine className="size-4 text-primary" /> Escaneo
        </CardTitle>
        <Link to="/scanner" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Plus className="size-4" /> Subir
        </Link>
      </CardHeader>
      <CardContent>
        <StatCard label="Documentos procesados" value={docs.length} />
      </CardContent>
    </Card>
  )
}

function CorreosCard({ companyId }: { companyId: number }) {
  const registros = useQuery({
    queryKey: ["correos", "records-total", companyId],
    queryFn: () => listRecords({ limit: 1 }),
  })
  const pendientes = useQuery({ queryKey: ["correos", "review-count"], queryFn: reviewCount })
  const escaneos = useQuery({ queryKey: ["correos", "scans"], queryFn: listScans })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Mail className="size-4 text-primary" /> Automatización de correos
        </CardTitle>
        <Link to="/correos" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Plus className="size-4" /> Escanear
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Registros" value={registros.data?.total ?? 0} />
          <StatCard label="Pendientes" value={pendientes.data ?? 0} />
          <StatCard label="Escaneos" value={escaneos.data?.length ?? 0} />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const companyId = useActiveCompany((s) => s.companyId)
  const empresa = user?.companies.find((c) => c.id === companyId)
  const modulos = empresa?.modules ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {user?.nombre?.split(" ")[0] ?? "usuario"} 👋
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {empresa ? `${empresa.razon_social} · RUC ${empresa.ruc}` : "Selecciona o agrega una empresa"}
        </p>
      </div>

      {companyId == null ? (
        <EmptyState
          icon={Building2}
          title="No tienes una empresa activa"
          description="Usa el selector de empresa en la barra superior, o “+ Empresa”, para agregar una y empezar."
        />
      ) : modulos.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Sin módulos activos"
          description="Esta empresa aún no tiene módulos activos. Un administrador de plataforma los activará pronto."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modulos.includes("sire") && <SireCard companyId={companyId} />}
          {modulos.includes("sunat") && <SunatCard companyId={companyId} />}
          {modulos.includes("scanner") && <ScannerCard companyId={companyId} />}
          {modulos.includes("correos") && <CorreosCard companyId={companyId} />}
        </div>
      )}
    </div>
  )
}
