import { BarChart3, BarChartHorizontal, Calculator, Copy, Filter, Replace, Table2 } from "lucide-react"

import { cn } from "@/shared/lib/utils"

import type { LucideIcon } from "lucide-react"

export type WorkspaceMode =
  | "filter"
  | "pivot"
  | "compute"
  | "replace"
  | "dedupe"
  | "stats"
  | "chart"

const COMMANDS: Array<{ mode: WorkspaceMode; label: string; icon: LucideIcon }> = [
  { mode: "filter", label: "Filtrar", icon: Filter },
  { mode: "pivot", label: "Tabla dinámica", icon: Table2 },
  { mode: "compute", label: "Columnas calculadas", icon: Calculator },
  { mode: "replace", label: "Buscar y reemplazar", icon: Replace },
  { mode: "dedupe", label: "Quitar duplicados", icon: Copy },
  { mode: "stats", label: "Estadísticas", icon: BarChart3 },
  { mode: "chart", label: "Gráfico", icon: BarChartHorizontal },
]

interface RibbonProps {
  mode: WorkspaceMode | null // null = ninguna herramienta abierta
  onChange: (mode: WorkspaceMode) => void
}

/** Barra de herramientas: cada botón abre/cierra su panel lateral sobre la tabla. */
export function Ribbon({ mode, onChange }: RibbonProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-1 rounded-lg border bg-muted/50 p-1">
      {COMMANDS.map(({ mode: m, label, icon: Icon }) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary/30 bg-background font-medium text-primary shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-background/70",
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
