import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  TableProperties,
} from "lucide-react"

import { Button } from "@/shared/ui/button"

import type { MapeoEntrada } from "@/features/sunat/api"

const CAMPOS = [
  { key: "col_ruc", label: "RUC emisor" },
  { key: "col_tipo", label: "Tipo comprobante" },
  { key: "col_serie", label: "Serie" },
  { key: "col_numero", label: "Número" },
] as const

type CampoKey = (typeof CAMPOS)[number]["key"]

interface Props {
  mapeo: MapeoEntrada
  headers: string[]
  muestra: string[][]
  confianza: number
  necesitaRevision: boolean
  revalidando: boolean
  onChange: (mapeo: MapeoEntrada) => void
  onRevalidar: () => void
}

export function MapeoColumnas({
  mapeo, headers, muestra, confianza, necesitaRevision, revalidando, onChange, onRevalidar,
}: Props) {
  const [expandido, setExpandido] = useState(necesitaRevision)
  const [tocado, setTocado] = useState(false)

  const nCols = Math.max(headers.length, ...muestra.map((r) => r.length), 0)
  const columnas = Array.from({ length: nCols }, (_, i) => i)

  const tone = necesitaRevision
    ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"

  function setColumna(campo: CampoKey, valor: string) {
    onChange({ ...mapeo, [campo]: valor === "" ? null : Number(valor) })
    setTocado(true)
  }

  const pct = Math.round(confianza * 100)

  return (
    <div className={`space-y-3 rounded-lg border-2 p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TableProperties className="size-4 shrink-0" />
          <span className="truncate">
            {necesitaRevision
              ? "Revisa y asigna las columnas del archivo"
              : "Columnas detectadas automáticamente"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium underline underline-offset-2"
        >
          {expandido ? (
            <>
              Ocultar <ChevronUp className="size-3" />
            </>
          ) : (
            <>
              Revisar columnas <ChevronDown className="size-3" />
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
            pct >= 60 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {pct >= 60 ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
          Confianza del mapeo: {pct}%
        </span>
      </div>

      {expandido && (
        <div className="space-y-2 pt-1">
          <div className="space-y-1.5">
            {CAMPOS.map((c) => {
              const asignada = mapeo[c.key]
              const sinAsignar = asignada === null
              return (
                <div key={c.key} className="grid grid-cols-[160px_1fr] items-center gap-2">
                  <span className={`text-xs ${sinAsignar ? "font-bold" : ""}`}>
                    {c.label}
                    <span className="text-red-600"> *</span>
                  </span>
                  <select
                    value={asignada ?? ""}
                    onChange={(e) => setColumna(c.key, e.target.value)}
                    className={`h-8 w-full rounded-md border bg-card px-2 text-xs text-foreground ${
                      sinAsignar ? "border-red-400" : "border-border"
                    }`}
                  >
                    <option value="">— sin asignar —</option>
                    {columnas.map((i) => (
                      <option key={i} value={i}>
                        Col {i + 1}
                        {headers[i] ? ` · ${headers[i]}` : ""}
                        {muestra[0]?.[i] ? ` — ej: ${String(muestra[0][i]).slice(0, 25)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>

          {tocado && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setTocado(false)
                onRevalidar()
              }}
              disabled={revalidando}
            >
              {revalidando ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Analizando…
                </>
              ) : (
                "Volver a analizar con este mapeo"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
