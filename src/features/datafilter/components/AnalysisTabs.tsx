import { cn } from "@/shared/lib/utils"

import type { LucideIcon } from "lucide-react"

export interface ToolTab {
  id: string
  label: string
  icon: LucideIcon
}

interface AnalysisTabsProps {
  tabs: ToolTab[]
  active: string
  onChange: (id: string) => void
}

/** Selector horizontal de herramientas del workspace (datos / análisis). */
export function AnalysisTabs({ tabs, active, onChange }: AnalysisTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
            active === id
              ? "border-primary font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
