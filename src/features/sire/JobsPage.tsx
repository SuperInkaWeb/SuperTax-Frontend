import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Plus, RotateCcw } from "lucide-react"
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
  })

  const resume = useMutation({
    mutationFn: resumeJob,
    onSuccess: () => {
      toast.success("Conciliación reencolada")
      queryClient.invalidateQueries({ queryKey: ["sire", "jobs"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo reanudar")),
  })

  const descargar = useMutation({
    mutationFn: descargarReporte,
    onError: (err) => toast.error(apiError(err, "No se pudo descargar")),
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
                        {job.has_report && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => descargar.mutate(job.id)}
                          >
                            <Download className="size-4" />
                            Reporte
                          </Button>
                        )}
                        {job.status === "error" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resume.mutate(job.id)}
                          >
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
    </div>
  )
}
