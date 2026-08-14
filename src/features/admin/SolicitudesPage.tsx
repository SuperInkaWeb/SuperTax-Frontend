import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { listAccessRequests, reviewAccessRequest } from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useAuthStore } from "@/shared/stores/auth"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { Label } from "@/shared/ui/label"
import { Spinner } from "@/shared/ui/spinner"

import type { AccessRequest } from "@/features/admin/api"

function EstadoBadge({ status }: { status: string }) {
  if (status === "aprobado") return <Badge tone="success">Aprobado</Badge>
  if (status === "rechazado") return <Badge tone="danger">Rechazado</Badge>
  return <Badge>Pendiente</Badge>
}

export function SolicitudesPage() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  const queryClient = useQueryClient()
  const [rechazando, setRechazando] = useState<AccessRequest | null>(null)
  const [motivo, setMotivo] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "access-requests"],
    queryFn: () => listAccessRequests(),
    enabled: esPlatformAdmin,
  })

  const revisar = useMutation({
    mutationFn: (v: { id: number; status: "aprobado" | "rechazado"; motivo?: string }) =>
      reviewAccessRequest(v.id, v.status, v.motivo),
    onSuccess: (_data, v) => {
      toast.success(v.status === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada")
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] })
      setRechazando(null)
      setMotivo("")
    },
    onError: (err) => toast.error(apiError(err, "No se pudo procesar la solicitud")),
  })

  async function aprobar(req: AccessRequest) {
    const ok = await confirmar({
      title: "¿Aprobar solicitud?",
      description: `Se creará la empresa "${req.empresa_nombre}" (RUC ${req.ruc}) y ${req.email} quedará como su Admin. Recibirá un email para establecer su contraseña.`,
      confirmLabel: "Aprobar",
    })
    if (ok) revisar.mutate({ id: req.id, status: "aprobado" })
  }

  if (!esPlatformAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Sección solo para administradores de plataforma.
      </p>
    )
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const solicitudes = [...(data ?? [])].sort((a, b) => b.id - a.id)
  const pendientes = solicitudes.filter((s) => s.status === "pendiente").length

  if (solicitudes.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay solicitudes de acceso.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {pendientes} pendiente(s) de {solicitudes.length} solicitud(es).
      </p>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3">Solicitante</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">RUC</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{s.nombre}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="p-3">{s.empresa_nombre}</td>
                  <td className="p-3 font-mono text-xs">{s.ruc}</td>
                  <td className="p-3">
                    <EstadoBadge status={s.status} />
                    {s.status === "rechazado" && s.rejection_reason && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.rejection_reason}</p>
                    )}
                  </td>
                  <td className="p-3">
                    {s.status === "pendiente" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => aprobar(s)}
                          disabled={revisar.isPending}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRechazando(s)
                            setMotivo("")
                          }}
                          disabled={revisar.isPending}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal de rechazo con motivo */}
      {rechazando && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setRechazando(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Rechazar solicitud</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rechazando la solicitud de <strong>{rechazando.nombre}</strong> (
              {rechazando.empresa_nombre}).
            </p>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Ej. RUC no válido, información incompleta…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRechazando(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={revisar.isPending}
                onClick={() =>
                  revisar.mutate({
                    id: rechazando.id,
                    status: "rechazado",
                    motivo: motivo.trim() || undefined,
                  })
                }
              >
                {revisar.isPending ? "Rechazando…" : "Rechazar solicitud"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
