import { Breadcrumbs } from "@/shared/ui/breadcrumbs"
import { cn } from "@/shared/lib/utils"

import type { Crumb } from "@/shared/ui/breadcrumbs"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  /** Icono que ancla visualmente la sección (opcional). */
  icon?: LucideIcon
  breadcrumbs?: Crumb[]
  /** Acciones principales de la pantalla (p. ej. botón primario), a la derecha. */
  actions?: ReactNode
  className?: string
}

/**
 * Encabezado de página consistente: breadcrumbs + icono + título + descripción
 * + acciones. Da al usuario "dónde estoy" y "qué puedo hacer aquí" en un patrón
 * único para toda la app.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start gap-3">
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
