import type { LucideIcon } from "lucide-react"

/**
 * Tile de métrica (KPI): número grande en monoespaciada tabular + etiqueta. Sin
 * borde por defecto para colocarse en filas dentro de una Card. El número es el
 * protagonista; la etiqueta lo explica.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: number | string
  icon?: LucideIcon
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {Icon ? <Icon className="mb-1 size-4 text-muted-foreground" /> : null}
      <p className="font-mono text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground/70">{hint}</p> : null}
    </div>
  )
}
