import { FileText, KeyRound, ListChecks, Plus } from "lucide-react"

import { ModuleLayout } from "@/app/layout/ModuleLayout"

import type { TabItem } from "@/shared/ui/tabs"

const TABS: TabItem[] = [
  { to: "/sire", label: "Conciliaciones", icon: ListChecks, end: true },
  { to: "/sire/nueva", label: "Nueva", icon: Plus },
  { to: "/sire/credenciales", label: "Credenciales", icon: KeyRound },
  { to: "/sire/formato", label: "Formato de archivo", icon: FileText },
]

export function SireLayout() {
  return (
    <ModuleLayout
      icon={ListChecks}
      title="SIRE"
      description="Conciliación de compras y ventas contra SUNAT."
      basePath="/sire"
      breadcrumbLabel="SIRE"
      tabs={TABS}
    />
  )
}
