import { Badge, type Tone } from "@/shared/ui/badge"

export interface StatusMeta {
  label: string
  tone: Tone
}

/**
 * Badge de estado dirigido por un mapa `valor → {label, tono}`. Centraliza los
 * mapas estado→tono que hoy se repiten en cada módulo (completitud, revisión,
 * estado de escaneo, estado de buzón). Un valor no mapeado cae a neutro.
 */
export function StatusBadge({
  value,
  map,
}: {
  value: string
  map: Record<string, StatusMeta>
}) {
  const meta = map[value] ?? { label: value, tone: "neutral" as Tone }
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
