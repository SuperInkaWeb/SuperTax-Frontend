import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Inbox, Unplug } from "lucide-react"
import { toast } from "sonner"

import {
  authorizeMailbox,
  deleteMailbox,
  listMailboxes,
  type MailboxProvider,
  type MailboxSummary,
} from "@/features/correos/api"
import { ESTADO_BUZON } from "@/features/correos/estados"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { Spinner } from "@/shared/ui/spinner"
import { StatusBadge } from "@/shared/ui/status-badge"

const PROVEEDORES: { valor: MailboxProvider; etiqueta: string }[] = [
  { valor: "gmail", etiqueta: "Gmail" },
  { valor: "outlook", etiqueta: "Outlook" },
]

export function BuzonesPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const buzones = useQuery({
    queryKey: ["correos", "mailboxes"],
    queryFn: listMailboxes,
    enabled: companyId != null,
  })

  const conectar = useMutation({
    mutationFn: authorizeMailbox,
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (err) => toast.error(apiError(err, "No se pudo iniciar la conexión")),
  })

  const desvincular = useMutation({
    mutationFn: deleteMailbox,
    onSuccess: () => {
      toast.success("Buzón desvinculado")
      queryClient.invalidateQueries({ queryKey: ["correos", "mailboxes"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo desvincular")),
  })

  const proveedorEnCurso = conectar.isPending ? conectar.variables : undefined

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Conectar un buzón</CardTitle>
          <p className="text-sm text-muted-foreground">
            Se solicita permiso de solo lectura. La aplicación nunca envía ni modifica correo.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PROVEEDORES.map(({ valor, etiqueta }) => (
            <Button
              key={valor}
              variant="outline"
              disabled={conectar.isPending || companyId == null}
              onClick={() => conectar.mutate(valor)}
            >
              {proveedorEnCurso === valor ? <Spinner className="size-4" /> : null}
              Conectar {etiqueta}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buzones conectados</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncBoundary
            query={buzones}
            isEmpty={(d) => d.length === 0}
            empty={
              <EmptyState
                icon={Inbox}
                title="Ningún buzón conectado"
                description="Conecta una cuenta para empezar a escanear correos."
              />
            }
          >
            {(conexiones) => (
              <ul className="flex flex-col divide-y">
                {conexiones.map((conexion) => (
                  <FilaDeBuzon
                    key={conexion.id}
                    conexion={conexion}
                    onDesvincular={() => desvincularBuzon(conexion, desvincular)}
                    ocupado={desvincular.isPending}
                  />
                ))}
              </ul>
            )}
          </AsyncBoundary>
        </CardContent>
      </Card>
    </div>
  )
}

async function desvincularBuzon(
  conexion: MailboxSummary,
  desvincular: ReturnType<typeof useMutation<void, Error, number>>,
) {
  const ok = await confirmar({
    title: "Desvincular buzón",
    description: `Se revocará el acceso a ${conexion.account_email || conexion.provider}. Los datos ya extraídos se conservan.`,
    destructive: true,
  })
  if (ok) desvincular.mutate(conexion.id)
}

function FilaDeBuzon({
  conexion,
  onDesvincular,
  ocupado,
}: {
  conexion: MailboxSummary
  onDesvincular: () => void
  ocupado: boolean
}) {
  const vence = conexion.expires_at ? new Date(conexion.expires_at).toLocaleString() : null
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{conexion.account_email || "Cuenta sin correo"}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {conexion.provider}
          {vence ? ` · vence el ${vence}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge value={conexion.status} map={ESTADO_BUZON} />
        <Button variant="destructive" size="sm" disabled={ocupado} onClick={onDesvincular}>
          <Unplug className="size-4" />
          Desvincular
        </Button>
      </div>
    </li>
  )
}
