import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"

/** Selector de empresa activa (Modelo B): un usuario opera varias empresas. */
export function CompanySwitcher() {
  const companies = useAuthStore((s) => s.user?.companies ?? [])
  const companyId = useActiveCompany((s) => s.companyId)
  const setCompanyId = useActiveCompany((s) => s.setCompanyId)

  if (companies.length === 0) return null

  return (
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
  )
}
