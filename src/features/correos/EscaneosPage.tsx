import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

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
import { ESTADO_ESCANEO, FASE } from "@/features/correos/estados"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useZodForm } from "@/shared/lib/useZodForm"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"
import { StatusBadge } from "@/shared/ui/status-badge"

import type { ColumnDef } from "@tanstack/react-table"

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

  const columnas: ColumnDef<ScanSummary>[] = [
    { header: "Estado", cell: ({ row }) => <StatusBadge value={row.original.status} map={ESTADO_ESCANEO} /> },
    { header: "Fase", cell: ({ row }) => FASE[row.original.phase] ?? row.original.phase },
    { header: "Correos", cell: ({ row }) => <span className="tabular-nums">{row.original.counters?.mensajes_revisados ?? 0}</span> },
    { header: "Adjuntos", cell: ({ row }) => <span className="tabular-nums">{row.original.counters?.adjuntos_descargados ?? 0}</span> },
    { header: "Registros", cell: ({ row }) => <span className="tabular-nums">{row.original.counters?.registros_extraidos ?? 0}</span> },
    {
      header: "Errores",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {(row.original.counters?.errores ?? 0) + (row.original.counters?.errores_extraccion ?? 0)}
        </span>
      ),
    },
    { header: "Encolado", cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{new Date(row.original.queued_at).toLocaleString()}</span> },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) =>
        activo(row.original) ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEnCurso(row.original.id)}>
              Seguir
            </Button>
            <Button variant="destructive" size="sm" onClick={() => cancelar.mutate(row.original.id)}>
              Cancelar
            </Button>
          </div>
        ) : null,
    },
  ]

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
              {seguido.data ? <ProgresoEnVivo scan={seguido.data} /> : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncBoundary
            query={escaneos}
            isEmpty={(d) => d.length === 0}
            empty={
              <EmptyState
                icon={Mail}
                title="Todavía no se ha lanzado ningún escaneo"
                description="Al terminar el primero, aquí aparecerá su resultado."
              />
            }
          >
            {(data) => <DataTable columns={columnas} data={data} getRowId={(s) => String(s.id)} />}
          </AsyncBoundary>
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

const esquemaEscaneo = z.object({
  connection_id: z.coerce.number().int().positive(),
  carpeta: z.string().trim().min(1, "Requerido").max(120),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  limite_de_mensajes: z.coerce.number().int().min(1, "Mínimo 1").max(50000, "Máximo 50000"),
})
type FormularioEscaneo = z.infer<typeof esquemaEscaneo>

function FormularioDeEscaneo({
  conexiones,
  onLanzar,
  enviando,
}: {
  conexiones: { id: number; account_email: string; provider: string }[]
  onLanzar: (body: ScanRequest) => void
  enviando: boolean
}) {
  const { register, handleSubmit, formState } = useZodForm(esquemaEscaneo, {
    defaultValues: {
      connection_id: conexiones[0]?.id ?? 0,
      carpeta: "INBOX",
      desde: "",
      hasta: "",
      limite_de_mensajes: 100,
    },
  })
  const errors = formState.errors

  const enviar = (v: FormularioEscaneo) =>
    onLanzar({
      connection_id: v.connection_id,
      carpeta: v.carpeta || "INBOX",
      limite_de_mensajes: v.limite_de_mensajes,
      desde: v.desde || null,
      hasta: v.hasta || null,
    })

  return (
    <form onSubmit={handleSubmit(enviar)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Buzón" htmlFor="buzon" error={errors.connection_id?.message}>
          <Select id="buzon" {...register("connection_id")}>
            {conexiones.map((b) => (
              <option key={b.id} value={b.id}>
                {b.account_email || b.provider}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Carpeta" htmlFor="carpeta" error={errors.carpeta?.message}>
          <Input id="carpeta" maxLength={120} {...register("carpeta")} />
        </FormField>
        <FormField label="Desde (opcional)" htmlFor="desde" error={errors.desde?.message}>
          <Input id="desde" type="date" {...register("desde")} />
        </FormField>
        <FormField label="Hasta (opcional)" htmlFor="hasta" error={errors.hasta?.message}>
          <Input id="hasta" type="date" {...register("hasta")} />
        </FormField>
        <FormField label="Máx. de correos" htmlFor="limite" error={errors.limite_de_mensajes?.message}>
          <Input id="limite" type="number" min={1} max={50000} {...register("limite_de_mensajes")} />
        </FormField>
      </div>
      <Button type="submit" disabled={enviando}>
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
      {scan.status === "failed" && scan.error_message ? (
        <p className="text-sm text-destructive">{scan.error_message}</p>
      ) : null}
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
              <Button variant="destructive" disabled={texto !== PALABRA || reiniciar.isPending} onClick={() => reiniciar.mutate()}>
                Sí, borrar todo
              </Button>
              <Button variant="ghost" onClick={() => { setAbierto(false); setTexto("") }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
