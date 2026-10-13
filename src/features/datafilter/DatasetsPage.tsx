import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Database, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { deleteDataset, listDatasets, uploadDataset } from "@/features/datafilter/api"
import { ORIGIN_LABEL, STATUS_META, enProceso, formatBytes, formatRows } from "@/features/datafilter/lib"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button, buttonVariants } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { Spinner } from "@/shared/ui/spinner"

const EXTENSIONES = ".csv,.txt,.xlsx,.xls"

export function DatasetsPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progreso, setProgreso] = useState<number | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ["datafilter", "datasets", companyId],
    queryFn: listDatasets,
    enabled: companyId != null,
    refetchInterval: (query) =>
      query.state.data?.some((d) => enProceso(d.status)) ? 3000 : false,
  })

  const subir = useMutation({
    mutationFn: (file: File) => uploadDataset(file, setProgreso),
    onSuccess: () => {
      toast.success("Archivo subido. Procesando…")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo subir el archivo")),
    onSettled: () => setProgreso(null),
  })

  const eliminar = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      toast.success("Dataset eliminado")
      queryClient.invalidateQueries({ queryKey: ["datafilter", "datasets"] })
    },
    onError: (e) => toast.error(apiError(e, "No se pudo eliminar")),
  })

  function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) subir.mutate(file)
    e.target.value = "" // permite re-subir el mismo archivo
  }

  async function pedirEliminar(id: number, nombre: string) {
    const ok = await confirmar({
      title: "Eliminar dataset",
      description: `Se borrará "${nombre}" y sus archivos. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      destructive: true,
    })
    if (ok) eliminar.mutate(id)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="text-sm font-medium">Subir archivo</p>
            <p className="text-sm text-muted-foreground">
              CSV, TXT o Excel (.xlsx/.xls). Se convierte para filtrarlo y analizarlo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {progreso !== null && (
              <span className="text-sm text-muted-foreground">Subiendo… {progreso}%</span>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={EXTENSIONES}
              className="hidden"
              onChange={alElegirArchivo}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={subir.isPending}>
              <Upload className="size-4" />
              {subir.isPending ? "Subiendo…" : "Seleccionar archivo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar los datasets"
          description="Revisa tu conexión y vuelve a intentarlo en unos segundos."
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Aún no hay datasets"
          description="Sube un archivo grande para filtrarlo, analizarlo y descargar resultados."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Archivo</th>
                  <th className="p-3">Origen</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Filas</th>
                  <th className="p-3 text-right">Tamaño</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} className="border-b align-middle last:border-0">
                    <td className="max-w-[20rem] truncate p-3 font-medium">
                      {d.original_filename}
                      {d.status === "failed" && d.error && (
                        <span className="block text-xs font-normal text-destructive">{d.error}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{ORIGIN_LABEL[d.origin]}</td>
                    <td className="p-3">
                      <Badge tone={STATUS_META[d.status].tone}>{STATUS_META[d.status].label}</Badge>
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatRows(d.row_count)}</td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {formatBytes(d.size_bytes)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {d.status === "ready" && (
                          <Link
                            to={`/datafilter/${d.id}`}
                            className={buttonVariants({ size: "sm", variant: "outline" })}
                          >
                            Abrir
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => pedirEliminar(d.id, d.original_filename)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
