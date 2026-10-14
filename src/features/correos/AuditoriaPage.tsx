import { useQuery } from "@tanstack/react-query"
import { isAxiosError } from "axios"
import { ScrollText } from "lucide-react"

import { listAudit } from "@/features/correos/api"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Card, CardContent } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { PageHeader } from "@/shared/ui/page-header"
import { Spinner } from "@/shared/ui/spinner"

const ACCION: Record<string, string> = {
  "mailbox.linked": "Buzón vinculado",
  "mailbox.unlinked": "Buzón desvinculado",
  "scan.started": "Escaneo iniciado",
  "scan.cancelled": "Escaneo cancelado",
  "report.exported": "Reporte exportado",
  "record.corrected": "Registro corregido",
  "record.approved": "Registro aprobado",
  "record.rejected": "Registro rechazado",
  "record.deleted": "Registro eliminado",
  "attachment.downloaded": "Documento descargado",
}

export function AuditoriaPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const { data, isLoading, error } = useQuery({
    queryKey: ["correos", "audit"],
    queryFn: () => listAudit(100, 0),
    enabled: companyId != null,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (error) {
    const prohibido = isAxiosError(error) && error.response?.status === 403
    return (
      <EmptyState
        icon={ScrollText}
        title={prohibido ? "Sin acceso a la auditoría" : "No se pudo cargar"}
        description={
          prohibido
            ? "La bitácora solo está disponible para administradores y supervisores."
            : "Intenta de nuevo más tarde."
        }
      />
    )
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Auditoría"
        description="Registro de acciones sensibles: quién hizo qué y cuándo."
      />
      {items.length === 0 ? (
        <EmptyState icon={ScrollText} title="Sin actividad registrada" />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{ACCION[e.action] ?? e.action}</span>
                  {e.resource_id && (
                    <span className="text-muted-foreground"> · {e.resource_type} #{e.resource_id}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.occurred_at).toLocaleString()}
                  {e.actor_ip ? ` · ${e.actor_ip}` : ""}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
