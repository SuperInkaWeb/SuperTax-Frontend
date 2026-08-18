import { Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useActiveCompany } from "@/shared/stores/activeCompany"
import { useAuthStore } from "@/shared/stores/auth"

const MAX_RESULTADOS = 8

/**
 * Búsqueda global (Ctrl/Cmd+K): filtra las empresas del usuario por razón social
 * o RUC y salta a ellas (cambia la empresa activa). Es el atajo más útil para un
 * contador que opera muchos clientes.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const user = useAuthStore((s) => s.user)
  const setCompanyId = useActiveCompany((s) => s.setCompanyId)
  const navigate = useNavigate()
  const companies = user?.companies ?? []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const base = t
      ? companies.filter(
          (c) => c.razon_social.toLowerCase().includes(t) || c.ruc.includes(t),
        )
      : companies
    return base.slice(0, MAX_RESULTADOS)
  }, [q, companies])

  function elegir(id: number) {
    setCompanyId(id)
    setOpen(false)
    setQ("")
    navigate("/dashboard")
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar empresa"
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="hidden lg:inline">Buscar empresa…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 text-[10px] lg:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="h-fit w-full max-w-lg overflow-hidden rounded-lg border bg-popover shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca por razón social o RUC…"
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {filtradas.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin coincidencias.
                </p>
              ) : (
                filtradas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => elegir(c.id)}
                    className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-muted"
                  >
                    <span className="text-sm font-medium">{c.razon_social}</span>
                    <span className="text-xs text-muted-foreground">RUC {c.ruc}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
