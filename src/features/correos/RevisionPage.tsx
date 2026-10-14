import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Download, FileText, Pencil, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  approveRecord,
  deleteRecord,
  exportRecords,
  getDocumentUrl,
  listRecords,
  rejectRecord,
  reviewQueue,
  type RecordSummary,
} from "@/features/correos/api"
import { RecordEditor } from "@/features/correos/RecordEditor"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { Input } from "@/shared/ui/input"
import { PageHeader } from "@/shared/ui/page-header"
import { Spinner } from "@/shared/ui/spinner"

import type { Tone } from "@/shared/ui/badge"

const REVISION: Record<string, { label: string; tone: Tone }> = {
  not_required: { label: "No requiere", tone: "neutral" },
  pending: { label: "Pendiente", tone: "info" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "danger" },
}

export function RevisionPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [ruc, setRuc] = useState("")
  const [periodo, setPeriodo] = useState("")
  const [editando, setEditando] = useState<RecordSummary | null>(null)

  const filtros = { ruc: ruc || undefined, periodo: periodo || undefined }
  const query = useQuery({
    queryKey: ["correos", "records", { soloPendientes, ...filtros }],
    queryFn: () => (soloPendientes ? reviewQueue() : listRecords(filtros)),
    enabled: companyId != null,
  })

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["correos", "records"] })

  const aprobar = useMutation({
    mutationFn: approveRecord,
    onSuccess: () => {
      toast.success("Registro aprobado")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err)),
  })
  const rechazar = useMutation({
    mutationFn: rejectRecord,
    onSuccess: () => {
      toast.success("Registro rechazado")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err)),
  })
  const borrar = useMutation({
    mutationFn: deleteRecord,
    onSuccess: () => {
      toast.success("Registro eliminado")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err)),
  })
  const exportar = useMutation({
    mutationFn: () => exportRecords(soloPendientes ? {} : filtros),
    onError: (err) => toast.error(apiError(err, "No se pudo exportar")),
  })

  const items = query.data?.items ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Revisión de registros"
        description="Corrige lo que el lector no pudo dar por bueno y exporta el reporte."
        actions={
          <Button
            variant="outline"
            disabled={exportar.isPending || items.length === 0}
            onClick={() => exportar.mutate()}
          >
            <Download className="size-4" />
            Exportar Excel
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
            />
            Solo pendientes de revisión
          </label>
          <div className="w-40">
            <Input
              placeholder="RUC arrendador"
              value={ruc}
              disabled={soloPendientes}
              onChange={(e) => setRuc(e.target.value)}
            />
          </div>
          <div className="w-32">
            <Input
              placeholder="Periodo (AAAAMM)"
              value={periodo}
              disabled={soloPendientes}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {query.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Check}
          title={soloPendientes ? "Nada por revisar" : "Sin registros"}
          description={
            soloPendientes
              ? "No hay registros pendientes de revisión."
              : "Lanza un escaneo para extraer registros de los adjuntos."
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <RecordRow
              key={r.id}
              r={r}
              onApprove={() => aprobar.mutate(r.id)}
              onReject={() => rechazar.mutate(r.id)}
              onEdit={() => setEditando(r)}
              onDelete={() => eliminar(r, borrar)}
            />
          ))}
        </div>
      )}

      {editando && (
        <RecordEditor
          record={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null)
            invalidar()
          }}
        />
      )}
    </div>
  )
}

async function eliminar(
  r: RecordSummary,
  borrar: ReturnType<typeof useMutation<void, Error, number>>,
) {
  const ok = await confirmar({
    title: "Eliminar registro",
    description: "Esta acción no se puede deshacer. El adjunto original se conserva.",
  })
  if (ok) borrar.mutate(r.id)
}

function RecordRow({
  r,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: {
  r: RecordSummary
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const revision = REVISION[r.estado_de_revision] ?? { label: r.estado_de_revision, tone: "neutral" as Tone }
  const dudoso = (campo: string) => r.campos_dudosos.includes(campo)

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{r.nombre_contribuyente || "(sin nombre)"}</span>
              <Badge tone={revision.tone}>{revision.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              RUC {r.ruc_contribuyente || "—"} · Periodo {r.periodo || "—"} · Pagado{" "}
              <span className={dudoso("importe_pagado") ? "text-destructive font-medium" : ""}>
                {r.moneda} {r.importe_pagado || "—"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {r.origen.nombre_adjunto}
              {r.origen.remitente ? ` · ${r.origen.remitente}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => verDocumento(r.id)} aria-label="Ver documento">
              <FileText className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Corregir">
              <Pencil className="size-4" />
            </Button>
            {r.estado_de_revision === "pending" && (
              <Button variant="ghost" size="icon" onClick={onApprove} aria-label="Aprobar">
                <Check className="size-4 text-primary" />
              </Button>
            )}
            {r.estado_de_revision !== "rejected" && (
              <Button variant="ghost" size="icon" onClick={onReject} aria-label="Rechazar">
                <X className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        {r.campos_dudosos.length > 0 && (
          <p className="text-xs text-destructive">
            Revisar: {r.campos_dudosos.join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

async function verDocumento(id: number) {
  try {
    const url = await getDocumentUrl(id)
    window.open(url, "_blank", "noopener")
  } catch (err) {
    toast.error(apiError(err, "No se pudo abrir el documento"))
  }
}
