import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  TableProperties,
  XCircle,
} from "lucide-react"

import { Button } from "@/shared/ui/button"

import type { AnalisisArchivo, MapeoConfig, ValidacionMapeo } from "@/features/sire/api"

const NIVEL_INFO: Record<string, { titulo: string; tone: "ok" | "info" | "warn" | "bad" }> = {
  ple: { titulo: "Formato estándar SUNAT — posiciones según norma", tone: "ok" },
  plataforma: { titulo: "Formato de plataforma reconocido", tone: "ok" },
  guardado: { titulo: "Mapeo guardado de tu empresa", tone: "info" },
  sugerido: { titulo: "Sugerencia automática — confirma cada campo", tone: "warn" },
  desconocido: { titulo: "Formato no reconocido — asigna las columnas", tone: "bad" },
}

const TONE_STYLES: Record<string, string> = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  bad: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
}

interface Props {
  analisis: AnalisisArchivo
  config: MapeoConfig
  validacion: ValidacionMapeo | null
  validando: boolean
  onChange: (cfg: MapeoConfig) => void
  onRevalidar: () => void
  onReanalizar: (skipRows: number) => void
}

export function MapeoArchivo({
  analisis, config, validacion, validando, onChange, onRevalidar, onReanalizar,
}: Props) {
  const base = NIVEL_INFO[analisis.nivel] ?? NIVEL_INFO.desconocido
  const info =
    analisis.nivel === "ple" && analisis.formato
      ? { ...base, titulo: `Formato estándar SUNAT (${analisis.formato}) — posiciones según norma` }
      : base
  const confiable =
    (analisis.nivel === "ple" || analisis.nivel === "plataforma" || analisis.nivel === "guardado") &&
    validacion?.ok === true
  const [expandido, setExpandido] = useState(!confiable)
  const [tocado, setTocado] = useState(false)

  function setColumna(campo: string, valor: string) {
    const columnas = { ...config.columnas }
    if (valor === "") delete columnas[campo]
    else columnas[campo] = Number(valor)
    onChange({ ...config, columnas })
    setTocado(true)
  }

  function setCombinado(v: boolean) {
    onChange({ ...config, serie_numero_combinado: v })
    setTocado(true)
  }

  const campos = analisis.campos.filter(
    (c) => !(config.serie_numero_combinado && c.campo === "serie"),
  )

  const pct = validacion?.aritmetica_pct

  return (
    <div className={`space-y-3 rounded-lg border-2 p-4 ${TONE_STYLES[info.tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <TableProperties className="size-4 shrink-0" />
          <span className="truncate">Lectura del archivo: {info.titulo}</span>
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

      {validacion && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {pct !== null && pct !== undefined && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                pct >= 90
                  ? "bg-emerald-100 text-emerald-800"
                  : pct >= 50
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {pct >= 90 ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
              Montos cuadran en {pct}% de la muestra
            </span>
          )}
          {validacion.faltantes.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
              <XCircle className="size-3" />
              Faltan campos obligatorios: {validacion.faltantes.length}
            </span>
          )}
        </div>
      )}

      {validacion?.avisos.map((a) => (
        <p key={a} className="text-xs">
          ⚠ {a}
        </p>
      ))}

      {expandido && analisis.solo_lectura && (
        <div className="space-y-1 pt-1">
          {campos.map((c) => {
            const idx = config.columnas[c.campo]
            const col = idx !== undefined ? analisis.columnas_archivo[idx] : undefined
            return (
              <div key={c.campo} className="grid grid-cols-[180px_1fr] items-center gap-2 text-xs">
                <span>
                  {c.etiqueta}
                  {c.obligatorio && <span className="text-red-600"> *</span>}
                </span>
                <span className="font-mono">
                  {idx !== undefined ? `Col ${idx + 1}` : "—"}
                  {col?.muestras[0] ? `  ·  ej: ${col.muestras[0].slice(0, 30)}` : ""}
                </span>
              </div>
            )
          })}
          <p className="pt-1 text-[11px]">
            Las posiciones de este formato están fijadas por norma SUNAT — no requieren ajuste.
          </p>
        </div>
      )}

      {expandido && !analisis.solo_lectura && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label htmlFor="fila-inicial">Los datos empiezan en la fila</label>
            <input
              id="fila-inicial"
              key={config.skip_rows}
              type="number"
              min={1}
              defaultValue={(config.skip_rows ?? 0) + 1}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
              }}
              onBlur={(e) => {
                const n = Math.max(0, Number(e.target.value) - 1)
                if (n !== (config.skip_rows ?? 0)) onReanalizar(n)
              }}
              className="h-7 w-20 rounded-md border border-border bg-card px-2 text-foreground"
            />
            <span className="opacity-70">
              {config.has_header
                ? "(esa fila es el encabezado)"
                : "(corrige si el detector se equivocó)"}
            </span>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.serie_numero_combinado}
              onChange={(e) => setCombinado(e.target.checked)}
            />
            Serie y número vienen juntos en una sola columna (ej. B052-01672972)
          </label>

          <div className="space-y-1.5">
            {campos.map((c) => {
              const etiqueta =
                config.serie_numero_combinado && c.campo === "numero"
                  ? "Serie y Número (combinados)"
                  : c.etiqueta
              const asignada = config.columnas[c.campo]
              const sinAsignar = asignada === undefined && c.obligatorio
              return (
                <div key={c.campo} className="grid grid-cols-[180px_1fr] items-center gap-2">
                  <span className={`text-xs ${sinAsignar ? "font-bold" : ""}`}>
                    {etiqueta}
                    {c.obligatorio && <span className="text-red-600"> *</span>}
                  </span>
                  <select
                    value={asignada ?? ""}
                    onChange={(e) => setColumna(c.campo, e.target.value)}
                    className={`h-8 w-full rounded-md border bg-card px-2 text-xs text-foreground ${
                      sinAsignar ? "border-red-400" : "border-border"
                    }`}
                  >
                    <option value="">— sin asignar —</option>
                    {analisis.columnas_archivo.map((col) => (
                      <option key={col.idx} value={col.idx}>
                        Col {col.idx + 1}
                        {col.header ? ` · ${col.header}` : ""}
                        {col.muestras[0] ? ` — ej: ${col.muestras[0].slice(0, 25)}` : ""}
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
              disabled={validando}
            >
              {validando ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Validando…
                </>
              ) : (
                "Validar mapeo ajustado"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
