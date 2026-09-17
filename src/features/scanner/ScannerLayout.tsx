import { Files, ScanLine, Upload } from "lucide-react"

import { ModuleLayout } from "@/app/layout/ModuleLayout"

import type { TabItem } from "@/shared/ui/tabs"

const TABS: TabItem[] = [
  { to: "/scanner", label: "Subir documento", icon: Upload, end: true },
  { to: "/scanner/documentos", label: "Documentos", icon: Files },
]

export function ScannerLayout() {
  return (
    <ModuleLayout
      icon={ScanLine}
      title="Escaneo de documentos"
      description="Sube comprobantes o planillas y extrae sus campos automáticamente."
      basePath="/scanner"
      breadcrumbLabel="Escaneo"
      tabs={TABS}
    />
  )
}
