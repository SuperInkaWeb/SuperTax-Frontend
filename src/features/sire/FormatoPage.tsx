import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { analizarArchivo, deleteSavedMapping, getSavedMapping } from "@/features/sire/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"

import type { TipoLibro } from "@/shared/types"

export function FormatoPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const [tipoLibro, setTipoLibro] = useState<TipoLibro>("compras")
  const [analisis, setAnalisis] = useState<Record<string, unknown> | null>(null)

  const { data } = useQuery({
    queryKey: ["sire", "mapping", companyId, tipoLibro],
    queryFn: () => getSavedMapping(tipoLibro),
    enabled: companyId != null,
  })

  const eliminar = useMutation({
    mutationFn: () => deleteSavedMapping(tipoLibro),
    onSuccess: () => {
      toast.success("Formato eliminado")
      queryClient.invalidateQueries({ queryKey: ["sire", "mapping"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo eliminar")),
  })

  const analizar = useMutation({
    mutationFn: (archivo: File) => analizarArchivo(tipoLibro, archivo),
    onSuccess: (resultado) => setAnalisis(resultado),
    onError: (err) => toast.error(apiError(err, "No se pudo analizar el archivo")),
  })

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tipo_libro">Libro</Label>
        <Select
          id="tipo_libro"
          className="max-w-xs"
          value={tipoLibro}
          onChange={(e) => {
            setTipoLibro(e.target.value as TipoLibro)
            setAnalisis(null)
          }}
        >
          <option value="compras">Compras</option>
          <option value="ventas">Ventas</option>
        </Select>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between pt-5">
          <p className="text-sm">
            {data
              ? `Formato guardado para ${tipoLibro}.`
              : `Sin formato guardado para ${tipoLibro} (se autodetecta).`}
          </p>
          {data && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => eliminar.mutate()}
              disabled={eliminar.isPending}
            >
              Eliminar
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label htmlFor="archivo">Analizar un archivo (previsualiza columnas)</Label>
        <Input
          id="archivo"
          type="file"
          accept=".txt,.csv"
          onChange={(e) => {
            const archivo = e.target.files?.[0]
            if (archivo) analizar.mutate(archivo)
          }}
        />
      </div>

      {analisis && (
        <Card>
          <CardContent className="pt-5">
            <pre className="max-h-80 overflow-auto text-xs">
              {JSON.stringify(analisis.config ?? analisis, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
