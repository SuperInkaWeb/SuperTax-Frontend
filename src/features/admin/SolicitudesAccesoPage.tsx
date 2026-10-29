import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Inbox, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  listCompanyAccessRequests,
  listRoles,
  reviewCompanyAccessRequest,
  ROLES_ASIGNABLES,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { Select } from "@/shared/ui/select"

import type { CompanyAccessRequest, Role } from "@/features/admin/api"

function SolicitudRow({
  solicitud,
  roles,
  onChange,
}: {
  solicitud: CompanyAccessRequest
  roles: Role[]
  onChange: () => void
}) {
  const [roleKey, setRoleKey] = useState("operador")

  const revisar = useMutation({
    mutationFn: (input: { status: "aprobado" | "rechazado"; role_key?: string }) =>
      reviewCompanyAccessRequest(solicitud.id, input),
    onSuccess: (_d, v) => {
      toast.success(v.status === "aprobado" ? "Acceso concedido" : "Solicitud rechazada")
      onChange()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo procesar la solicitud")),
  })

  const rechazar = async () => {
    const ok = await confirmar({
      title: "¿Rechazar solicitud?",
      description: `${solicitud.requester_nombre} no obtendrá acceso a ${solicitud.razon_social}.`,
      confirmLabel: "Rechazar",
      destructive: true,
    })
    if (ok) revisar.mutate({ status: "rechazado" })
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 pt-5">
        <div className="min-w-[14rem] flex-1">
          <div className="font-medium">{solicitud.razon_social}</div>
          <div className="text-sm text-muted-foreground">RUC {solicitud.ruc}</div>
          <div className="mt-1 text-sm">
            Solicita: <span className="font-medium">{solicitud.requester_nombre}</span>{" "}
            <span className="text-muted-foreground">{solicitud.requester_email}</span>
          </div>
          {solicitud.mensaje && (
            <p className="mt-1 text-sm text-muted-foreground">“{solicitud.mensaje}”</p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Select
            className="max-w-[10rem]"
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value)}
            aria-label="Rol a conceder"
          >
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.nombre}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            disabled={revisar.isPending}
            onClick={() => revisar.mutate({ status: "aprobado", role_key: roleKey })}
          >
            <Check className="size-4" />
            Aprobar
          </Button>
          <Button size="sm" variant="ghost" disabled={revisar.isPending} onClick={rechazar}>
            <X className="size-4" />
            Rechazar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SolicitudesAccesoPage() {
  const queryClient = useQueryClient()
  const solicitudes = useQuery({
    queryKey: ["company-access", "pendientes"],
    queryFn: listCompanyAccessRequests,
  })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles })
  const asignables = (roles ?? []).filter((r) => ROLES_ASIGNABLES.includes(r.key))
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["company-access"] })

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Personas que piden acceso a empresas de tus estudios (su RUC ya está registrado).
        Apruébalas eligiendo el rol con el que entrarán, o recházalas.
      </p>

      <AsyncBoundary
        query={solicitudes}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={Inbox}
            title="Sin solicitudes pendientes"
            description="Cuando alguien solicite acceso a una de tus empresas, aparecerá aquí."
          />
        }
      >
        {(lista) => (
          <div className="space-y-3">
            {lista.map((s) => (
              <SolicitudRow key={s.id} solicitud={s} roles={asignables} onChange={invalidar} />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  )
}
