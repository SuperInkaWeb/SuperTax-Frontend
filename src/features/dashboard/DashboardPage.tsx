import { useQuery } from "@tanstack/react-query"
import { Download, FileSpreadsheet, Plus, ScanLine } from "lucide-react"
import { Link } from "react-router-dom"

import { Donut } from "@/features/dashboard/Donut"
import { listDocumentos } from "@/features/scanner/api"
import { listJobs as listSireJobs } from "@/features/sire/api"
import { listJobs as listSunatJobs } from "@/features/sunat/api"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { buttonVariants } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

const COLOR = { A: "#f59e0b", B: "#ef4444", C: "#3b82f6", D: "#10b981" }

function StatMini({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

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
        { label: "Coinciden OK", value: ultima.escenario_d_count ?? 0, color: COLOR.D },
        { label: "Diferencias", value: ultima.escenario_c_count ?? 0, color: COLOR.C },
        { label: "Solo empresa", value: ultima.escenario_a_count ?? 0, color: COLOR.A },
        { label: "Solo SUNAT", value: ultima.escenario_b_count ?? 0, color: COLOR.B },
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
          <StatMini label="Total" value={jobs.length} />
          <StatMini label="En proceso" value={enProceso} />
          <StatMini label="Con error" value={conError} />
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
          <StatMini label="Descargas" value={jobs.length} />
          <StatMini label="Completadas" value={completadas} />
          <StatMini label="En proceso" value={enProceso} />
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
        <StatMini label="Documentos procesados" value={docs.length} />
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
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No tienes una empresa activa. Usa el selector de arriba o “+ Empresa” para agregar una.
          </CardContent>
        </Card>
      ) : modulos.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            Esta empresa aún no tiene módulos activos. Un administrador de plataforma los activará
            pronto.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modulos.includes("sire") && <SireCard companyId={companyId} />}
          {modulos.includes("sunat") && <SunatCard companyId={companyId} />}
          {modulos.includes("scanner") && <ScannerCard companyId={companyId} />}
        </div>
      )}
    </div>
  )
}
