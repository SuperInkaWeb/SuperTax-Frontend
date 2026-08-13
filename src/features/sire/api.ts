import { useQuery } from "@tanstack/react-query"

import { api } from "@/shared/lib/api/client"
import { useActiveCompany } from "@/shared/stores/activeCompany"

import type { ReconciliationJob } from "@/shared/types"

async function listJobs(): Promise<ReconciliationJob[]> {
  const { data } = await api.get<ReconciliationJob[]>("/api/sire/jobs")
  return data
}

export function useSireJobs() {
  const companyId = useActiveCompany((s) => s.companyId)
  return useQuery({
    queryKey: ["sire", "jobs", companyId],
    queryFn: listJobs,
    enabled: companyId != null,
  })
}
