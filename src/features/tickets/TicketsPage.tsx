import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  closeTicket,
  createTicket,
  getTicket,
  listTickets,
  replyTicket,
} from "@/features/tickets/api"
import { apiError } from "@/shared/lib/api/error"
import { cn } from "@/shared/lib/utils"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Spinner } from "@/shared/ui/spinner"

import type { TicketStatus } from "@/features/tickets/api"
import type { FormEvent } from "react"

const composeClass = cn(
  "min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)

function EstadoBadge({ status }: { status: TicketStatus }) {
  if (status === "respondido") return <Badge tone="success">Respondido</Badge>
  if (status === "cerrado") return <Badge tone="neutral">Cerrado</Badge>
  return <Badge tone="info">Abierto</Badge>
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
}

function NuevoTicketDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [asunto, setAsunto] = useState("")
  const [mensaje, setMensaje] = useState("")

  const crear = useMutation({
    mutationFn: () => createTicket({ asunto, mensaje }),
    onSuccess: () => {
      toast.success("Ticket creado")
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      onClose()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo crear el ticket")),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    crear.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardContent className="pt-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-base font-semibold">Nuevo ticket de soporte</p>
            <div className="space-y-1.5">
              <Label htmlFor="asunto">Asunto</Label>
              <Input
                id="asunto"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                maxLength={200}
                minLength={3}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mensaje">Mensaje</Label>
              <textarea
                id="mensaje"
                className={composeClass}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                minLength={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={crear.isPending}>
                Enviar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function TicketList({
  seleccionado,
  onSelect,
}: {
  seleccionado: number | null
  onSelect: (id: number) => void
}) {
  const { data, isLoading } = useQuery({ queryKey: ["tickets"], queryFn: listTickets })

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }
  if (!data?.length) {
    return <p className="px-1 py-8 text-center text-sm text-muted-foreground">No hay tickets.</p>
  }

  return (
    <ul className="space-y-1">
      {data.map((t) => (
        <li key={t.id}>
          <button
            onClick={() => onSelect(t.id)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-left transition-colors",
              seleccionado === t.id ? "bg-accent" : "hover:bg-muted",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{t.asunto}</span>
              <EstadoBadge status={t.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {t.company_nombre ?? "—"} · {fecha(t.updated_at)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}

function TicketThread({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [mensaje, setMensaje] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["tickets", ticketId],
    queryFn: () => getTicket(ticketId),
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["tickets"] })
    queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] })
  }

  const responder = useMutation({
    mutationFn: () => replyTicket(ticketId, mensaje),
    onSuccess: () => {
      setMensaje("")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo enviar la respuesta")),
  })

  const cerrar = useMutation({
    mutationFn: () => closeTicket(ticketId),
    onSuccess: () => {
      toast.success("Ticket cerrado")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo cerrar el ticket")),
  })

  async function onCerrar() {
    const ok = await confirmar({
      title: "Cerrar ticket",
      description: "No se podrán enviar más mensajes en este ticket.",
      confirmLabel: "Cerrar",
    })
    if (ok) cerrar.mutate()
  }

  function onEnviar(e: FormEvent) {
    e.preventDefault()
    responder.mutate()
  }

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const cerrado = data.status === "cerrado"

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              aria-label="Volver"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted md:hidden"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h2 className="truncate text-base font-semibold">{data.asunto}</h2>
            <EstadoBadge status={data.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.company_nombre ?? "—"} · {data.created_by_nombre}
          </p>
        </div>
        {!cerrado && (
          <Button size="sm" variant="outline" onClick={onCerrar} disabled={cerrar.isPending}>
            Cerrar
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {data.mensajes.map((m) => (
          <div
            key={m.id}
            className={cn("flex flex-col", m.es_soporte ? "items-start" : "items-end")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.es_soporte ? "bg-muted" : "bg-primary text-primary-foreground",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
            </div>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {m.es_soporte ? "Soporte" : m.author_nombre} · {fecha(m.created_at)}
            </span>
          </div>
        ))}
      </div>

      {cerrado ? (
        <p className="border-t p-4 text-center text-sm text-muted-foreground">
          Este ticket está cerrado.
        </p>
      ) : (
        <form onSubmit={onEnviar} className="space-y-2 border-t p-4">
          <textarea
            className={composeClass}
            placeholder="Escribe una respuesta…"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={responder.isPending || !mensaje.trim()}>
              Enviar respuesta
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export function TicketsPage() {
  const hayEmpresaActiva = useActiveCompany((s) => s.companyId != null)
  const esSoporte = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  const [seleccionado, setSeleccionado] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Soporte</h1>
          <p className="text-sm text-muted-foreground">
            {esSoporte
              ? "Tickets de todas las empresas."
              : "Consulta y responde tus tickets de soporte."}
          </p>
        </div>
        {hayEmpresaActiva && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="size-4" />
            Nuevo ticket
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className={cn(seleccionado != null && "hidden md:block")}>
          <CardContent className="p-2">
            <TicketList seleccionado={seleccionado} onSelect={setSeleccionado} />
          </CardContent>
        </Card>

        <Card
          className={cn("min-h-[24rem]", seleccionado == null && "hidden md:block")}
        >
          <CardContent className="h-full p-0">
            {seleccionado == null ? (
              <p className="grid h-full min-h-[24rem] place-items-center text-sm text-muted-foreground">
                Selecciona un ticket para ver la conversación.
              </p>
            ) : (
              <TicketThread ticketId={seleccionado} onBack={() => setSeleccionado(null)} />
            )}
          </CardContent>
        </Card>
      </div>

      {creando && <NuevoTicketDialog onClose={() => setCreando(false)} />}
    </div>
  )
}
