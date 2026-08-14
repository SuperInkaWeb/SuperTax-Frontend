import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { getJobResult, listJobs } from "@/features/sunat/api"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

import type { SunatJobStatus } from "@/features/sunat/api"

const ESTADO: Record<SunatJobStatus, { label: string; tone: "neutral" | "info" | "success" | "danger" }> = {
  en_cola: { label: "En cola", tone: "neutral" },
  procesando: { label: "Procesando", tone: "info" },
  completado: { label: "Completado", tone: "success" },
  error: { label: "Error", tone: "danger" },
  cancelado: { label: "Cancelado", tone: "danger" },
}

function ResultadosDelJob({ jobId }: { jobId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sunat", "job-result", jobId],
    queryFn: () => getJobResult(jobId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  }
  if (!data || data.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Sin comprobantes en este job.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="p-2">Comprobante</th>
            <th className="p-2">Estado</th>
            <th className="p-2">PDF</th>
            <th className="p-2">XML</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="p-2 font-medium">{r.id}</td>
              <td className="p-2">
                <Badge tone={r.estado === "OK" ? "success" : r.estado === "Parcial" ? "info" : "danger"}>
                  {r.estado}
                </Badge>
              </td>
              <td className="p-2">{r.pide_pdf === false ? "—" : r.pdf ? "✓" : "✗"}</td>
              <td className="p-2">{r.pide_xml === false ? "—" : r.xml ? "✓" : "✗"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function HistorialPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const [abierto, setAbierto] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sunat", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === "en_cola" || j.status === "procesando")
        ? 5000
        : false,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }
  if (isError) {
    return <p className="text-sm text-destructive">No se pudo cargar el historial.</p>
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay descargas.</p>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3">Job</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((job) => (
                <tr key={job.job_id} className="border-b last:border-0">
                  <td className="max-w-[220px] truncate p-3 font-mono text-xs">{job.job_id}</td>
                  <td className="p-3">
                    <Badge tone={ESTADO[job.status].tone}>{ESTADO[job.status].label}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(job.created_at).toLocaleString("es-PE")}
                  </td>
                  <td className="p-3 text-right">
                    {job.has_result && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAbierto(abierto === job.job_id ? null : job.job_id)}
                      >
                        {abierto === job.job_id ? "Ocultar" : "Ver resultados"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {abierto && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-sm font-medium">Resultados del job</p>
            <ResultadosDelJob jobId={abierto} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
