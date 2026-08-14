import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  changeMemberRole,
  inviteMember,
  listMembers,
  listRoles,
  removeMember,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { Button } from "@/shared/ui/button"
import { confirmar } from "@/shared/ui/confirm"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { FormEvent } from "react"

export function MiembrosPage() {
  const companyId = useActiveCompany((s) => s.companyId)
  const queryClient = useQueryClient()

  const membersQuery = useQuery({
    queryKey: ["admin", "members", companyId],
    queryFn: listMembers,
    enabled: companyId != null,
  })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles })

  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [roleKey, setRoleKey] = useState("operador")

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "members"] })

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

  if (membersQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }
  if (membersQuery.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes permisos para gestionar los miembros de esta empresa.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={onInvitar} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rol">Rol</Label>
              <Select id="rol" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
                {(roles ?? []).map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.nombre}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={invitar.isPending}>
                Invitar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Email</th>
                <th className="p-3">Rol</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(membersQuery.data ?? []).map((m) => (
                <tr key={m.membership_id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{m.nombre}</td>
                  <td className="p-3">{m.email}</td>
                  <td className="p-3">
                    <Select
                      className="max-w-[12rem]"
                      value={m.role_key}
                      onChange={(e) =>
                        cambiarRol.mutate({ id: m.membership_id, role: e.target.value })
                      }
                    >
                      {(roles ?? []).map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.nombre}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const ok = await confirmar({
                          title: `¿Remover a ${m.nombre}?`,
                          description: "Perderá el acceso a esta empresa.",
                          confirmLabel: "Remover",
                          destructive: true,
                        })
                        if (ok) quitar.mutate(m.membership_id)
                      }}
                    >
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
