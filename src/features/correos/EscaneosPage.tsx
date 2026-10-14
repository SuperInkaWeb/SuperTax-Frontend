import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail, Play, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  cancelScan,
  createScan,
  listMailboxes,
  listScans,
  scanErrors,
  type ScanRequest,
  type ScanSummary,
} from "@/features/correos/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { PageHeader } from "@/shared/ui/page-header"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { Tone } from "@/shared/ui/badge"

const ESTADO: Record<string, { label: string; tone: Tone }> = {
  queued: { label: "En cola", tone: "neutral" },
  running: { label: "Procesando", tone: "info" },
  completed: { label: "Completado", tone: "success" },
  failed: { label: "Error", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
}

const FASE: Record<string, string> = {
  waiting: "En espera",
  listing: "Listando correos",
  downloading: "Descargando adjuntos",
  extracting: "Extrayendo datos",
  done: "Terminado",
}

const activo = (s: ScanSummary) => s.status === "queued" || s.status === "running"

export function EscaneosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const buzones = useQuery({
    queryKey: ["correos", "mailboxes"],
    queryFn: listMailboxes,
    enabled: companyId != null,
  })
  const escaneos = useQuery({
    queryKey: ["correos", "scans"],
    queryFn: listScans,
    enabled: companyId != null,
    // Mientras haya escaneos en curso, se refresca para ver el progreso.
    refetchInterval: (q) => (q.state.data?.some(activo) ? 2000 : false),
  })

  const lanzar = useMutation({
    mutationFn: createScan,
    onSuccess: () => {
      toast.success("Escaneo iniciado")
      queryClient.invalidateQueries({ queryKey: ["correos", "scans"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo iniciar el escaneo")),
  })

  const cancelar = useMutation({
    mutationFn: cancelScan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["correos", "scans"] }),
    onError: (err) => toast.error(apiError(err, "No se pudo cancelar")),
  })

  const hayBuzones = (buzones.data?.length ?? 0) > 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Escaneos"
        description="Descarga los adjuntos del buzón en un rango de fechas y extrae sus datos."
      />

      {hayBuzones ? (
        <LanzarForm
          buzones={buzones.data ?? []}
          onSubmit={(body) => lanzar.mutate(body)}
          enviando={lanzar.isPending}
        />
      ) : (
        <EmptyState
          icon={Mail}
          title="Conecta un buzón primero"
          description="Ve a la pestaña Buzones y conecta Gmail u Outlook para poder escanear."
        />
      )}

      {escaneos.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (escaneos.data?.length ?? 0) > 0 ? (
        <div className="space-y-2">
          {escaneos.data!.map((scan) => (
            <ScanCard
              key={scan.id}
              scan={scan}
              onCancel={() => cancelar.mutate(scan.id)}
              cancelando={cancelar.isPending}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LanzarForm({
  buzones,
  onSubmit,
  enviando,
}: {
  buzones: { id: number; account_email: string; provider: string }[]
  onSubmit: (body: ScanRequest) => void
  enviando: boolean
}) {
  const [connectionId, setConnectionId] = useState<number>(buzones[0]?.id ?? 0)
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [limite, setLimite] = useState(100)

  return (
    <Card>
      <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="buzon">Buzón</Label>
          <Select
            id="buzon"
            value={connectionId}
            onChange={(e) => setConnectionId(Number(e.target.value))}
          >
            {buzones.map((b) => (
              <option key={b.id} value={b.id}>
                {b.account_email || b.provider}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="limite">Máx. correos</Label>
          <Input
            id="limite"
            type="number"
            min={1}
            max={50000}
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button
            disabled={enviando || !connectionId}
            onClick={() =>
              onSubmit({
                connection_id: connectionId,
                desde: desde || null,
                hasta: hasta || null,
                limite_de_mensajes: limite,
              })
            }
          >
            <Play className="size-4" />
            Iniciar escaneo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ScanCard({
  scan,
  onCancel,
  cancelando,
}: {
  scan: ScanSummary
  onCancel: () => void
  cancelando: boolean
}) {
  const estado = ESTADO[scan.status] ?? { label: scan.status, tone: "neutral" as Tone }
  const c = scan.counters ?? {}
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Escaneo #{scan.id}</span>
            <Badge tone={estado.tone}>{estado.label}</Badge>
            {activo(scan) && (
              <span className="text-xs text-muted-foreground">{FASE[scan.phase] ?? scan.phase}</span>
            )}
          </div>
          {activo(scan) && (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={cancelando}>
              <X className="size-4" />
              Cancelar
            </Button>
          )}
        </div>

        {activo(scan) && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${scan.progress_pct}%` }}
            />
          </div>
        )}

        {scan.status === "failed" && scan.error_message && (
          <p className="text-sm text-destructive">{scan.error_message}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Adjuntos: {c.adjuntos_descargados ?? 0}</span>
          <span>Registros: {c.registros_extraidos ?? 0}</span>
          <span>En revisión: {c.registros_en_revision ?? 0}</span>
          <span>Sin datos: {c.adjuntos_sin_datos ?? 0}</span>
        </div>

        {(c.errores ?? 0) + (c.errores_extraccion ?? 0) > 0 && <ScanErrores scanId={scan.id} />}
      </CardContent>
    </Card>
  )
}

function ScanErrores({ scanId }: { scanId: number }) {
  const [abierto, setAbierto] = useState(false)
  const { data } = useQuery({
    queryKey: ["correos", "scan-errors", scanId],
    queryFn: () => scanErrors(scanId),
    enabled: abierto,
  })
  return (
    <div className="text-xs">
      <button
        type="button"
        className="text-destructive underline"
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? "Ocultar errores" : "Ver errores"}
      </button>
      {abierto && data && (
        <ul className="mt-1 space-y-0.5 text-muted-foreground">
          {data.map((e, i) => (
            <li key={i}>
              <span className="font-medium">{e.stage}</span>: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
