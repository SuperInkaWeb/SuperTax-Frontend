import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Boxes, Building2, Pencil, Plus, Save } from "lucide-react"
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
import { AsyncBoundary } from "@/shared/ui/async-boundary"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { DataTable } from "@/shared/ui/data-table"
import { Drawer } from "@/shared/ui/drawer"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormField } from "@/shared/ui/form-field"
import { Input } from "@/shared/ui/input"
import { Spinner } from "@/shared/ui/spinner"

import type { Company } from "@/features/admin/api"
import type { ColumnDef } from "@tanstack/react-table"

const MODULOS = [
  { key: "sire", label: "SIRE" },
  { key: "sunat", label: "Descarga SUNAT" },
  { key: "scanner", label: "Escaneo" },
  { key: "datafilter", label: "DataFilter" },
  { key: "correos", label: "Automatización de correos" },
]

function ModulosBody({ company }: { company: Company }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "company-modules", company.id],
    queryFn: () => listCompanyModules(company.id),
  })
  const activos = new Set((data ?? []).filter((m) => m.status === "activo").map((m) => m.module_key))
  const toggle = useMutation({
    mutationFn: (v: { key: string; activar: boolean }) =>
      v.activar ? enableModule(company.id, v.key) : disableModule(company.id, v.key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "company-modules", company.id] }),
    onError: (err) => toast.error(apiError(err, "No se pudo cambiar el módulo")),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="mb-3 text-sm text-muted-foreground">
        Activa o desactiva los módulos disponibles para esta empresa.
      </p>
      {MODULOS.map((m) => (
        <label key={m.key} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent">
          <input
            type="checkbox"
            checked={activos.has(m.key)}
            onChange={(e) => toggle.mutate({ key: m.key, activar: e.target.checked })}
          />
          {m.label}
        </label>
      ))}
    </div>
  )
}

function FormularioEmpresa({
  empresa,
  onGuardado,
}: {
  empresa: Company | null
  onGuardado: () => void
}) {
  const queryClient = useQueryClient()
  const [ruc, setRuc] = useState(empresa?.ruc ?? "")
  const [razonSocial, setRazonSocial] = useState(empresa?.razon_social ?? "")

  const guardar = useMutation({
    mutationFn: () =>
      empresa
        ? updateCompany(empresa.id, { ruc, razon_social: razonSocial })
        : createCompany({ ruc, razon_social: razonSocial }),
    onSuccess: () => {
      toast.success(empresa ? "Empresa actualizada" : "Empresa creada")
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] })
      onGuardado()
    },
    onError: (err) => toast.error(apiError(err, "No se pudo guardar la empresa")),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        guardar.mutate()
      }}
      className="space-y-4"
    >
      <FormField label="RUC" htmlFor="emp-ruc">
        <Input id="emp-ruc" value={ruc} onChange={(e) => setRuc(e.target.value)} maxLength={11} required />
      </FormField>
      <FormField label="Razón social" htmlFor="emp-razon">
        <Input id="emp-razon" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} required />
      </FormField>
      <Button type="submit" disabled={guardar.isPending || !ruc || !razonSocial}>
        <Save className="size-4" />
        {empresa ? "Guardar cambios" : "Crear empresa"}
      </Button>
    </form>
  )
}

export function EmpresasPage() {
  const esPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin ?? false)
  const [form, setForm] = useState<{ open: boolean; empresa: Company | null }>({ open: false, empresa: null })
  const [modulosDe, setModulosDe] = useState<Company | null>(null)

  const companies = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: listCompanies,
    enabled: esPlatformAdmin,
  })

  if (!esPlatformAdmin) {
    return (
      <EmptyState
        icon={Building2}
        title="Sección restringida"
        description="Solo los administradores de plataforma pueden gestionar empresas."
      />
    )
  }

  const columnas: ColumnDef<Company>[] = [
    { header: "RUC", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ruc}</span> },
    { header: "Razón social", cell: ({ row }) => <span className="font-medium">{row.original.razon_social}</span> },
    {
      header: "",
      id: "acciones",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label="Editar" title="Editar" onClick={() => setForm({ open: true, empresa: row.original })}>
            <Pencil className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModulosDe(row.original)}>
            <Boxes className="size-4" />
            Módulos
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Empresas</h1>
          <p className="text-sm text-muted-foreground">Alta de empresas y activación de módulos por empresa.</p>
        </div>
        <Button onClick={() => setForm({ open: true, empresa: null })}>
          <Plus className="size-4" />
          Nueva empresa
        </Button>
      </div>

      <AsyncBoundary
        query={companies}
        isEmpty={(d) => d.length === 0}
        empty={
          <EmptyState
            icon={Building2}
            title="Aún no hay empresas"
            description="Crea la primera empresa para empezar a gestionar sus módulos y su equipo."
            action={
              <Button onClick={() => setForm({ open: true, empresa: null })}>
                <Plus className="size-4" />
                Nueva empresa
              </Button>
            }
          />
        }
      >
        {(data) => (
          <Card>
            <CardContent className="p-0">
              <DataTable columns={columnas} data={data} getRowId={(c) => String(c.id)} />
            </CardContent>
          </Card>
        )}
      </AsyncBoundary>

      <Drawer
        open={form.open}
        onClose={() => setForm({ open: false, empresa: null })}
        title={form.empresa ? "Editar empresa" : "Nueva empresa"}
      >
        {form.open ? (
          <FormularioEmpresa
            key={form.empresa?.id ?? "nueva"}
            empresa={form.empresa}
            onGuardado={() => setForm({ open: false, empresa: null })}
          />
        ) : null}
      </Drawer>

      <Drawer
        open={modulosDe != null}
        onClose={() => setModulosDe(null)}
        title={modulosDe ? `Módulos · ${modulosDe.razon_social}` : ""}
      >
        {modulosDe ? <ModulosBody company={modulosDe} /> : null}
      </Drawer>
    </div>
  )
}
