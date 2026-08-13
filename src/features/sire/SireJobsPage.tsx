import { useSireJobs } from "@/features/sire/api"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

const ESTADO_LABEL: Record<string, string> = {
  en_cola: "En cola",
  procesando: "Procesando",
  completado: "Completado",
  error: "Error",
}

export function SireJobsPage() {
  const { data, isLoading, isError } = useSireJobs()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Conciliaciones SIRE</h1>

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
                </tr>
              </thead>
              <tbody>
                {data.map((job) => (
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{job.periodo}</td>
                    <td className="p-3 capitalize">{job.tipo_libro}</td>
                    <td className="p-3">{ESTADO_LABEL[job.status] ?? job.status}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
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
