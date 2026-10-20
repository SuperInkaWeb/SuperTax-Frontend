import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Eye, Inbox, Plus, RotateCcw } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { descargarReporte, listJobs, resumeJob } from "@/features/sire/api"
import { StatusBadge } from "@/features/sire/StatusBadge"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"
import { EmptyState } from "@/shared/ui/empty-state"

import type { ReconciliationJob } from "@/shared/types"
import type { ColumnDef } from "@tanstack/react-table"

export function JobsPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const jobs = useQuery({
    queryKey: ["sire", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === "en_cola" || j.status === "procesando") ? 5000 : false,
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

  const columnas: ColumnDef<ReconciliationJob>[] = [
    { header: "#", cell: ({ row }) => <span className="font-mono text-xs">#{row.original.id}</span> },
    { header: "Periodo", cell: ({ row }) => <span className="font-medium">{row.original.periodo.slice(0, 4)}/{row.original.periodo.slice(4)}</span> },
    { header: "Libro", cell: ({ row }) => <span className="capitalize">{row.original.tipo_libro}</span> },
    { header: "Archivo", cell: ({ row }) => <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{row.original.empresa_filename ?? "—"}</span> },
    { header: "Estado", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: "Creado", cell: ({ row }) => <span className="text-muted-foreground">{new Date(row.original.created_at).toLocaleDateString("es-PE")}</span> },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link to={`/sire/jobs/${row.original.id}`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="Ver detalle">
            <Eye className="size-4" />
          </Link>
          {row.original.has_report ? (
            <Button size="icon" variant="ghost" aria-label="Descargar reporte" onClick={() => bajarReporte.mutate(row.original.id)}>
              <Download className="size-4" />
            </Button>
          ) : null}
          {row.original.status === "error" ? (
            <Button size="icon" variant="ghost" aria-label="Reanudar" onClick={() => resume.mutate(row.original.id)}>
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <AsyncBoundary
      query={jobs}
      isEmpty={(d) => d.length === 0}
      empty={
        <EmptyState
          icon={Inbox}
          title="Aún no hay conciliaciones"
          description="Crea tu primera conciliación para comparar tu registro contra la propuesta de SUNAT."
          action={
            <Link to="/sire/nueva" className={buttonVariants()}>
              <Plus className="size-4" />
              Nueva conciliación
            </Link>
          }
        />
      }
    >
      {(data) => {
        const sorted = [...data].sort((a, b) => b.id - a.id)
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link to="/sire/nueva" className={buttonVariants()}>
                <Plus className="size-4" />
                Nueva conciliación
              </Link>
            </div>
            <Card>
              <CardContent className="p-0">
                <DataTable columns={columnas} data={sorted} getRowId={(j) => String(j.id)} />
              </CardContent>
            </Card>
          </div>
        )
      }}
    </AsyncBoundary>
  )
}
