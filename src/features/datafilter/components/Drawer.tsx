import { X } from "lucide-react"

import { cn } from "@/shared/lib/utils"

import type { ReactNode } from "react"

interface DrawerProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

/**
 * Panel lateral sobre la tabla (la tabla sigue al centro, siempre visible).
 * Permanece MONTADO aunque esté cerrado (se desliza fuera de vista): así cada
 * herramienta conserva su configuración al cerrar y reabrir el panel.
 */
export function Drawer({ open, title, description, onClose, children }: DrawerProps) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex w-[520px] max-w-[94vw] flex-col rounded-l-xl border-l bg-background shadow-2xl transition-transform duration-200",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          tabIndex={open ? 0 : -1}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  )
}
