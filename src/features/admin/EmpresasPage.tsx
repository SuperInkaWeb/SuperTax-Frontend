import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import {
  createCompany,
  disableModule,
  enableModule,
  listCompanies,
  listCompanyModules,
  updateCompany,
} from "@/features/admin/api"
import { apiError } from "@/shared/lib/api/error"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Spinner } from "@/shared/ui/spinner"

import type { Company } from "@/features/admin/api"
import type { FormEvent } from "react"

const MODULOS = [
  { key: "sire", label: "SIRE" },
  { key: "sunat", label: "Descarga SUNAT" },
]

function ModulosEmpresa({ company }: { company: Company }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ["admin", "company-modules", company.id],
    queryFn: () => listCompanyModules(company.id),
  })
  const activos = new Set(
    (data ?? []).filter((m) => m.status === "activo").map((m) => m.module_key),
  )
  const toggle = useMutation({
    mutationFn: (v: { key: string; activar: boolean }) =>
      v.activar ? enableModule(company.id, v.key) : disableModule(company.id, v.key),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "company-modules", company.id] }),
    onError: (err) => toast.error(apiError(err, "No se pudo cambiar el módulo")),
  })

  return (
    <Card>
      <CardContent className="space-y-2 pt-5">
        <p className="text-sm font-medium">Módulos de {company.razon_social}</p>
        {MODULOS.map((m) => (
          <label key={m.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activos.has(m.key)}
              onChange={(e) => toggle.mutate({ key: m.key, activar: e.target.checked })}
            />
            {m.label}
          </label>
        ))}
      </CardContent>
    </Card>
  )
}

export function EmpresasPage() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  const queryClient = useQueryClient()
  const [ruc, setRuc] = useState("")
  const [razonSocial, setRazonSocial] = useState("")
  const [editando, setEditando] = useState<Company | null>(null)
  const [seleccionada, setSeleccionada] = useState<Company | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: listCompanies,
    enabled: esPlatformAdmin,
  })

  function limpiar() {
    setRuc("")
    setRazonSocial("")
    setEditando(null)
  }

  const guardar = useMutation({
    mutationFn: () =>
      editando
        ? updateCompany(editando.id, { ruc, razon_social: razonSocial })
        : createCompany({ ruc, razon_social: razonSocial }),
    onSuccess: () => {
      toast.success(editando ? "Empresa actualizada" : "Empresa creada")
      limpiar()
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] })
    },
    onError: (err) => toast.error(apiError(err, "No se pudo guardar la empresa")),
  })

  if (!esPlatformAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Sección solo para administradores de plataforma.
      </p>
    )
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  function onGuardar(e: FormEvent) {
    e.preventDefault()
    guardar.mutate()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={onGuardar} className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="ruc">RUC</Label>
              <Input id="ruc" value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="razon">Razón social</Label>
              <Input id="razon" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={guardar.isPending}>
                {editando ? "Guardar cambios" : "Crear empresa"}
              </Button>
            </div>
            {editando && (
              <div className="flex items-end">
                <Button type="button" variant="ghost" onClick={limpiar}>
                  Cancelar
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3">RUC</th>
                <th className="p-3">Razón social</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs">{c.ruc}</td>
                  <td className="p-3 font-medium">{c.razon_social}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditando(c)
                          setRuc(c.ruc)
                          setRazonSocial(c.razon_social)
                        }}
                      >
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSeleccionada(c)}>
                        Módulos
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {seleccionada && <ModulosEmpresa company={seleccionada} />}
    </div>
  )
}
