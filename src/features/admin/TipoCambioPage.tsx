import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import {
  editarTipoCambio,
  listTipoCambio,
  refrescarTipoCambio,
  type TipoCambioDia,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"

import type { FormEvent } from "react"

/** Rango [primer día, último día] del mes 'AAAA-MM'. */
function rangoDelMes(mes: string): [string, string] {
  const [anio, numeroMes] = mes.split("-").map(Number)
  const ultimoDia = new Date(anio, numeroMes, 0).getDate()
  return [`${mes}-01`, `${mes}-${String(ultimoDia).padStart(2, "0")}`]
}

function mesActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
}

function EditarDiaDialog({
  dia,
  onClose,
  onSaved,
}: {
  dia: TipoCambioDia
  onClose: () => void
  onSaved: () => void
}) {
  const [compra, setCompra] = useState(String(dia.compra))
  const [venta, setVenta] = useState(String(dia.venta))

  const guardar = useMutation({
    mutationFn: () => editarTipoCambio(dia.fecha, Number(compra), Number(venta)),
    onSuccess: () => {
      toast.success(`TC del ${dia.fecha} actualizado (manual)`)
      onSaved()
      onClose()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo guardar el tipo de cambio")),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (Number(compra) <= 0 || Number(venta) <= 0) {
      toast.error("Compra y venta deben ser mayores a 0")
      return
    }
    guardar.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Editar tipo de cambio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {dia.fecha} — quedará como <span className="font-medium">manual</span> y el refresco del
          BCRP no lo sobrescribirá.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tc-compra">Compra</Label>
              <Input
                id="tc-compra"
                inputMode="decimal"
                value={compra}
                onChange={(e) => setCompra(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tc-venta">Venta</Label>
              <Input
                id="tc-venta"
                inputMode="decimal"
                value={venta}
                onChange={(e) => setVenta(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TipoCambioPage() {
  const queryClient = useQueryClient()
  const [mes, setMes] = useState(mesActual)
  const [editando, setEditando] = useState<TipoCambioDia | null>(null)
  const [desde, hasta] = useMemo(() => rangoDelMes(mes), [mes])

  const dias = useQuery({
    queryKey: ["tipo-cambio", mes],
    queryFn: () => listTipoCambio(desde, hasta),
  })

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["tipo-cambio", mes] })

  const refrescar = useMutation({
    mutationFn: () => refrescarTipoCambio(desde, hasta),
    onSuccess: (r) => {
      toast.success(`Actualizados ${r.actualizados} día(s) desde el BCRP`)
      invalidar()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo refrescar desde el BCRP")),
  })

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Tipo de cambio oficial (venta/compra) que usa la conciliación SIRE para detectar
        diferencias. Es <span className="font-medium text-foreground">nacional</span>: se puebla
        solo desde el BCRP; aquí puedes refrescar un mes o corregir un día a mano.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tc-mes">Mes</Label>
          <Input
            id="tc-mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="w-44"
          />
        </div>
        <Button variant="outline" disabled={refrescar.isPending} onClick={() => refrescar.mutate()}>
          <RefreshCw className="size-4" />
          {refrescar.isPending ? "Refrescando…" : "Refrescar desde BCRP"}
        </Button>
      </div>

      <AsyncBoundary
        query={dias}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Sin tipo de cambio para este mes. Usa “Refrescar desde BCRP” para traerlo.
            </CardContent>
          </Card>
        }
      >
        {(filas) => (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 text-right font-medium">Compra</th>
                    <th className="px-4 py-2.5 text-right font-medium">Venta</th>
                    <th className="px-4 py-2.5 font-medium">Fuente</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filas.map((d) => (
                    <tr key={d.fecha} className="border-b last:border-0">
                      <td className="px-4 py-2">{d.fecha}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {Number(d.compra).toFixed(3)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {Number(d.venta).toFixed(3)}
                      </td>
                      <td className="px-4 py-2">
                        {d.fuente === "manual" ? (
                          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            manual
                          </span>
                        ) : (
                          <span className="text-muted-foreground">BCRP</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditando(d)}>
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </AsyncBoundary>

      {editando && (
        <EditarDiaDialog
          dia={editando}
          onClose={() => setEditando(null)}
          onSaved={invalidar}
        />
      )}
    </div>
  )
}
