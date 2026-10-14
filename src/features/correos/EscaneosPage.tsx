import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  cancelScan,
  createScan,
  getScan,
  listMailboxes,
  listScans,
  resetData,
  type ScanRequest,
  type ScanSummary,
} from "@/features/correos/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Badge, type Tone } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { EmptyState } from "@/shared/ui/empty-state"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"
import { Mail } from "lucide-react"

const ESTADO: Record<string, { label: string; tone: Tone }> = {
  queued: { label: "En cola", tone: "neutral" },
  running: { label: "En curso", tone: "info" },
  completed: { label: "Completado", tone: "success" },
  failed: { label: "Fallido", tone: "danger" },
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
  const [enCurso, setEnCurso] = useState<number | null>(null)

  const buzones = useQuery({
    queryKey: ["correos", "mailboxes"],
    queryFn: listMailboxes,
    enabled: companyId != null,
  })
  const escaneos = useQuery({
    queryKey: ["correos", "scans"],
    queryFn: listScans,
    enabled: companyId != null,
    refetchInterval: (q) => (q.state.data?.some(activo) ? 2000 : false),
  })
  const seguido = useQuery({
    queryKey: ["correos", "scan", enCurso],
    queryFn: () => getScan(enCurso as number),
    enabled: enCurso != null,
    refetchInterval: (q) => (q.state.data && activo(q.state.data) ? 2000 : false),
  })

  const lanzar = useMutation({
    mutationFn: createScan,
    onSuccess: (job) => {
      setEnCurso(job.id)
      queryClient.invalidateQueries({ queryKey: ["correos", "scans"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo iniciar el escaneo")),
  })

  const cancelar = useMutation({
    mutationFn: cancelScan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["correos", "scans"] }),
    onError: (err) => toast.error(apiError(err, "No se pudo cancelar")),
  })

  const conexionesActivas = buzones.data?.filter((b) => b.status === "active") ?? []

  if (buzones.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo escaneo</CardTitle>
        </CardHeader>
        <CardContent>
          {conexionesActivas.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No hay ningún buzón conectado"
              description="Vincula una cuenta de Gmail o de Outlook para poder escanear."
            />
          ) : (
            <div className="flex flex-col gap-6">
              <FormularioDeEscaneo
                conexiones={conexionesActivas}
                enviando={lanzar.isPending}
                onLanzar={(body) => lanzar.mutate(body)}
              />
              {seguido.data && <ProgresoEnVivo scan={seguido.data} />}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {escaneos.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (escaneos.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Mail}
              title="Todavía no se ha lanzado ningún escaneo"
              description="Al terminar el primero, aquí aparecerá su resultado."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2">Fase</th>
                    <th className="px-2 py-2">Correos</th>
                    <th className="px-2 py-2">Adjuntos</th>
                    <th className="px-2 py-2">Registros</th>
                    <th className="px-2 py-2">Errores</th>
                    <th className="px-2 py-2">Encolado</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {escaneos.data!.map((scan) => (
                    <FilaDeEscaneo
                      key={scan.id}
                      scan={scan}
                      onSeguir={() => setEnCurso(scan.id)}
                      onCancelar={() => cancelar.mutate(scan.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ZonaDePeligro
        onReiniciado={() => {
          queryClient.invalidateQueries({ queryKey: ["correos", "scans"] })
          queryClient.invalidateQueries({ queryKey: ["correos", "records"] })
          queryClient.invalidateQueries({ queryKey: ["correos", "review-count"] })
          setEnCurso(null)
        }}
      />
    </div>
  )
}

function FormularioDeEscaneo({
  conexiones,
  onLanzar,
  enviando,
}: {
  conexiones: { id: number; account_email: string; provider: string }[]
  onLanzar: (body: ScanRequest) => void
  enviando: boolean
}) {
  const [buzonId, setBuzonId] = useState(conexiones[0]?.id ?? 0)
  const [carpeta, setCarpeta] = useState("INBOX")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [limite, setLimite] = useState(100)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onLanzar({
          connection_id: buzonId,
          carpeta: carpeta.trim() || "INBOX",
          limite_de_mensajes: limite,
          desde: desde || null,
          hasta: hasta || null,
        })
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Buzón">
          {conexiones.length > 1 ? (
            <Select value={buzonId} onChange={(e) => setBuzonId(Number(e.target.value))}>
              {conexiones.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.account_email || b.provider}
                </option>
              ))}
            </Select>
          ) : (
            <p className="py-2 text-muted-foreground">
              {conexiones[0]?.account_email || conexiones[0]?.provider || "—"}
            </p>
          )}
        </Campo>
        <Campo label="Carpeta">
          <Input value={carpeta} onChange={(e) => setCarpeta(e.target.value)} maxLength={120} />
        </Campo>
        <Campo label="Desde (opcional)">
          <Input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        </Campo>
        <Campo label="Hasta (opcional)">
          <Input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        </Campo>
        <Campo label="Máx. de correos">
          <Input type="number" min={1} max={50000} value={limite} onChange={(e) => setLimite(Number(e.target.value))} />
        </Campo>
      </div>
      <Button type="submit" disabled={enviando || !buzonId}>
        Iniciar escaneo
      </Button>
    </form>
  )
}

function ProgresoEnVivo({ scan }: { scan: ScanSummary }) {
  const c = scan.counters ?? {}
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{FASE[scan.phase] ?? scan.phase}</span>
        <span className="text-muted-foreground">{scan.progress_pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${scan.progress_pct}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-5">
        <Contador label="Correos" valor={c.mensajes_revisados} />
        <Contador label="Adjuntos" valor={c.adjuntos_descargados} />
        <Contador label="Duplicados" valor={c.adjuntos_duplicados} />
        <Contador label="Descartados" valor={c.adjuntos_rechazados} />
        <Contador label="Registros" valor={c.registros_extraidos} />
      </dl>
      {scan.status === "failed" && scan.error_message && (
        <p className="text-sm text-destructive">{scan.error_message}</p>
      )}
    </div>
  )
}

function Contador({ label, valor }: { label: string; valor?: number }) {
  return (
    <div className="flex justify-between gap-2 sm:flex-col sm:gap-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{valor ?? 0}</dd>
    </div>
  )
}

function FilaDeEscaneo({
  scan,
  onSeguir,
  onCancelar,
}: {
  scan: ScanSummary
  onSeguir: () => void
  onCancelar: () => void
}) {
  const estado = ESTADO[scan.status] ?? { label: scan.status, tone: "neutral" as Tone }
  const c = scan.counters ?? {}
  return (
    <tr className="border-b last:border-0">
      <td className="px-2 py-2">
        <Badge tone={estado.tone}>{estado.label}</Badge>
      </td>
      <td className="px-2 py-2">{FASE[scan.phase] ?? scan.phase}</td>
      <td className="px-2 py-2 tabular-nums">{c.mensajes_revisados ?? 0}</td>
      <td className="px-2 py-2 tabular-nums">{c.adjuntos_descargados ?? 0}</td>
      <td className="px-2 py-2 tabular-nums">{c.registros_extraidos ?? 0}</td>
      <td className="px-2 py-2 tabular-nums">{(c.errores ?? 0) + (c.errores_extraccion ?? 0)}</td>
      <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
        {new Date(scan.queued_at).toLocaleString()}
      </td>
      <td className="px-2 py-2">
        {activo(scan) ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSeguir}>
              Seguir
            </Button>
            <Button variant="destructive" size="sm" onClick={onCancelar}>
              Cancelar
            </Button>
          </div>
        ) : null}
      </td>
    </tr>
  )
}

const PALABRA = "REINICIAR"

function ZonaDePeligro({ onReiniciado }: { onReiniciado: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState("")

  const reiniciar = useMutation({
    mutationFn: resetData,
    onSuccess: (r) => {
      toast.success(`Listo. Se borraron ${r.registros} registros, ${r.adjuntos} adjuntos y ${r.mensajes} correos.`)
      setAbierto(false)
      setTexto("")
      onReiniciado()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo reiniciar")),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reiniciar datos de escaneo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Borra todos los registros, adjuntos y correos para escanear desde cero. Tus buzones
          conectados se conservan. Esta acción no se puede deshacer.
        </p>
      </CardHeader>
      <CardContent>
        {!abierto ? (
          <Button variant="destructive" onClick={() => setAbierto(true)}>
            Reiniciar datos de escaneo
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <Label>
              Para confirmar, escribe <strong>{PALABRA}</strong>
            </Label>
            <Input value={texto} onChange={(e) => setTexto(e.target.value)} className="w-48" autoComplete="off" />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={texto !== PALABRA || reiniciar.isPending}
                onClick={() => reiniciar.mutate()}
              >
                Sí, borrar todo
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAbierto(false)
                  setTexto("")
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
