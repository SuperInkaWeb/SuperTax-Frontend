import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Inbox, ShieldAlert, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { listAccessRequests, reviewAccessRequest } from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useAuthStore } from "@/shared/stores/auth"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { DataTable } from "@/shared/ui/data-table"
import { Drawer } from "@/shared/ui/drawer"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { StatusBadge, type StatusMeta } from "@/shared/ui/status-badge"

import type { AccessRequest } from "@/features/admin/api"
import type { ColumnDef } from "@tanstack/react-table"

const ESTADO: Record<string, StatusMeta> = {
  pendiente: { label: "Pendiente", tone: "info" },
  aprobado: { label: "Aprobado", tone: "success" },
  rechazado: { label: "Rechazado", tone: "danger" },
}

export function SolicitudesPage() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  const queryClient = useQueryClient()
  const [rechazando, setRechazando] = useState<AccessRequest | null>(null)
  const [motivo, setMotivo] = useState("")

  const solicitudesQuery = useQuery({
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

  const aprobar = async (req: AccessRequest) => {
    const ok = await confirmar({
      title: "¿Aprobar solicitud?",
      description: `Se creará la empresa "${req.empresa_nombre}" (RUC ${req.ruc}) y ${req.email} quedará como su Admin. Recibirá un email para establecer su contraseña.`,
      confirmLabel: "Aprobar",
    })
    if (ok) revisar.mutate({ id: req.id, status: "aprobado" })
  }

  if (!esPlatformAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Sección restringida"
        description="Solo los administradores de plataforma pueden revisar solicitudes de acceso."
      />
    )
  }

  const columnas: ColumnDef<AccessRequest>[] = [
    {
      header: "Solicitante",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.nombre}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    { header: "Empresa", cell: ({ row }) => row.original.empresa_nombre },
    { header: "RUC", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ruc}</span> },
    {
      header: "Estado",
      cell: ({ row }) => (
        <div>
          <StatusBadge value={row.original.status} map={ESTADO} />
          {row.original.status === "rechazado" && row.original.rejection_reason ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{row.original.rejection_reason}</p>
          ) : null}
        </div>
      ),
    },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) =>
        row.original.status === "pendiente" ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => aprobar(row.original)} disabled={revisar.isPending}>
              <Check className="size-4" />
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRechazando(row.original)
                setMotivo("")
              }}
              disabled={revisar.isPending}
            >
              <X className="size-4" />
              Rechazar
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <AsyncBoundary
        query={solicitudesQuery}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={Inbox}
            title="Sin solicitudes de acceso"
            description="Cuando alguien solicite acceso a la plataforma, aparecerá aquí para revisarla."
          />
        }
      >
        {(data) => {
          const solicitudes = [...data].sort((a, b) => b.id - a.id)
          const pendientes = solicitudes.filter((s) => s.status === "pendiente").length
          return (
            <>
              <p className="text-sm text-muted-foreground">
                {pendientes} pendiente(s) de {solicitudes.length} solicitud(es).
              </p>
              <Card>
                <CardContent className="p-0">
                  <DataTable columns={columnas} data={solicitudes} getRowId={(s) => String(s.id)} />
                </CardContent>
              </Card>
            </>
          )
        }}
      </AsyncBoundary>

      <Drawer
        open={rechazando != null}
        onClose={() => setRechazando(null)}
        title="Rechazar solicitud"
        footer={
          rechazando ? (
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
              <X className="size-4" />
              {revisar.isPending ? "Rechazando…" : "Rechazar solicitud"}
            </Button>
          ) : null
        }
      >
        {rechazando ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rechazando la solicitud de <strong>{rechazando.nombre}</strong> ({rechazando.empresa_nombre}).
            </p>
            <FormField label="Motivo (opcional)" htmlFor="motivo">
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Ej. RUC no válido, información incompleta…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormField>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
