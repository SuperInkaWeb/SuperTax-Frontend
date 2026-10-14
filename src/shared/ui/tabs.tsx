import { NavLink } from "react-router-dom"

import { cn } from "@/shared/lib/utils"

import type { LucideIcon } from "lucide-react"

export interface TabItem {
  to: string
  label: string
  icon?: LucideIcon
  /** true = coincidencia exacta de ruta (para la pestaña índice del módulo). */
  end?: boolean
  /** Contador opcional (p. ej. pendientes de revisión); se oculta si es 0. */
  badge?: number
}

/**
 * Navegación por pestañas para las secciones de un módulo. NavLink marca la
 * pestaña activa (y expone `aria-current="page"`). Scroll horizontal en móvil.
 */
export function NavTabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav aria-label="Secciones" className={cn("flex gap-1 overflow-x-auto border-b", className)}>
      {items.map(({ to, label, icon: Icon, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          {Icon ? <Icon className="size-4" /> : null}
          {label}
          {badge ? (
            <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">
              {badge}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
