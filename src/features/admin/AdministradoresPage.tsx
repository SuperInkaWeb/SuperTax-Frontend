import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ShieldCheck, Trash2, UserPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  inviteEstudioAdmin,
  listMisEstudios,
  removeEstudioAdmin,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useAuthStore } from "@/shared/stores/auth"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { Input } from "@/shared/ui/input"
import { StatusBadge, type StatusMeta } from "@/shared/ui/status-badge"

import type { EstudioItem } from "@/features/admin/api"
import type { FormEvent } from "react"

const ACCESO: Record<string, StatusMeta> = {
  activo: { label: "Activo", tone: "success" },
  inactivo: { label: "Sin acceso", tone: "danger" },
}

function EstudioCard({ estudio, onChange }: { estudio: EstudioItem; onChange: () => void }) {
  const miId = useAuthStore((s) => s.user?.id)
  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")

  const invitar = useMutation({
    mutationFn: () => inviteEstudioAdmin({ email, nombre, estudio_id: estudio.id }),
    onSuccess: () => {
      toast.success("Co-administrador agregado")
      setEmail("")
      setNombre("")
      onChange()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo agregar")),
  })

  const quitar = useMutation({
    mutationFn: (userId: number) => removeEstudioAdmin(userId, estudio.id),
    onSuccess: () => {
      toast.success("Co-administrador removido")
      onChange()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo remover")),
  })

  const onInvitar = (e: FormEvent) => {
    e.preventDefault()
    invitar.mutate()
  }

  const remover = async (userId: number, quien: string) => {
    const ok = await confirmar({
      title: `¿Quitar a ${quien} como administrador?`,
      description: "Dejará de ver y operar las empresas del estudio.",
      confirmLabel: "Quitar",
      destructive: true,
    })
    if (ok) quitar.mutate(userId)
  }

  const activos = estudio.members.filter((m) => m.status === "activo")

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <h3 className="font-medium">{estudio.nombre}</h3>
          <span className="text-sm text-muted-foreground">
            · {activos.length} administrador(es)
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {estudio.members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2 text-sm">
              <span className="min-w-[14rem] truncate">
                <span className="font-medium">{m.nombre}</span>{" "}
                <span className="text-muted-foreground">{m.email}</span>
              </span>
              <StatusBadge value={m.status} map={ACCESO} />
              {m.user_id !== miId && m.status === "activo" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={quitar.isPending}
                  onClick={() => remover(m.user_id, m.nombre)}
                >
                  <Trash2 className="size-4" />
                  Quitar
                </Button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={onInvitar} className="grid gap-3 border-t pt-4 sm:grid-cols-3">
          <FormField label="Email" htmlFor={`adm-email-${estudio.id}`}>
            <Input
              id={`adm-email-${estudio.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Nombre" htmlFor={`adm-nombre-${estudio.id}`}>
            <Input
              id={`adm-nombre-${estudio.id}`}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </FormField>
          <div className="flex items-end">
            <Button type="submit" disabled={invitar.isPending}>
              <UserPlus className="size-4" />
              Agregar co-admin
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function AdministradoresPage() {
  const queryClient = useQueryClient()
  const estudios = useQuery({ queryKey: ["estudio", "mis"], queryFn: listMisEstudios })
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["estudio", "mis"] })

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Los <span className="font-medium text-foreground">administradores del estudio</span> ven y
        operan toda la cartera. Agrega co-administradores para que no dependa de una sola persona.
        Para dar acceso acotado a ciertos clientes, usa la pestaña <span className="font-medium">Equipo</span>.
      </p>

      <AsyncBoundary
        query={estudios}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="No administras ningún estudio"
            description="Esta sección es para los administradores de un estudio."
          />
        }
      >
        {(lista) =>
          lista.map((estudio) => (
            <EstudioCard key={estudio.id} estudio={estudio} onChange={invalidar} />
          ))
        }
      </AsyncBoundary>
    </div>
  )
}
