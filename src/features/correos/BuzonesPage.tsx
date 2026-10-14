import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Inbox, Mail, Trash2 } from "lucide-react"
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
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { PageHeader } from "@/shared/ui/page-header"
import { Spinner } from "@/shared/ui/spinner"

const PROVIDERS: { key: MailboxProvider; label: string }[] = [
  { key: "gmail", label: "Gmail" },
  { key: "outlook", label: "Outlook" },
]

export function BuzonesPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["correos", "mailboxes"],
    queryFn: listMailboxes,
    enabled: companyId != null,
  })

  const conectar = useMutation({
    mutationFn: authorizeMailbox,
    // Redirección de página completa al consentimiento del proveedor; vuelve a
    // /correos/oauth/callback, que completa la vinculación.
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (err) => toast.error(apiError(err, "No se pudo iniciar la conexión")),
  })

  const desconectar = useMutation({
    mutationFn: deleteMailbox,
    onSuccess: () => {
      toast.success("Buzón desconectado")
      queryClient.invalidateQueries({ queryKey: ["correos", "mailboxes"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo desconectar")),
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buzones conectados"
        description="Conecta un buzón para escanear sus adjuntos. Solo se solicita permiso de lectura."
        actions={
          <div className="flex gap-2">
            {PROVIDERS.map((p) => (
              <Button
                key={p.key}
                variant="outline"
                disabled={conectar.isPending || companyId == null}
                onClick={() => conectar.mutate(p.key)}
              >
                <Mail className="size-4" />
                Conectar {p.label}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No hay buzones conectados"
          description="Conecta Gmail u Outlook para empezar a escanear adjuntos."
        />
      ) : (
        <div className="space-y-2">
          {data.map((buzon) => (
            <BuzonCard key={buzon.id} buzon={buzon} onDelete={() => eliminar(buzon, desconectar)} />
          ))}
        </div>
      )}
    </div>
  )
}

async function eliminar(
  buzon: MailboxSummary,
  desconectar: ReturnType<typeof useMutation<void, Error, number>>,
) {
  const ok = await confirmar({
    title: "Desconectar buzón",
    description: `Se revocará el acceso a ${buzon.account_email || buzon.provider}. Los datos ya extraídos se conservan.`,
  })
  if (ok) desconectar.mutate(buzon.id)
}

function BuzonCard({ buzon, onDelete }: { buzon: MailboxSummary; onDelete: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{buzon.account_email || "(sin correo)"}</p>
            <p className="text-xs text-muted-foreground capitalize">{buzon.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={buzon.status === "active" ? "success" : "danger"}>
            {buzon.status === "active" ? "Activo" : buzon.status}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Desconectar">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
