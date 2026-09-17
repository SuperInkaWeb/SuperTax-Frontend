import { cn } from "@/shared/lib/utils"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** Acción sugerida (p. ej. un botón). Un estado vacío útil invita a actuar. */
  action?: ReactNode
  className?: string
}

/**
 * Estado vacío consistente: icono + título + descripción + acción. Explica qué
 * es este espacio y qué puede hacer el usuario, en vez de un texto suelto.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
