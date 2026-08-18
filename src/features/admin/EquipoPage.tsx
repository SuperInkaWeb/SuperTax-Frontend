import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  assignToCompanies,
  listAdminCompanies,
  listRoles,
  listTeamMembers,
  setMembershipStatus,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Select } from "@/shared/ui/select"
import { Spinner } from "@/shared/ui/spinner"

import type { FormEvent } from "react"

export function EquipoPage() {
  const queryClient = useQueryClient()

  const companiesQuery = useQuery({ queryKey: ["team", "companies"], queryFn: listAdminCompanies })
  const membersQuery = useQuery({ queryKey: ["team", "members"], queryFn: listTeamMembers })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles })

  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [roleKey, setRoleKey] = useState("operador")
  const [seleccion, setSeleccion] = useState<number[]>([])

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["team", "members"] })

  const asignar = useMutation({
    mutationFn: () =>
      assignToCompanies({ email, nombre, role_key: roleKey, company_ids: seleccion }),
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
    mutationFn: (v: { id: number; status: "activo" | "inactivo" }) =>
      setMembershipStatus(v.id, v.status),
    onSuccess: () => invalidar(),
    onError: (e) => toast.error(apiError(e, "No se pudo cambiar el acceso")),
  })

  function toggleEmpresa(id: number) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function onAsignar(e: FormEvent) {
    e.preventDefault()
    if (seleccion.length === 0) {
      toast.error("Selecciona al menos una empresa")
      return
    }
    asignar.mutate()
  }

  if (companiesQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const empresas = companiesQuery.data ?? []
  if (empresas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No administras ninguna empresa. Esta sección es para quienes gestionan el acceso de uno o
        más clientes.
      </p>
    )
  }

  const todasSeleccionadas = seleccion.length === empresas.length
  const miembros = membersQuery.data ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={onAsignar} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="team-email">Email</Label>
                <Input
                  id="team-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-nombre">Nombre</Label>
                <Input
                  id="team-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="team-rol">Rol</Label>
                <Select id="team-rol" value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
                  {(roles ?? []).map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Clientes ({seleccion.length} seleccionados)
                </span>
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
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                  >
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
              Asignar acceso
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3">Persona</th>
                <th className="p-3">Accesos por cliente</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.user_id} className="border-b align-top last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{m.nombre}</div>
                    <div className="text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1.5">
                      {m.memberships.map((ms) => (
                        <div key={ms.membership_id} className="flex items-center gap-2">
                          <span className="min-w-[10rem] truncate">{ms.razon_social}</span>
                          <Badge tone={ms.status === "activo" ? "success" : "danger"}>
                            {ms.status === "activo" ? "Activo" : "Sin acceso"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={cambiarEstado.isPending}
                            onClick={() =>
                              cambiarEstado.mutate({
                                id: ms.membership_id,
                                status: ms.status === "activo" ? "inactivo" : "activo",
                              })
                            }
                          >
                            {ms.status === "activo" ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {miembros.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-3 text-muted-foreground">
                    Aún no hay personas asignadas a tus clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
