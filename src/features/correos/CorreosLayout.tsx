import { ClipboardCheck, Inbox, Mail, ScrollText } from "lucide-react"

import { ModuleLayout } from "@/app/layout/ModuleLayout"

import type { TabItem } from "@/shared/ui/tabs"

const TABS: TabItem[] = [
  { to: "/correos", label: "Buzones", icon: Inbox, end: true },
  { to: "/correos/escaneos", label: "Escaneos", icon: Mail },
  { to: "/correos/revision", label: "Revisión", icon: ClipboardCheck },
  { to: "/correos/auditoria", label: "Auditoría", icon: ScrollText },
]

export function CorreosLayout() {
  return (
    <ModuleLayout
      icon={Mail}
      title="Automatización de correos"
      description="Extrae datos tributarios SUNAT de los adjuntos del buzón (Gmail/Outlook)."
      basePath="/correos"
      breadcrumbLabel="Correos"
      tabs={TABS}
    />
  )
}
