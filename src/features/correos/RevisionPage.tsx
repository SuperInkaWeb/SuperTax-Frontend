import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ClipboardCheck } from "lucide-react"

import { reviewQueue, type RecordSummary } from "@/features/correos/api"
import { FormularioDeCorreccion } from "@/features/correos/FormularioDeCorreccion"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Badge } from "@/shared/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { PageHeader } from "@/shared/ui/page-header"

export function RevisionPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const cola = useQuery({
    queryKey: ["correos", "review"],
    queryFn: () => reviewQueue(25, 0),
    enabled: companyId != null,
  })

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["correos", "review"] })
    queryClient.invalidateQueries({ queryKey: ["correos", "review-count"] })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cola de revisión"
        description="Corrige lo que el lector no pudo dar por bueno. Los campos resaltados se leyeron con poca confianza."
      />

      <AsyncBoundary
        query={cola}
        isEmpty={(d) => d.items.length === 0}
        empty={
          <EmptyState
            icon={ClipboardCheck}
            title="No hay nada pendiente de revisar"
            description="Los registros que el pipeline no pueda dar por buenos aparecerán aquí."
          />
        }
      >
        {(data) => (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {data.items.length} registro{data.items.length === 1 ? "" : "s"} pendiente
              {data.items.length === 1 ? "" : "s"}.
            </p>
            {data.items.map((r) => (
              <FichaDeRevision key={r.id} registro={r} onResuelto={refrescar} />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  )
}

function FichaDeRevision({
  registro,
  onResuelto,
}: {
  registro: RecordSummary
  onResuelto: () => void
}) {
  const dudosos = registro.campos_dudosos.length
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>
            {registro.ruc_contribuyente || registro.origen.nombre_adjunto || "Documento sin identificar"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Leído por {registro.estrategia_usada ?? "—"} · {registro.completitud}
          </p>
        </div>
        <Badge tone="info">
          {dudosos > 0
            ? `${dudosos} campo${dudosos === 1 ? "" : "s"} dudoso${dudosos === 1 ? "" : "s"}`
            : "Revisión solicitada"}
        </Badge>
      </CardHeader>
      <CardContent>
        <FormularioDeCorreccion registro={registro} onResuelto={onResuelto} />
      </CardContent>
    </Card>
  )
}
