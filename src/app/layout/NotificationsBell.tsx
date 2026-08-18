import { Bell, CheckCircle2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useActivity } from "@/app/layout/useActivity"

interface Notif {
  id: string
  href: string
  tipo: "ok" | "error"
  titulo: string
  detalle: string
  ts: number
}

interface JobLite {
  key: string
  status: string
  titulo: string
  href: string
  detalle: string
}

const STORE_KEY = "plataforma.notifs"

function cargar(): Notif[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function guardar(n: Notif[]): void {
  sessionStorage.setItem(STORE_KEY, JSON.stringify(n))
}

export function NotificationsBell() {
  const navigate = useNavigate()
  const { sire, sunat } = useActivity()
  const [notifs, setNotifs] = useState<Notif[]>(cargar)
  const [noLeidas, setNoLeidas] = useState(0)
  const [open, setOpen] = useState(false)
  const prev = useRef<Map<string, string>>(new Map())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  useEffect(() => {
    const lite: JobLite[] = [
      ...sire.jobs.map((j) => ({
        key: `sire-${j.id}`,
        status: j.status,
        titulo: `Conciliación #${j.id}`,
        href: `/sire/jobs/${j.id}`,
        detalle: `${j.periodo.slice(0, 4)}/${j.periodo.slice(4)} · ${
          j.tipo_libro === "ventas" ? "Ventas" : "Compras"
        }`,
      })),
      ...sunat.jobs.map((j) => ({
        key: `sunat-${j.job_id}`,
        status: j.status,
        titulo: "Descarga SUNAT",
        href: "/sunat/historial",
        detalle: new Date(j.created_at).toLocaleString("es-PE"),
      })),
    ]

    const nuevas: Notif[] = []
    for (const j of lite) {
      const antes = prev.current.get(j.key)
      const eraActivo = antes === "en_cola" || antes === "procesando"
      if (eraActivo && j.status === "completado") {
        nuevas.push({
          id: `${j.key}-ok-${Date.now()}`,
          href: j.href,
          tipo: "ok",
          titulo: `${j.titulo} completada`,
          detalle: `${j.detalle} — lista para revisar`,
          ts: Date.now(),
        })
        toast.success(`${j.titulo} completada`)
      } else if (eraActivo && j.status === "error") {
        nuevas.push({
          id: `${j.key}-err-${Date.now()}`,
          href: j.href,
          tipo: "error",
          titulo: `${j.titulo} falló`,
          detalle: `${j.detalle} — revisa el detalle`,
          ts: Date.now(),
        })
        toast.error(`${j.titulo} falló`)
      }
      prev.current.set(j.key, j.status)
    }

    if (nuevas.length > 0) {
      setNotifs((actuales) => {
        const todas = [...nuevas, ...actuales].slice(0, 20)
        guardar(todas)
        return todas
      })
      setNoLeidas((n) => n + nuevas.length)
    }
  }, [sire.jobs, sunat.jobs])

  function alternar() {
    setOpen((v) => !v)
    setNoLeidas(0)
  }

  function abrir(n: Notif) {
    setOpen(false)
    navigate(n.href)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-label="Notificaciones"
        className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
      >
        <Bell className="size-4" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border bg-popover shadow-lg">
          <div className="border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Notificaciones</p>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {notifs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Sin notificaciones. Te avisaremos aquí cuando un proceso termine.
              </p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => abrir(n)}
                  className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-muted/60"
                >
                  {n.tipo === "ok" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.detalle}</span>
                  </span>
                  <span className="mt-0.5 shrink-0 text-[10px] text-muted-foreground">
                    {new Date(n.ts).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
