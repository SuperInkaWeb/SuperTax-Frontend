import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  analizarArchivo,
  deleteSavedMapping,
  getSavedMapping,
  guardarFormato,
} from "@/features/sire/api"
import { MapeoEditor } from "@/features/sire/MapeoEditor"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"

import type { AnalisisArchivo, MapeoConfig } from "@/features/sire/api"
import type { TipoLibro } from "@/shared/types"

export function FormatoPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const [tipoLibro, setTipoLibro] = useState<TipoLibro>("compras")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [analisis, setAnalisis] = useState<AnalisisArchivo | null>(null)

  const { data: saved } = useQuery({
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
    mutationFn: (f: File) => analizarArchivo(tipoLibro, f),
    onSuccess: (res) => setAnalisis(res),
    onError: (err) => toast.error(apiError(err, "No se pudo analizar el archivo")),
  })

  const guardar = useMutation({
    mutationFn: (config: MapeoConfig) => guardarFormato(tipoLibro, config, archivo as File),
    onSuccess: () => {
      toast.success("Formato guardado")
      queryClient.invalidateQueries({ queryKey: ["sire", "mapping"] })
    },
    onError: (err) => toast.error(apiError(err, "El mapeo no superó la validación")),
  })

  return (
    <div className="max-w-3xl space-y-4">
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
            {saved
              ? `Formato guardado para ${tipoLibro}.`
              : `Sin formato guardado para ${tipoLibro} (se autodetecta).`}
          </p>
          {saved && (
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
        <Label htmlFor="archivo">Analizar un archivo para mapear sus columnas</Label>
        <Input
          id="archivo"
          type="file"
          accept=".txt,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setArchivo(f)
            setAnalisis(null)
            if (f) analizar.mutate(f)
          }}
        />
      </div>

      {analisis && (
        <Card>
          <CardContent className="pt-5">
            <MapeoEditor
              analisis={analisis}
              onGuardar={(config) => guardar.mutate(config)}
              guardando={guardar.isPending}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
