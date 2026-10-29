import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Power, PowerOff, UserPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  assignToCompanies,
  listAdminCompanies,
  listRoles,
  listTeamMembers,
  ROLES_ASIGNABLES,
  setMembershipStatus,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { StatusBadge, type StatusMeta } from "@/shared/ui/status-badge"

import type { TeamMember } from "@/features/admin/api"
import type { ColumnDef } from "@tanstack/react-table"
import type { FormEvent } from "react"

const ACCESO: Record<string, StatusMeta> = {
  activo: { label: "Activo", tone: "success" },
  inactivo: { label: "Sin acceso", tone: "danger" },
}

export function EquipoPage() {
  const queryClient = useQueryClient()

  const companies = useQuery({ queryKey: ["team", "companies"], queryFn: listAdminCompanies })
  const members = useQuery({ queryKey: ["team", "members"], queryFn: listTeamMembers })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles })

  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [roleKey, setRoleKey] = useState("operador")
  const [seleccion, setSeleccion] = useState<number[]>([])

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["team", "members"] })

  const asignar = useMutation({
    mutationFn: () => assignToCompanies({ email, nombre, role_key: roleKey, company_ids: seleccion }),
    onSuccess: (r) => {
      const extra = r.ya_existentes.length ? ` — ${r.ya_existentes.length} ya la(s) tenía` : ""
      toast.success(`Acceso asignado a ${r.asignadas.length} empresa(s)${extra}`)
      setEmail("")
      setNombre("")
      setSeleccion([])
      invalidar()
    },
    onError: (e) => toast.error(apiError(e, "No se pudo asignar el acceso")),
  })

  const cambiarEstado = useMutation({
    mutationFn: (v: { id: number; status: "activo" | "inactivo" }) => setMembershipStatus(v.id, v.status),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(apiError(e, "No se pudo cambiar el acceso")),
  })

  const toggleEmpresa = (id: number) =>
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const columnas: ColumnDef<TeamMember>[] = [
    {
      header: "Persona",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.nombre}</div>
          <div className="text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      header: "Accesos por cliente",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1.5">
          {row.original.memberships.map((ms) => {
            const activo = ms.status === "activo"
            return (
              <div key={ms.membership_id} className="flex items-center gap-2">
                <span className="min-w-[10rem] truncate">{ms.razon_social}</span>
                <StatusBadge value={ms.status} map={ACCESO} />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={cambiarEstado.isPending}
                  onClick={() =>
                    cambiarEstado.mutate({ id: ms.membership_id, status: activo ? "inactivo" : "activo" })
                  }
                >
                  {activo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                  {activo ? "Desactivar" : "Activar"}
                </Button>
              </div>
            )
          })}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Asigna a una persona el acceso a <span className="font-medium text-foreground">varias empresas
        cliente</span> a la vez y actívalo o desactívalo por cliente. Para gestionar solo la empresa
        activa, usa la pestaña <span className="font-medium">Miembros</span>.
      </p>

      <AsyncBoundary
        query={companies}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={Building2}
            title="No administras ninguna empresa"
            description="Esta sección es para quienes gestionan el acceso de uno o más clientes."
          />
        }
      >
        {(empresas) => {
          const todasSeleccionadas = seleccion.length === empresas.length
          const onAsignar = (e: FormEvent) => {
            e.preventDefault()
            if (seleccion.length === 0) {
              toast.error("Selecciona al menos una empresa")
              return
            }
            asignar.mutate()
          }
          return (
            <>
              <Card>
                <CardContent className="pt-5">
                  <form onSubmit={onAsignar} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FormField label="Email" htmlFor="team-email">
                        <Input id="team-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </FormField>
                      <FormField label="Nombre" htmlFor="team-nombre">
                        <Input id="team-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                      </FormField>
                      <FormField label="Rol" htmlFor="team-rol">
                        <Select id="team-rol" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
                          {(roles ?? [])
                            .filter((r) => ROLES_ASIGNABLES.includes(r.key))
                            .map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.nombre}
                              </option>
                            ))}
                        </Select>
                      </FormField>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Clientes ({seleccion.length} seleccionados)</span>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setSeleccion(todasSeleccionadas ? [] : empresas.map((c) => c.id))}
                        >
                          {todasSeleccionadas ? "Quitar todos" : "Seleccionar todos"}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {empresas.map((c) => (
                          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={seleccion.includes(c.id)}
                              onChange={() => toggleEmpresa(c.id)}
                            />
                            <span className="truncate">{c.razon_social}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" disabled={asignar.isPending}>
                      <UserPlus className="size-4" />
                      Asignar acceso
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <AsyncBoundary
                query={members}
                isEmpty={(d) => d.length === 0}
                empty={
                  <EmptyState
                    icon={UserPlus}
                    title="Sin personas asignadas"
                    description="Aún no hay personas asignadas a tus clientes. Usa el formulario de arriba."
                  />
                }
              >
                {(miembros) => (
                  <Card>
                    <CardContent className="p-0">
                      <DataTable columns={columnas} data={miembros} getRowId={(m) => String(m.user_id)} />
                    </CardContent>
                  </Card>
                )}
              </AsyncBoundary>
            </>
          )
        }}
      </AsyncBoundary>
    </div>
  )
}
