import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { createJob } from "@/features/sire/api"
import { apiError } from "@/shared/lib/api/error"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"

import type { TipoLibro } from "@/shared/types"
import type { FormEvent } from "react"

export function NuevaConciliacionPage() {
  const [periodo, setPeriodo] = useState("")
  const [tipoLibro, setTipoLibro] = useState<TipoLibro>("compras")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [sinSire, setSinSire] = useState(false)
  const [reutilizar, setReutilizar] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const crear = useMutation({
    mutationFn: () =>
      createJob({
        periodo,
        tipo_libro: tipoLibro,
        archivo: archivo as File,
        sin_sire: sinSire,
        reutilizar_propuesta: reutilizar,
      }),
    onSuccess: () => {
      toast.success("Conciliación creada — se está procesando")
      queryClient.invalidateQueries({ queryKey: ["sire", "jobs"] })
      navigate("/sire")
    },
    onError: (err) => toast.error(apiError(err, "No se pudo crear la conciliación")),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!archivo) {
      toast.error("Selecciona el archivo de la empresa")
      return
    }
    crear.mutate()
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="periodo">Periodo (AAAAMM)</Label>
            <Input
              id="periodo"
              placeholder="202601"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo_libro">Libro</Label>
            <Select
              id="tipo_libro"
              value={tipoLibro}
              onChange={(e) => setTipoLibro(e.target.value as TipoLibro)}
            >
              <option value="compras">Compras</option>
              <option value="ventas">Ventas</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archivo">Archivo de la empresa (TXT/CSV)</Label>
            <Input
              id="archivo"
              type="file"
              accept=".txt,.csv"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {tipoLibro === "compras" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sinSire}
                onChange={(e) => setSinSire(e.target.checked)}
              />
              La empresa no está afiliada al SIRE (compras rezagadas)
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reutilizar}
              onChange={(e) => setReutilizar(e.target.checked)}
            />
            Reutilizar una propuesta fresca si existe
          </label>

          <div className="flex gap-2">
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando…" : "Crear conciliación"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/sire")}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
