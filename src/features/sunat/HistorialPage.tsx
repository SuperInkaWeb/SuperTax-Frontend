import { useQuery } from "@tanstack/react-query"
import { Inbox } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import {
  descargarReporte,
  getJobResult,
  listJobs,
  type ResultadoComprobante,
  type SunatJobItem,
} from "@/features/sunat/api"
import { ESTADO_JOB, toneComprobante } from "@/features/sunat/estados"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Badge } from "@/shared/ui/badge"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"
import { EmptyState } from "@/shared/ui/empty-state"
import { StatusBadge } from "@/shared/ui/status-badge"

import type { ColumnDef } from "@tanstack/react-table"

const COLUMNAS_RESULTADO: ColumnDef<ResultadoComprobante>[] = [
  { header: "Comprobante", cell: ({ row }) => <span className="font-medium">{row.original.id}</span> },
  { header: "Emisor", cell: ({ row }) => row.original.emisor ?? "—" },
  { header: "Estado", cell: ({ row }) => <Badge tone={toneComprobante(row.original.estado)}>{row.original.estado}</Badge> },
  { header: "PDF", cell: ({ row }) => (row.original.pide_pdf === false ? "—" : row.original.pdf ? "✓" : "✗") },
  { header: "XML", cell: ({ row }) => (row.original.pide_xml === false ? "—" : row.original.xml ? "✓" : "✗") },
  {
    header: "Descripción",
    cell: ({ row }) => (
      <span className="block max-w-[24rem] text-xs text-muted-foreground">{row.original.descripcion ?? "—"}</span>
    ),
  },
]

function ResultadosDelJob({ jobId }: { jobId: string }) {
  const resultados = useQuery({
    queryKey: ["sunat", "job-result", jobId],
    queryFn: () => getJobResult(jobId),
  })
  return (
    <AsyncBoundary
      query={resultados}
      isEmpty={(d) => d.length === 0}
      empty={<p className="p-4 text-sm text-muted-foreground">Sin comprobantes en este job.</p>}
    >
      {(data) => <DataTable columns={COLUMNAS_RESULTADO} data={data} getRowId={(r) => r.id} />}
    </AsyncBoundary>
  )
}

export function HistorialPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const [abierto, setAbierto] = useState<string | null>(null)

  const jobs = useQuery({
    queryKey: ["sunat", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === "en_cola" || j.status === "procesando") ? 5000 : false,
  })

  const exportar = async (jobId: string) => {
    try {
      await descargarReporte(jobId)
    } catch (e) {
      toast.error(apiError(e, "No se pudo exportar el reporte"))
    }
  }

  const columnas: ColumnDef<SunatJobItem>[] = [
    { header: "Job", cell: ({ row }) => <span className="block max-w-[220px] truncate font-mono text-xs">{row.original.job_id}</span> },
    { header: "Estado", cell: ({ row }) => <StatusBadge value={row.original.status} map={ESTADO_JOB} /> },
    { header: "Fecha", cell: ({ row }) => <span className="text-muted-foreground">{new Date(row.original.created_at).toLocaleString("es-PE")}</span> },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) =>
        row.original.has_result ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => exportar(row.original.job_id)}>
              Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAbierto(abierto === row.original.job_id ? null : row.original.job_id)}
            >
              {abierto === row.original.job_id ? "Ocultar" : "Ver resultados"}
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <AsyncBoundary
        query={jobs}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={Inbox}
            title="Aún no hay descargas"
            description="Cuando ejecutes una descarga, aparecerá aquí con su estado y resultados."
            action={
              <Link to="/sunat" className={buttonVariants()}>
                Nueva descarga
              </Link>
            }
          />
        }
      >
        {(data) => (
          <Card>
            <CardContent className="p-0">
              <DataTable columns={columnas} data={data} getRowId={(j) => j.job_id} />
            </CardContent>
          </Card>
        )}
      </AsyncBoundary>

      {abierto ? (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-sm font-medium">Resultados del job</p>
            <ResultadosDelJob jobId={abierto} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
