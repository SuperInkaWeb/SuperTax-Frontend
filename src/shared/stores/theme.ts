import { create } from "zustand"

type Theme = "light" | "dark"

const KEY = "plataforma.theme"

function inicial(): Theme {
  const guardado = localStorage.getItem(KEY)
  if (guardado === "dark" || guardado === "light") return guardado
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function aplicar(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark")
  localStorage.setItem(KEY, theme)
}

// Aplica el tema guardado al cargar la app (evita parpadeo).
aplicar(inicial())

interface ThemeState {
  theme: Theme
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: inicial(),
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark"
    aplicar(next)
    set({ theme: next })
  },
}))
