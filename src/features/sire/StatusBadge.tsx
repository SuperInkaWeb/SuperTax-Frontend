import { Badge } from "@/shared/ui/badge"

import type { JobStatus } from "@/shared/types"

type Tone = "neutral" | "info" | "success" | "danger"

const MAP: Record<JobStatus, { tone: Tone; label: string }> = {
  en_cola: { tone: "neutral", label: "En cola" },
  procesando: { tone: "info", label: "Procesando" },
  completado: { tone: "success", label: "Completado" },
  error: { tone: "danger", label: "Error" },
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const { tone, label } = MAP[status]
  return <Badge tone={tone}>{label}</Badge>
}
