import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { listAccessRequests, reviewAccessRequest } from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"

export function SolicitudesPage() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "access-requests"],
    queryFn: () => listAccessRequests("pendiente"),
    enabled: esPlatformAdmin,
  })

  const revisar = useMutation({
    mutationFn: (v: { id: number; status: "aprobado" | "rechazado" }) =>
      reviewAccessRequest(v.id, v.status),
    onSuccess: (_data, v) => {
      toast.success(v.status === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada")
      queryClient.invalidateQueries({ queryKey: ["admin", "access-requests"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo procesar la solicitud")),
  })

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
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="p-3">Solicitante</th>
              <th className="p-3">Empresa</th>
              <th className="p-3">RUC</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-medium">{s.nombre}</div>
                  <div className="text-xs text-muted-foreground">{s.email}</div>
                </td>
                <td className="p-3">{s.empresa_nombre}</td>
                <td className="p-3 font-mono text-xs">{s.ruc}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => revisar.mutate({ id: s.id, status: "aprobado" })}
                      disabled={revisar.isPending}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revisar.mutate({ id: s.id, status: "rechazado" })}
                      disabled={revisar.isPending}
                    >
                      Rechazar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
