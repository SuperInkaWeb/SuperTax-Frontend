import { api } from "@/shared/lib/api/client"

import type { Me } from "@/shared/types"

export async function getMe(): Promise<Me> {
  const { data } = await api.get<Me>("/me")
  return data
}
