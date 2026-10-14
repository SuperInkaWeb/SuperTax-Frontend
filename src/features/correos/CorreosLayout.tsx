import { useQuery } from "@tanstack/react-query"
import { ClipboardCheck, Inbox, Mail, Table } from "lucide-react"

import { ModuleLayout } from "@/app/layout/ModuleLayout"
import { reviewCount } from "@/features/correos/api"
import { useActiveCompany } from "@/shared/stores/activeCompany"

import type { TabItem } from "@/shared/ui/tabs"

export function CorreosLayout() {
  const companyId = useActiveCompany((s) => s.companyId)
  // El contador de pendientes alimenta el badge de la pestaña Revisión, como en
  // el flujo original: primero se vincula, se escanea, se revisa lo dudoso y al
  // final se consultan y exportan los registros.
  const pendientes = useQuery({
    queryKey: ["correos", "review-count"],
    queryFn: reviewCount,
    enabled: companyId != null,
    refetchInterval: 60_000,
    retry: false,
  })

  const tabs: TabItem[] = [
    { to: "/correos", label: "Buzones", icon: Inbox, end: true },
    { to: "/correos/escaneos", label: "Escaneos", icon: Mail },
    { to: "/correos/revision", label: "Revisión", icon: ClipboardCheck, badge: pendientes.data },
    { to: "/correos/registros", label: "Registros", icon: Table },
  ]

  return (
    <ModuleLayout
      icon={Mail}
      title="Automatización de correos"
      description="Extrae datos tributarios SUNAT de los adjuntos del buzón (Gmail/Outlook)."
      basePath="/correos"
      breadcrumbLabel="Correos"
      tabs={tabs}
    />
  )
}
