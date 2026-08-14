import { useEffect, useRef } from "react"

interface Props {
  lineas: string[]
  progreso: string | null
}

/** Log de ejecución con barra de progreso y auto-scroll al final. */
export function LogViewer({ lineas, progreso }: Props) {
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [lineas])

  const num = progreso != null && progreso.trim() !== "" ? Number(progreso) : NaN
  const pct = Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Registro de ejecución</span>
        {pct !== null ? (
          <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
        ) : progreso ? (
          <span className="text-xs text-muted-foreground">{progreso}</span>
        ) : null}
      </div>
      {pct !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <pre ref={ref} className="h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
        {lineas.length ? lineas.join("\n") : "Los logs aparecerán aquí al iniciar una descarga."}
      </pre>
    </div>
  )
}
