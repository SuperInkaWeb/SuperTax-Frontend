import { Cloud, Download, History, KeyRound } from "lucide-react"

import { ModuleLayout } from "@/app/layout/ModuleLayout"

import type { TabItem } from "@/shared/ui/tabs"

const TABS: TabItem[] = [
  { to: "/sunat", label: "Descargar", icon: Download, end: true },
  { to: "/sunat/credenciales", label: "Credenciales", icon: KeyRound },
  { to: "/sunat/drive", label: "Google Drive", icon: Cloud },
  { to: "/sunat/historial", label: "Historial", icon: History },
]

export function SunatLayout() {
  return (
    <ModuleLayout
      icon={Download}
      title="Descarga SUNAT"
      description="Descarga automatizada de comprobantes (PDF y XML) desde el portal SOL."
      basePath="/sunat"
      breadcrumbLabel="SUNAT"
      tabs={TABS}
    />
  )
}
