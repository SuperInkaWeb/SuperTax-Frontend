import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const companyId = useActiveCompany((s) => s.companyId)
  const empresa = user?.companies.find((c) => c.id === companyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Hola, {user?.nombre ?? "usuario"}</h1>
        <p className="text-sm text-muted-foreground">
          {empresa ? `${empresa.razon_social} · RUC ${empresa.ruc}` : "Sin empresa activa"}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {user?.companies.length ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Módulos activos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">SIRE</CardContent>
        </Card>
      </div>
    </div>
  )
}
