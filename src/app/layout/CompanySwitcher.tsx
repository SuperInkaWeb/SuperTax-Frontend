import { Plus } from "lucide-react"
import { useState } from "react"

import { AgregarEmpresaDialog } from "@/features/company/AgregarEmpresaDialog"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { Button } from "@/shared/ui/button"

/** Selector de empresa activa (Modelo B): un usuario opera varias empresas. */
export function CompanySwitcher() {
  const companies = useAuthStore((s) => s.user?.companies ?? [])
  const companyId = useActiveCompany((s) => s.companyId)
  const setCompanyId = useActiveCompany((s) => s.setCompanyId)
  const [agregando, setAgregando] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {companies.length > 0 ? (
        <select
          className="max-w-[18rem] truncate rounded-md border bg-background px-3 py-1.5 text-sm"
          value={companyId ?? ""}
          onChange={(e) => setCompanyId(Number(e.target.value))}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razon_social} — {c.ruc}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-sm text-muted-foreground">Sin empresas aún</span>
      )}

      <Button size="sm" variant="outline" onClick={() => setAgregando(true)}>
        <Plus className="size-4" />
        Empresa
      </Button>

      {agregando && <AgregarEmpresaDialog onClose={() => setAgregando(false)} />}
    </div>
  )
}
