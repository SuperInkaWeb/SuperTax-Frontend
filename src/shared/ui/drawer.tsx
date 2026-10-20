import { X } from "lucide-react"
import { useEffect } from "react"

import { cn } from "@/shared/lib/utils"

import type { ReactNode } from "react"

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Panel lateral derecho para detalle/edición. Mantiene el contexto de la pantalla
 * detrás (a diferencia de un modal que la tapa). Controlado por `open`/`onClose`;
 * cierra con la X, con Escape o al hacer clic fuera.
 */
export function Drawer({ open, onClose, title, children, footer, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "flex h-full w-full max-w-md flex-col overflow-hidden bg-card shadow-lg",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0 truncate text-base font-semibold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {footer ? <footer className="border-t px-5 py-4">{footer}</footer> : null}
      </aside>
    </div>
  )
}
