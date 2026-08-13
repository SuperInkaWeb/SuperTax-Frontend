import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { getTipos, listDocumentos, updateDocumento } from "@/features/scanner/api"
import { CamposEditor } from "@/features/scanner/CamposEditor"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Card, CardContent } from "@/shared/ui/card"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { Documento } from "@/features/scanner/api"

export function DocumentosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const [tipo, setTipo] = useState("todos")
  const [seleccionado, setSeleccionado] = useState<Documento | null>(null)

  const { data: tipos } = useQuery({ queryKey: ["scanner", "tipos"], queryFn: getTipos })
  const { data, isLoading, isError } = useQuery({
    queryKey: ["scanner", "documentos", companyId, tipo],
    queryFn: () => listDocumentos(tipo),
    enabled: companyId != null,
  })

  const guardar = useMutation({
    mutationFn: (campos: Record<string, unknown>) =>
      updateDocumento((seleccionado as Documento).id, campos),
    onSuccess: (doc) => {
      toast.success("Campos guardados")
      setSeleccionado(doc)
      queryClient.invalidateQueries({ queryKey: ["scanner", "documentos"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudieron guardar")),
  })

  return (
    <div className="space-y-6">
      <Select className="max-w-xs" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="todos">Todos los tipos</option>
        {Object.entries(tipos ?? {}).map(([key, t]) => (
          <option key={key} value={key}>
            {t.etiqueta}
          </option>
        ))}
      </Select>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-destructive">No se pudieron cargar los documentos.</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">Aún no hay documentos.</p>
      )}

      {data && data.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Archivo</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{doc.nombre_archivo}</td>
                    <td className="p-3">{doc.tipo_etiqueta ?? doc.tipo_documento}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => setSeleccionado(doc)}
                      >
                        Ver / editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {seleccionado && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <p className="font-medium">{seleccionado.nombre_archivo}</p>
            <CamposEditor
              key={seleccionado.id}
              campos={seleccionado.campos}
              onGuardar={(campos) => guardar.mutate(campos)}
              guardando={guardar.isPending}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
