import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ShieldAlert, Trash2, UserPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  changeMemberRole,
  inviteMember,
  listMembers,
  listRoles,
  removeMember,
  ROLES_ASIGNABLES,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { confirmar } from "@/shared/ui/confirm"
import { DataTable } from "@/shared/ui/data-table"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"

import type { Member } from "@/features/admin/api"
import type { ColumnDef } from "@tanstack/react-table"
import type { FormEvent } from "react"

export function MiembrosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const members = useQuery({
    queryKey: ["admin", "members", companyId],
    queryFn: listMembers,
    enabled: companyId != null,
  })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles })
  const asignables = (roles ?? []).filter((r) => ROLES_ASIGNABLES.includes(r.key))

  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [roleKey, setRoleKey] = useState("operador")

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin", "members"] })

  const invitar = useMutation({
    mutationFn: () => inviteMember({ email, nombre, role_key: roleKey }),
    onSuccess: () => {
      toast.success("Invitación enviada")
      setEmail("")
      setNombre("")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo invitar")),
  })
  const cambiarRol = useMutation({
    mutationFn: (v: { id: number; role: string }) => changeMemberRole(v.id, v.role),
    onSuccess: () => {
      toast.success("Rol actualizado")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo cambiar el rol")),
  })
  const quitar = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      toast.success("Miembro removido")
      invalidar()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo remover")),
  })

  function onInvitar(e: FormEvent) {
    e.preventDefault()
    invitar.mutate()
  }

  const remover = async (m: Member) => {
    const ok = await confirmar({
      title: `¿Remover a ${m.nombre}?`,
      description: "Perderá el acceso a esta empresa.",
      confirmLabel: "Remover",
      destructive: true,
    })
    if (ok) quitar.mutate(m.membership_id)
  }

  const columnas: ColumnDef<Member>[] = [
    { header: "Nombre", cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span> },
    { header: "Email", cell: ({ row }) => row.original.email },
    {
      header: "Rol",
      cell: ({ row }) => (
        <Select
          className="max-w-[12rem]"
          value={row.original.role_key}
          onChange={(e) => cambiarRol.mutate({ id: row.original.membership_id, role: e.target.value })}
        >
          {/* Todos los roles: así el rol REAL del miembro (p. ej. Admin) se ve bien. */}
          {(roles ?? []).map((r) => (
            <option key={r.key} value={r.key}>
              {r.nombre}
            </option>
          ))}
        </Select>
      ),
    },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => remover(row.original)}>
            <Trash2 className="size-4" />
            Remover
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Gestiona quién tiene acceso a la <span className="font-medium text-foreground">empresa activa</span>:
        invita personas, cambia su rol o remuévelas. Para asignar acceso a varias empresas cliente a la
        vez, usa la pestaña <span className="font-medium">Equipo</span>.
      </p>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={onInvitar} className="grid gap-3 sm:grid-cols-4">
            <FormField label="Email" htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormField>
            <FormField label="Nombre" htmlFor="nombre">
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </FormField>
            <FormField label="Rol" htmlFor="rol">
              <Select id="rol" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
                {asignables.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.nombre}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="flex items-end">
              <Button type="submit" disabled={invitar.isPending}>
                <UserPlus className="size-4" />
                Invitar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AsyncBoundary
        query={members}
        isEmpty={(d) => d.length === 0}
        error={
          <EmptyState
            icon={ShieldAlert}
            title="Sin permisos para gestionar miembros"
            description="No tienes permisos para gestionar los miembros de esta empresa."
          />
        }
        empty={
          <EmptyState
            icon={UserPlus}
            title="Sin miembros todavía"
            description="Invita a la primera persona con el formulario de arriba."
          />
        }
      >
        {(data) => (
          <Card>
            <CardContent className="p-0">
              <DataTable columns={columnas} data={data} getRowId={(m) => String(m.membership_id)} />
            </CardContent>
          </Card>
        )}
      </AsyncBoundary>
    </div>
  )
}
