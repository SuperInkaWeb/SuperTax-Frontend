import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Plus, RotateCcw } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { descargarCsv, descargarReporte, listJobs, resumeJob } from "@/features/sire/api"
import { StatusBadge } from "@/features/sire/StatusBadge"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

import type { ReconciliationJob } from "@/shared/types"

const ESCENARIOS = ["a", "b", "c", "d"] as const

export function JobsPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const [detalle, setDetalle] = useState<ReconciliationJob | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sire", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
  })

  const resume = useMutation({
    mutationFn: resumeJob,
    onSuccess: () => {
      toast.success("Conciliación reencolada")
      queryClient.invalidateQueries({ queryKey: ["sire", "jobs"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo reanudar")),
  })

  const bajarReporte = useMutation({
    mutationFn: descargarReporte,
    onError: (err) => toast.error(apiError(err, "No se pudo descargar")),
  })
  const bajarCsv = useMutation({
    mutationFn: (v: { id: number; esc: "a" | "b" | "c" | "d" }) =>
      descargarCsv(v.id, v.esc),
    onError: (err) => toast.error(apiError(err, "No se pudo descargar el CSV")),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link to="/sire/nueva" className={buttonVariants()}>
          <Plus className="size-4" />
          Nueva conciliación
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {isError && (
        <p className="text-sm text-destructive">No se pudieron cargar las conciliaciones.</p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">Aún no hay conciliaciones.</p>
      )}

      {data && data.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Libro</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Creado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((job) => (
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{job.periodo}</td>
                    <td className="p-3 capitalize">{job.tipo_libro}</td>
                    <td className="p-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetalle(job)}>
                          Detalle
                        </Button>
                        {job.status === "error" && (
                          <Button size="sm" variant="ghost" onClick={() => resume.mutate(job.id)}>
                            <RotateCcw className="size-4" />
                            Reanudar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {detalle && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">
                {detalle.periodo} · {detalle.tipo_libro}
              </span>
              <StatusBadge status={detalle.status} />
              {detalle.tiene_alertas_rojas && <Badge tone="danger">Alertas rojas</Badge>}
            </div>

            {detalle.error_message && (
              <p className="text-sm text-destructive">{detalle.error_message}</p>
            )}
            {detalle.status === "completado" && (
              <p className="text-sm text-muted-foreground">
                Diferencia de IGV:{" "}
                <span className="font-medium text-foreground">
                  {detalle.igv_diferencia_total ?? 0}
                </span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {detalle.has_report && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bajarReporte.mutate(detalle.id)}
                >
                  <Download className="size-4" />
                  Reporte Excel
                </Button>
              )}
              {ESCENARIOS.map((esc) =>
                detalle[`has_csv_${esc}` as const] ? (
                  <Button
                    key={esc}
                    size="sm"
                    variant="ghost"
                    onClick={() => bajarCsv.mutate({ id: detalle.id, esc })}
                  >
                    CSV {esc.toUpperCase()}
                  </Button>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
