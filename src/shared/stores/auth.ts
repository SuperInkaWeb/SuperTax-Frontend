import { create } from "zustand"

import type { Me } from "@/shared/types"

interface AuthState {
  user: Me | null
  setUser: (user: Me | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
