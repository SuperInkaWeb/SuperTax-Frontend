import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

import type { LucideIcon } from "lucide-react"

export interface Crumb {
  label: string
  /** Si se define, la miga es un enlace. La última miga nunca enlaza. */
  to?: string
  icon?: LucideIcon
}

/** Ruta de navegación accesible (dónde estoy). La última miga es la página actual. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Ruta de navegación"
      className={cn("flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground", className)}
    >
      {items.map((item, i) => {
        const esUltima = i === items.length - 1
        const Icon = item.icon
        const contenido = (
          <>
            {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
            {item.label}
          </>
        )
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
            {item.to && !esUltima ? (
              <Link
                to={item.to}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                {contenido}
              </Link>
            ) : (
              <span
                className={cn("flex items-center gap-1", esUltima && "font-medium text-foreground")}
                aria-current={esUltima ? "page" : undefined}
              >
                {contenido}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
