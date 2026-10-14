import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  authorizeMailbox,
  deleteMailbox,
  listMailboxes,
  type MailboxProvider,
  type MailboxSummary,
} from "@/features/correos/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge, type Tone } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { Spinner } from "@/shared/ui/spinner"
import { Inbox } from "lucide-react"

const PROVEEDORES: { valor: MailboxProvider; etiqueta: string }[] = [
  { valor: "gmail", etiqueta: "Gmail" },
  { valor: "outlook", etiqueta: "Outlook" },
]

const TONO_POR_ESTADO: Record<string, Tone> = {
  active: "success",
  revoked: "danger",
  error: "danger",
}

const TEXTO_POR_ESTADO: Record<string, string> = {
  active: "Conectado",
  revoked: "Revocado",
  error: "Con error",
}

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
    // Navegación completa, no router: el destino es el proveedor de identidad,
    // fuera de esta aplicación. Vuelve a /correos/oauth/callback.
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
  const conexiones = buzones.data ?? []

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
          {buzones.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : conexiones.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Ningún buzón conectado"
              description="Conecta una cuenta para empezar a escanear correos."
            />
          ) : (
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
        <Badge tone={TONO_POR_ESTADO[conexion.status] ?? "neutral"}>
          {TEXTO_POR_ESTADO[conexion.status] ?? conexion.status}
        </Badge>
        <Button variant="destructive" size="sm" disabled={ocupado} onClick={onDesvincular}>
          Desvincular
        </Button>
      </div>
    </li>
  )
}
