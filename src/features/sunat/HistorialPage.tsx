import { useQuery } from "@tanstack/react-query"

import { listJobs } from "@/features/sunat/api"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

export function HistorialPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sunat", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
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
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="p-3">Job</th>
              <th className="p-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data.map((job) => (
              <tr key={job.id} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs">{job.job_id}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
