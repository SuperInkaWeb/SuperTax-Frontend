import { useQuery } from "@tanstack/react-query"

import { listJobs as listSireJobs } from "@/features/sire/api"
import { listJobs as listSunatJobs } from "@/features/sunat/api"
import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"

import type { SunatJobItem } from "@/features/sunat/api"
import type { ReconciliationJob } from "@/shared/types"

const ACTIVOS = ["en_cola", "procesando"]

function esActivo(status: string): boolean {
  return ACTIVOS.includes(status)
}

/** Sondeo adaptativo: rápido cuando hay algo en curso, lento cuando está quieto. */
function intervalo(jobs: { status: string }[] | undefined): number {
  return (jobs ?? []).some((j) => esActivo(j.status)) ? 8000 : 30000
}

export interface Activity {
  sire: { activos: number; jobs: ReconciliationJob[] }
  sunat: { activos: number; jobs: SunatJobItem[] }
}

/**
 * Actividad en curso por módulo para la empresa activa. Solo consulta los módulos
 * que la empresa tiene contratados. Alimenta los badges del sidebar y la campana
 * de notificaciones; react-query deduplica el sondeo entre ambos consumidores.
 */
export function useActivity(): Activity {
  const companyId = useActiveCompany((s) => s.companyId)
  const user = useAuthStore((s) => s.user)
  const empresa = user?.companies.find((c) => c.id === companyId)
  const tieneSire = empresa?.modules.includes("sire") ?? false
  const tieneSunat = empresa?.modules.includes("sunat") ?? false

  const sireQ = useQuery({
    queryKey: ["activity", "sire", companyId],
    queryFn: listSireJobs,
    enabled: tieneSire && companyId != null,
    refetchInterval: (q) => intervalo(q.state.data),
  })
  const sunatQ = useQuery({
    queryKey: ["activity", "sunat", companyId],
    queryFn: listSunatJobs,
    enabled: tieneSunat && companyId != null,
    refetchInterval: (q) => intervalo(q.state.data),
  })

  const sireJobs = sireQ.data ?? []
  const sunatJobs = sunatQ.data ?? []
  return {
    sire: { activos: sireJobs.filter((j) => esActivo(j.status)).length, jobs: sireJobs },
    sunat: { activos: sunatJobs.filter((j) => esActivo(j.status)).length, jobs: sunatJobs },
  }
}
