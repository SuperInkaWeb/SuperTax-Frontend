import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Eye, Plus, RotateCcw } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { descargarReporte, listJobs, resumeJob } from "@/features/sire/api"
import { StatusBadge } from "@/features/sire/StatusBadge"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

export function JobsPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sire", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === "en_cola" || j.status === "procesando")
        ? 5000
        : false,
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

  const sorted = data ? [...data].sort((a, b) => b.id - a.id) : []

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

      {sorted.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Libro</th>
                  <th className="p-3">Archivo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Creado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job) => (
                  <tr key={job.id} className="border-b transition-colors last:border-0 hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">#{job.id}</td>
                    <td className="p-3 font-medium">
                      {job.periodo.slice(0, 4)}/{job.periodo.slice(4)}
                    </td>
                    <td className="p-3 capitalize">{job.tipo_libro}</td>
                    <td className="max-w-[180px] truncate p-3 text-xs text-muted-foreground">
                      {job.empresa_filename ?? "—"}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString("es-PE")}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/sire/jobs/${job.id}`}
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          aria-label="Ver detalle"
                        >
                          <Eye className="size-4" />
                        </Link>
                        {job.has_report && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Descargar reporte"
                            onClick={() => bajarReporte.mutate(job.id)}
                          >
                            <Download className="size-4" />
                          </Button>
                        )}
                        {job.status === "error" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Reanudar"
                            onClick={() => resume.mutate(job.id)}
                          >
                            <RotateCcw className="size-4" />
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
    </div>
  )
}
